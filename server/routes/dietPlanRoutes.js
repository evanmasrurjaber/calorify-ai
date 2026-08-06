const express = require('express');
const router = express.Router();
const { generateDietPlan, getActivePlan, generateRecipe } = require('../controllers/dietPlanController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateDietPlan);
router.get('/active', protect, getActivePlan);
router.get('/:id/recipe', protect, generateRecipe);

module.exports = router;
