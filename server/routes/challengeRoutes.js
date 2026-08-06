const express = require('express');
const router = express.Router();
const { getTodayChallenges, completeChallenge } = require('../controllers/challengeController');
const { protect } = require('../middleware/authMiddleware');

router.get('/today', protect, getTodayChallenges);
router.post('/:id/complete', protect, completeChallenge);

module.exports = router;
