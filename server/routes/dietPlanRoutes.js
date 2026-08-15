const express = require('express');
const router = express.Router();
const { generateDietPlan, getActivePlan, generateRecipe, generateRecipeDirectly, getGenerationContext } = require('../controllers/dietPlanController');
const { protect } = require('../middleware/authMiddleware');

router.get('/generation-context', protect, getGenerationContext);
router.post('/generate', protect, generateDietPlan);
router.get('/active', protect, getActivePlan);
router.post('/generate-direct', protect, generateRecipeDirectly);
router.get('/:id/recipe', protect, generateRecipe);

module.exports = router;
