const express = require('express');
const router = express.Router();
const {
  generateDietPlan,
  regenerateDay,
  regenerateMeal,
  getActivePlan,
  generateRecipe,
  generateRecipeDirectly,
  getGenerationContext,
  deleteActivePlan,
  deletePlan,
} = require('../controllers/dietPlanController');
const { protect } = require('../middleware/authMiddleware');

router.get('/generation-context', protect, getGenerationContext);
router.post('/generate', protect, generateDietPlan);
router.post('/regenerate-day', protect, regenerateDay);
router.post('/regenerate-meal', protect, regenerateMeal);
router.get('/active', protect, getActivePlan);
router.delete('/active', protect, deleteActivePlan);
router.delete('/:id', protect, deletePlan);
router.post('/generate-direct', protect, generateRecipeDirectly);
router.get('/:id/recipe', protect, generateRecipe);

module.exports = router;
