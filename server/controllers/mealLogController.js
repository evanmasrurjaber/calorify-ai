// Meal Log Controller — Member responsibility: Jarin Tasnim Dia
// Uses Gemini Vision API (via calorieApiService) for calorie + macro estimation

const MealLog = require('../models/MealLog');
const { estimateCaloriesFromImage, estimateCaloriesFromText } = require('../services/calorieApiService');
const WeeklySummary = require('../models/WeeklySummary');

// Helper to aggregate Monday-Sunday weekly summaries and save them
const updateWeeklySummary = async (userId, date) => {
  try {
    const anchor = new Date(date);
    const dayOfWeek = anchor.getUTCDay(); // 0=Sun, 1=Mon...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(anchor);
    start.setUTCDate(anchor.getUTCDate() + diffToMon);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);

    const logs = await MealLog.find({
      user: userId,
      date: { $gte: start, $lt: end },
    });

    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        carbs:    acc.carbs    + (log.carbs    || 0),
        protein:  acc.protein  + (log.protein  || 0),
        fat:      acc.fat      + (log.fat      || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    const distinctDays = new Set(
      logs.map((log) => new Date(log.date || log.createdAt).toISOString().split('T')[0])
    );
    const daysLogged = distinctDays.size;
    const dailyAverageCalories = daysLogged > 0 ? Math.round(totals.calories / daysLogged) : 0;

    const weekEndDate = new Date(start);
    weekEndDate.setUTCDate(start.getUTCDate() + 6);
    weekEndDate.setUTCHours(23, 59, 59, 999);

    await WeeklySummary.findOneAndUpdate(
      { user: userId, weekStartDate: start },
      {
        weekEndDate,
        totalCalories: totals.calories,
        dailyAverageCalories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        daysLogged,
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('[updateWeeklySummary]', error.message);
  }
};

// ─── POST /api/meal-logs/image ────────────────────────────────────────────────
// Upload a meal photo → Gemini Vision analyses it → saves MealLog document
const logMealByImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file uploaded.' });
    }

    // Rate limiting for free users
    if (!req.user.isPro) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const scansToday = await MealLog.countDocuments({
        user: req.user.id,
        loggedVia: 'image',
        createdAt: { $gte: today }
      });

      if (scansToday >= 3) {
        return res.status(403).json({ 
          message: 'Free tier limit reached. Upgrade to Pro for unlimited AI food scans!',
          limitReached: true
        });
      }
    }

    const mealType = req.body.mealType || 'snacks';
    const logDate = req.body.date ? new Date(req.body.date) : new Date();

    // Send image buffer to Gemini Vision via calorieApiService
    const nutrition = await estimateCaloriesFromImage(req.file.buffer, req.file.mimetype);

    const log = await MealLog.create({
      user:       req.user.id,
      mealType,
      date:       logDate,
      foodName:   nutrition.foodName,
      calories:   nutrition.calories,
      carbs:      nutrition.carbs,
      protein:    nutrition.protein,
      fat:        nutrition.fat,
      loggedVia:  'image',
      confidence: nutrition.confidence,
      breakdown:  nutrition.breakdown,
    });

    // Update weekly summary in the background
    updateWeeklySummary(req.user.id, log.date || log.createdAt);

    res.status(201).json({ success: true, log });
  } catch (error) {
    console.error('[logMealByImage]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/meal-logs ──────────────────────────────────────────────────────
// Log a meal by typing a food name → Gemini estimates calories/macros → saves
const logMealByText = async (req, res) => {
  try {
    const { foodName, mealType = 'snacks', portionDescription = '', date } = req.body;
    const logDate = date ? new Date(date) : new Date();

    if (!foodName || !foodName.trim()) {
      return res.status(400).json({ message: 'foodName is required.' });
    }

    // Use Gemini text API to estimate nutrition
    const nutrition = await estimateCaloriesFromText(foodName.trim(), portionDescription.trim());

    const log = await MealLog.create({
      user:       req.user.id,
      mealType,
      date:       logDate,
      foodName:   nutrition.foodName,
      calories:   nutrition.calories,
      carbs:      nutrition.carbs,
      protein:    nutrition.protein,
      fat:        nutrition.fat,
      loggedVia:  'text',
      confidence: nutrition.confidence,
      breakdown:  nutrition.breakdown,
    });

    // Update weekly summary in the background
    updateWeeklySummary(req.user.id, log.date || log.createdAt);

    res.status(201).json({ success: true, log });
  } catch (error) {
    console.error('[logMealByText]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/meal-logs?date=YYYY-MM-DD&period=daily|weekly|monthly ──────────
// Fetch all meal logs for the authenticated user for the requested period.
// Also returns aggregated totals (calories, carbs, protein, fat).
const getDailyLog = async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const period  = req.query.period || 'daily';

    // Build UTC start/end for the requested period
    const anchor = new Date(dateStr + 'T00:00:00Z');
    let start, end;

    if (period === 'weekly') {
      // Week starts on Monday
      const dayOfWeek = anchor.getUTCDay(); // 0=Sun … 6=Sat
      const diffToMon = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
      start = new Date(anchor);
      start.setUTCDate(anchor.getUTCDate() + diffToMon);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
    } else if (period === 'monthly') {
      start = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
      end   = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 1));
    } else {
      // daily (default)
      start = anchor;
      end   = new Date(anchor);
      end.setUTCDate(anchor.getUTCDate() + 1);
    }

    const logs = await MealLog.find({
      user: req.user.id,
      date: { $gte: start, $lt: end },
    }).sort({ date: 1, createdAt: 1 });

    // Aggregate totals across the entire period
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        carbs:    acc.carbs    + (log.carbs    || 0),
        protein:  acc.protein  + (log.protein  || 0),
        fat:      acc.fat      + (log.fat      || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    res.json({ logs, totals, period, start, end });
  } catch (error) {
    console.error('[getDailyLog]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/meal-logs/:id ────────────────────────────────────────────────
// Delete a meal log entry — only the owner can delete their own logs
const deleteMealLog = async (req, res) => {
  try {
    const log = await MealLog.findById(req.params.id);

    if (!log) {
      return res.status(404).json({ message: 'Meal log not found.' });
    }

    // Ownership check
    if (log.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorised to delete this log.' });
    }

    const userId = log.user.toString();
    const logDate = log.date || log.createdAt;

    await log.deleteOne();

    // Update weekly summary in the background
    updateWeeklySummary(userId, logDate);

    res.json({ success: true, message: 'Meal log deleted.' });
  } catch (error) {
    console.error('[deleteMealLog]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── POST /api/meal-logs/wearable ─────────────────────────────────────────────
// Google Health API webhook — Member 1 (Evan) responsibility
const ingestWearableData = async (req, res) => {
  try {
    // TODO: Map Google Health webhook payload to MealLog/Progress document
    res.status(501).json({ message: 'ingestWearableData not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { logMealByText, logMealByImage, getDailyLog, deleteMealLog, ingestWearableData };

