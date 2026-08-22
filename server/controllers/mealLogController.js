// Meal Log Controller — Member responsibility: Jarin Tasnim Dia
// Uses Gemini Vision API (via calorieApiService) for calorie + macro estimation

const MealLog = require('../models/MealLog');
const { estimateCaloriesFromImage, estimateCaloriesFromText } = require('../services/calorieApiService');

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

    // Send image buffer to Gemini Vision via calorieApiService
    const nutrition = await estimateCaloriesFromImage(req.file.buffer, req.file.mimetype);

    const log = await MealLog.create({
      user:       req.user.id,
      mealType,
      foodName:   nutrition.foodName,
      calories:   nutrition.calories,
      carbs:      nutrition.carbs,
      protein:    nutrition.protein,
      fat:        nutrition.fat,
      loggedVia:  'image',
      confidence: nutrition.confidence,
      breakdown:  nutrition.breakdown,
    });

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
    const { foodName, mealType = 'snacks', portionDescription = '' } = req.body;

    if (!foodName || !foodName.trim()) {
      return res.status(400).json({ message: 'foodName is required.' });
    }

    // Use Gemini text API to estimate nutrition
    const nutrition = await estimateCaloriesFromText(foodName.trim(), portionDescription.trim());

    const log = await MealLog.create({
      user:       req.user.id,
      mealType,
      foodName:   nutrition.foodName,
      calories:   nutrition.calories,
      carbs:      nutrition.carbs,
      protein:    nutrition.protein,
      fat:        nutrition.fat,
      loggedVia:  'text',
      confidence: nutrition.confidence,
      breakdown:  nutrition.breakdown,
    });

    res.status(201).json({ success: true, log });
  } catch (error) {
    console.error('[logMealByText]', error.message);
    res.status(500).json({ message: error.message });
  }
};

// ─── GET /api/meal-logs?date=YYYY-MM-DD ───────────────────────────────────────
// Fetch all meal logs for the authenticated user on a given date
// Also returns daily totals (calories, carbs, protein, fat)
const getDailyLog = async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const start   = new Date(dateStr);
    const end     = new Date(dateStr);
    end.setDate(end.getDate() + 1);

    const logs = await MealLog.find({
      user: req.user.id,
      date: { $gte: start, $lt: end },
    }).sort({ createdAt: 1 });

    // Aggregate daily totals
    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        carbs:    acc.carbs    + (log.carbs    || 0),
        protein:  acc.protein  + (log.protein  || 0),
        fat:      acc.fat      + (log.fat      || 0),
      }),
      { calories: 0, carbs: 0, protein: 0, fat: 0 }
    );

    res.json({ logs, totals });
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

    await log.deleteOne();
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

