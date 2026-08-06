// TODO: Implement diet plan generation and retrieval
// Member responsibility: Evan Masrur Jaber (Gemini API)

const DietPlan = require('../models/DietPlan');

// @route POST /api/diet-plans/generate
const generateDietPlan = async (req, res) => {
  try {
    // TODO: Send user health profile to Gemini API and parse 7-day plan response
    res.status(501).json({ message: 'generateDietPlan not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/diet-plans/active
const getActivePlan = async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/diet-plans/:id/recipe
const generateRecipe = async (req, res) => {
  try {
    // TODO: Generate recipe + ingredient trivia via Gemini API
    res.status(501).json({ message: 'generateRecipe not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { generateDietPlan, getActivePlan, generateRecipe };
