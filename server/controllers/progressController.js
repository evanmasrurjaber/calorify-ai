const Progress = require('../models/Progress');
const MealLog = require('../models/MealLog');

// @route POST /api/progress
const logProgress = async (req, res) => {
  try {
    const { weight, adherence } = req.body;

    // Get start and end of today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Get yesterday's boundaries for streak calculation
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    const endOfYesterday = new Date(endOfToday);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);

    // Find yesterday's entry to calculate the streak
    const yesterdayEntry = await Progress.findOne({
      user: req.user.id,
      date: { $gte: startOfYesterday, $lte: endOfYesterday }
    });

    let newStreak = 0;
    if (adherence) {
      newStreak = (yesterdayEntry ? yesterdayEntry.streak : 0) + 1;
    } else {
      newStreak = 0;
    }

    // Upsert today's entry
    let todayEntry = await Progress.findOne({
      user: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday }
    });

    // Calculate calories consumed today from MealLogs
    const mealLogsToday = await MealLog.find({
      user: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday }
    });
    const caloriesConsumed = mealLogsToday.reduce((acc, log) => acc + (log.calories || 0), 0);

    if (todayEntry) {
      if (weight !== undefined) todayEntry.weight = weight;
      if (adherence !== undefined) todayEntry.adherence = adherence;
      todayEntry.streak = newStreak;
      todayEntry.caloriesConsumed = caloriesConsumed;
      await todayEntry.save();
    } else {
      todayEntry = await Progress.create({
        user: req.user.id,
        date: new Date(), // store exact time
        weight,
        adherence,
        streak: newStreak,
        caloriesConsumed
      });
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
    res.json(entries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { logProgress, getProgress };
