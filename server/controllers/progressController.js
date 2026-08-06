// TODO: Implement progress tracking (weight + streaks)
// Member responsibility: Jarin Tasnim Dia

const Progress = require('../models/Progress');

// @route POST /api/progress
const logProgress = async (req, res) => {
  try {
    const { weight, adherence } = req.body;
    const entry = await Progress.create({ user: req.user.id, weight, adherence });
    res.status(201).json(entry);
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
