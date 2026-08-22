const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getGoogleAuthUrl,
  handleGoogleCallback,
  syncNow,
  getStatus,
  getTodayData,
  disconnect,
} = require('../controllers/wearableController');

// GET  /api/wearable/auth-url   → Generate Google OAuth consent URL
// Protected: frontend sends the JWT, we embed it as `state` in the OAuth URL
router.get('/auth-url', protect, getGoogleAuthUrl);

// GET  /api/wearable/callback   → Google redirects here after user consents
// Public: no JWT header — user identity is recovered from the `state` param
router.get('/callback', handleGoogleCallback);

// POST /api/wearable/sync       → Manual "Sync Now" — fetches fresh data from Google Health
// Protected: only the logged-in user can trigger their own sync
router.post('/sync', protect, syncNow);

// GET  /api/wearable/status     → Is Google Health connected? When was last sync?
// Protected: returns { connected, lastSyncedAt }
router.get('/status', protect, getStatus);

// GET  /api/wearable/today      → Today's steps + caloriesBurned from Progress collection
// Protected: returns cached data (no live API call)
router.get('/today', protect, getTodayData);

// DELETE /api/wearable/disconnect → Remove tokens, mark disconnected
// Protected: user can revoke access at any time
router.delete('/disconnect', protect, disconnect);

module.exports = router;
