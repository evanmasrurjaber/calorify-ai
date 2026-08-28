const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Progress = require('../models/Progress');
const {
  getAuthUrl,
  getTokensFromCode,
  fetchTodaysFitnessData,
} = require('../services/googleFitService');

// ─────────────────────────────────────────────────────────────────────────────
// Shared helper: fetch fitness data and upsert today's Progress document
// Used by: handleGoogleCallback (first sync) and syncNow (manual trigger)
// ─────────────────────────────────────────────────────────────────────────────
const syncUserFitnessData = async (userId, accessToken, refreshToken) => {
  // Fetch live data from Google Health API
  const data = await fetchTodaysFitnessData(accessToken, refreshToken);

  // Build today's date boundaries for the upsert query
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  // Upsert today's Progress record with steps + caloriesBurned
  // Does not overwrite weight / adherence / streak — only wearable fields
  await Progress.findOneAndUpdate(
    { user: userId, date: { $gte: startOfToday, $lte: endOfToday } },
    { $set: { steps: data.steps, caloriesBurned: data.caloriesBurned } },
    { upsert: true, returnDocument: 'after' }
  );

  // Record the sync timestamp on the User document
  await User.findByIdAndUpdate(userId, {
    'googleFit.lastSyncedAt': new Date(),
  });

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wearable/auth-url  [Protected]
// Returns the Google OAuth2 consent URL so the client can redirect the user.
// The user's JWT is embedded as the OAuth `state` parameter so we know who
// is connecting once Google redirects back to /callback.
// ─────────────────────────────────────────────────────────────────────────────
const getGoogleAuthUrl = (req, res) => {
  try {
    // Pull the raw JWT from the Authorization header
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    const url = getAuthUrl(token);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wearable/callback  [Public — called by Google after user consents]
// Google redirects here with:
//   ?code=<one-time-auth-code>&state=<user-jwt>
// Steps:
//   1. Verify the JWT in `state` to identify the user
//   2. Exchange the auth code for access + refresh tokens
//   3. Save the tokens to User.googleFit in MongoDB
//   4. Run an immediate first sync
//   5. Redirect the user back to the React app
// ─────────────────────────────────────────────────────────────────────────────
const handleGoogleCallback = async (req, res) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const { code, state: userJwt, error } = req.query;

    // Handle user denying consent on Google's screen
    if (error) {
      console.error('[Wearable] Google OAuth denied:', error);
      return res.redirect(`${clientUrl}/wearable?error=google_denied`);
    }

    if (!code || !userJwt) {
      return res.redirect(`${clientUrl}/wearable?error=missing_params`);
    }

    // Decode the JWT to find which Calorify user is connecting
    let decoded;
    try {
      decoded = jwt.verify(userJwt, process.env.JWT_SECRET);
    } catch (jwtErr) {
      console.error('[Wearable] Invalid state JWT:', jwtErr.message);
      return res.redirect(`${clientUrl}/wearable?error=invalid_state`);
    }
    const userId = decoded.id;

    // Exchange the one-time code for tokens
    const tokens = await getTokensFromCode(code);

    // Persist tokens and mark as connected
    await User.findByIdAndUpdate(userId, {
      'googleFit.connected': true,
      'googleFit.accessToken': tokens.access_token,
      // refresh_token is only returned on first authorization; preserve existing if absent
      ...(tokens.refresh_token && { 'googleFit.refreshToken': tokens.refresh_token }),
      ...(tokens.expiry_date && { 'googleFit.tokenExpiry': new Date(tokens.expiry_date) }),
    });

    // Attempt initial sync, but do not block successful account connection if initial fetch is empty
    try {
      await syncUserFitnessData(userId, tokens.access_token, tokens.refresh_token);
    } catch (syncErr) {
      console.warn('[Wearable] Initial sync warning:', syncErr.message);
    }

    // Redirect back to the wearable page with a success flag
    return res.redirect(`${clientUrl}/wearable?connected=true`);
  } catch (err) {
    console.error('[Wearable] Callback error:', err.message);
    return res.redirect(`${clientUrl}/wearable?error=google_auth_failed`);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wearable/sync  [Protected]
// Manual "Sync Now" — fetches fresh data from Google Health API and
// upserts the user's Progress document for today.
// ─────────────────────────────────────────────────────────────────────────────
const syncNow = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('googleFit');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.googleFit?.connected) {
      return res.status(400).json({ message: 'Google Health is not connected' });
    }

    if (!user.googleFit.refreshToken) {
      return res.status(400).json({
        message: 'No refresh token found. Please reconnect Google Health.',
      });
    }

    const data = await syncUserFitnessData(
      user._id,
      user.googleFit.accessToken,
      user.googleFit.refreshToken
    );

    res.json({
      message: 'Synced successfully',
      data: {
        steps: data.steps,
        caloriesBurned: data.caloriesBurned,
        syncedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[Wearable] syncNow error:', err.message);

    // Detect token revocation / expired refresh token
    if (err.response?.status === 401) {
      return res.status(401).json({
        message: 'Google Health authorization expired. Please reconnect.',
        requiresReconnect: true,
      });
    }

    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wearable/status  [Protected]
// Returns the user's current Google Health connection state so the
// frontend can render the correct UI (connected / not connected).
// ─────────────────────────────────────────────────────────────────────────────
const getStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('googleFit');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      connected: user.googleFit?.connected || false,
      lastSyncedAt: user.googleFit?.lastSyncedAt || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wearable/today  [Protected]
// Returns today's wearable data from the Progress collection.
// Useful for the frontend to display steps + caloriesBurned without
// fetching the entire progress history.
// ─────────────────────────────────────────────────────────────────────────────
const getTodayData = async (req, res) => {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todayEntry = await Progress.findOne({
      user: req.user.id,
      date: { $gte: startOfToday, $lte: endOfToday },
    }).select('steps caloriesBurned caloriesConsumed date');

    res.json({
      steps: todayEntry?.steps || 0,
      caloriesBurned: todayEntry?.caloriesBurned || 0,
      caloriesConsumed: todayEntry?.caloriesConsumed || 0,
      date: todayEntry?.date || null,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/wearable/disconnect  [Protected]
// Removes stored tokens and marks the user as disconnected.
// The user can reconnect at any time by going through the OAuth flow again.
// ─────────────────────────────────────────────────────────────────────────────
const disconnect = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        'googleFit.connected': false,
        'googleFit.lastSyncedAt': null,
      },
      $unset: {
        'googleFit.accessToken': '',
        'googleFit.refreshToken': '',
        'googleFit.tokenExpiry': '',
      },
    });

    res.json({ message: 'Disconnected from Google Health successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getGoogleAuthUrl,
  handleGoogleCallback,
  syncNow,
  getStatus,
  getTodayData,
  disconnect,
  syncUserFitnessData, // exported for potential future use
};
