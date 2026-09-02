const express = require('express');
const router = express.Router();
const {
  sendWeeklyPlanRefreshReminder,
  getGoogleAuthUrl,
  googleAuthCallback,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// OAuth2 Auth Flow
router.get('/auth', getGoogleAuthUrl);
router.get('/callback', googleAuthCallback);

// Reminders
router.post('/send-weekly-refresh', protect, sendWeeklyPlanRefreshReminder);

module.exports = router;
