// TODO: Implement meal logging (text + image)
// Member responsibility: Jarin Tasnim Dia (Gemini API + Calorie API)

const MealLog = require('../models/MealLog');

// @route POST /api/meal-logs (text log via Gemini)
const logMealByText = async (req, res) => {
  try {
    // TODO: Send food name to Gemini API to estimate calories/macros, then save
    res.status(501).json({ message: 'logMealByText not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/meal-logs/image (image upload via Calorie API)
const logMealByImage = async (req, res) => {
  try {
    // TODO: Forward image buffer to FastAPI microservice / Calorie API, parse response, save log
    res.status(501).json({ message: 'logMealByImage not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/meal-logs?date=YYYY-MM-DD
const getDailyLog = async (req, res) => {
  try {
    const { date } = req.query;
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);

    const logs = await MealLog.find({ user: req.user.id, date: { $gte: start, $lt: end } });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/meal-logs/wearable (Google Health API webhook)
const ingestWearableData = async (req, res) => {
  try {
    // TODO: Map Google Health webhook payload to MealLog/Progress document
    res.status(501).json({ message: 'ingestWearableData not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { logMealByText, logMealByImage, getDailyLog, ingestWearableData };
