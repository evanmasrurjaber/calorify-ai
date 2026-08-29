const Progress = require('../models/Progress');
const MealLog = require('../models/MealLog');
const Challenge = require('../models/Challenge');
const User = require('../models/User');

// Helper to format local YYYY-MM-DD
const formatDateStr = (d) => {
  if (!d) return '';
  const dateObj = new Date(d);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calculate streak across consecutive days based on meal logs and completed challenges
const calculateUserStreak = async (userId) => {
  try {
    const mealLogs = await MealLog.find({ user: userId }).select('date createdAt');
    const challenges = await Challenge.find({ user: userId, completed: true }).select('date completedAt createdAt');
    const progressEntries = await Progress.find({ user: userId }).select('date adherence');

    const activeDateSet = new Set();

    mealLogs.forEach((m) => {
      activeDateSet.add(formatDateStr(m.date || m.createdAt));
    });
    challenges.forEach((c) => {
      activeDateSet.add(formatDateStr(c.completedAt || c.date || c.createdAt));
    });
    progressEntries.forEach((p) => {
      if (p.adherence) activeDateSet.add(formatDateStr(p.date));
    });

    if (activeDateSet.size === 0) return 0;

    const todayStr = formatDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateStr(yesterday);

    // If user is neither active today nor yesterday, the streak is broken
    if (!activeDateSet.has(todayStr) && !activeDateSet.has(yesterdayStr)) {
      return 0;
    }

    let streak = 0;
    let checkDate = new Date();

    // If not active today, start checking from yesterday
    if (!activeDateSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (activeDateSet.has(formatDateStr(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return Math.max(streak, 1);
  } catch (err) {
    console.error('Error calculating user streak:', err);
    return 0;
  }
};

// @route POST /api/progress
const logProgress = async (req, res) => {
  try {
    const { weight, adherence } = req.body;

    // Get start and end of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const calculatedStreak = await calculateUserStreak(req.user.id);

    // Upsert today's entry
    let todayEntry = await Progress.findOne({
      user: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday },
    });

    // Calculate calories consumed today from MealLogs
    const mealLogsToday = await MealLog.find({
      user: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday },
    });
    const caloriesConsumed = mealLogsToday.reduce((acc, log) => acc + (log.calories || 0), 0);

    if (todayEntry) {
      if (weight !== undefined) todayEntry.weight = weight;
      if (adherence !== undefined) todayEntry.adherence = adherence;
      todayEntry.streak = calculatedStreak;
      todayEntry.caloriesConsumed = caloriesConsumed;
      await todayEntry.save();
    } else {
      todayEntry = await Progress.create({
        user: req.user.id,
        date: new Date(),
        weight,
        adherence: adherence !== undefined ? adherence : true,
        streak: calculatedStreak,
        caloriesConsumed,
      });
    }

    if (weight !== undefined && Number(weight) > 0) {
      await User.findByIdAndUpdate(req.user.id, { weight: Number(weight) });
    }

    res.status(200).json(todayEntry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/progress
const getProgress = async (req, res) => {
  try {
    const entries = await Progress.find({ user: req.user.id }).sort({ date: 1 });
    const currentStreak = await calculateUserStreak(req.user.id);

    if (entries.length === 0) {
      return res.json([{ streak: currentStreak, date: new Date() }]);
    }

    // Update the last entry with dynamic streak for response
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      lastEntry.streak = currentStreak;
    }

    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { logProgress, getProgress, calculateUserStreak };
