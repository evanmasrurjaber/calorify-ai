const express = require('express');
const router = express.Router();
const { logMealByText, logMealByImage, getDailyLog, deleteMealLog, ingestWearableData } = require('../controllers/mealLogController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.post('/', protect, logMealByText);
router.post('/image', protect, upload.single('meal_image'), logMealByImage);
router.get('/', protect, getDailyLog);
router.delete('/:id', protect, deleteMealLog);
router.post('/wearable', ingestWearableData); // Webhook — no JWT (uses API key validation instead)

module.exports = router;

