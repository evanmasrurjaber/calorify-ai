const { google } = require('googleapis');
const axios = require('axios');

// ── OAuth2 client helper ──────────────────────────────────────────────────────
const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// Google Health API v4 scope (modern replacement for deprecated fitness.activity.read)
const SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
];

const HEALTH_API_BASE = 'https://health.googleapis.com/v4';

// ── Auth URL ──────────────────────────────────────────────────────────────────

/**
 * Generates the Google OAuth2 consent page URL.
 * The user's Calorify JWT is passed as `state` so we can identify
 * which user authorized after the callback redirects back.
 *
 * @param {string} userJwt - The user's active Calorify JWT token
 * @returns {string} Google OAuth consent URL
 */
const getAuthUrl = (userJwt) => {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // ensures a refresh_token is returned
    prompt: 'consent',      // force re-consent so refresh_token is always included
    scope: SCOPES,
    state: userJwt,         // echoed back by Google in the callback query string
  });
};

// ── Token exchange ────────────────────────────────────────────────────────────

/**
 * Exchanges a one-time authorization code (received in /callback) for
 * a short-lived access_token and a long-lived refresh_token.
 *
 * @param {string} code - The authorization code from Google's callback
 * @returns {Object} tokens - { access_token, refresh_token, expiry_date, ... }
 */
const getTokensFromCode = async (code) => {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
};

// ── Token refresh ─────────────────────────────────────────────────────────────

/**
 * Returns a valid (possibly refreshed) access token.
 * The googleapis library automatically refreshes if the current token is expired.
 *
 * @param {string} accessToken  - Stored access token (may be expired)
 * @param {string} refreshToken - Long-lived refresh token
 * @returns {string} A fresh access token
 */
const getFreshAccessToken = async (accessToken, refreshToken) => {
  const client = getOAuthClient();
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  const { token } = await client.getAccessToken();
  return token;
};

// ── Data fetching ─────────────────────────────────────────────────────────────

/**
 * Helper to build the CivilTimeInterval range for today.
 * Google Health API v4 schema expects start.date and end.date objects.
 */
const getTodayCivilTimeRange = () => {
  const now = new Date();
  const start = {
    date: {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    },
  };
  const tomorrow = new Date(now.getTime() + 86400000);
  const end = {
    date: {
      year: tomorrow.getFullYear(),
      month: tomorrow.getMonth() + 1,
      day: tomorrow.getDate(),
    },
  };
  return { start, end };
};

/**
 * Fetches today's total step count from Google Health API v4.
 * Endpoint: POST /v4/users/me/dataTypes/steps/dataPoints:dailyRollUp
 *
 * @param {string} freshAccessToken - A valid (non-expired) access token
 * @returns {number} Total steps for today
 */
const fetchTodaySteps = async (freshAccessToken) => {
  try {
    const range = getTodayCivilTimeRange();

    const response = await axios.post(
      `${HEALTH_API_BASE}/users/me/dataTypes/steps/dataPoints:dailyRollUp`,
      {
        range,
        windowSizeDays: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${freshAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const points = response.data?.rollupDataPoints || response.data?.dailyRollupDataPoints || [];
    let totalSteps = 0;

    for (const p of points) {
      const stepVal =
        p.steps?.countSum ??
        p.steps?.count ??
        p.value?.count ??
        p.count ??
        0;
      totalSteps += parseInt(stepVal, 10) || 0;
    }

    return totalSteps;
  } catch (err) {
    console.warn('[GoogleHealth] fetchTodaySteps warning:', err.response?.data || err.message);
    return 0;
  }
};

/**
 * Fetches today's active calories burned from Google Health API v4.
 * Endpoint: POST /v4/users/me/dataTypes/active-energy-burned/dataPoints:dailyRollUp
 *
 * @param {string} freshAccessToken - A valid (non-expired) access token
 * @returns {number} Total active calories burned today (rounded to integer)
 */
const fetchTodayCaloriesBurned = async (freshAccessToken) => {
  try {
    const range = getTodayCivilTimeRange();

    const response = await axios.post(
      `${HEALTH_API_BASE}/users/me/dataTypes/active-energy-burned/dataPoints:dailyRollUp`,
      {
        range,
        windowSizeDays: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${freshAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const points = response.data?.rollupDataPoints || response.data?.dailyRollupDataPoints || [];
    let totalKcal = 0;

    for (const p of points) {
      const val =
        p.activeEnergyBurned?.kcalSum ??
        p['active-energy-burned']?.energySum?.kcal ??
        p.energySum?.kcal ??
        p.value?.kcal ??
        p.kcal ??
        0;
      totalKcal += parseFloat(val) || 0;
    }

    return Math.round(totalKcal);
  } catch (err) {
    console.warn('[GoogleHealth] fetchTodayCaloriesBurned warning:', err.response?.data || err.message);
    return 0;
  }
};

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Fetches both steps and calories burned for today using Google Health API v4.
 * Handles token refresh automatically.
 *
 * @param {string} accessToken  - Stored access token (may be expired)
 * @param {string} refreshToken - Long-lived refresh token
 * @returns {{ steps: number, caloriesBurned: number }}
 */
const fetchTodaysFitnessData = async (accessToken, refreshToken) => {
  const freshToken = await getFreshAccessToken(accessToken, refreshToken);

  const [steps, caloriesBurned] = await Promise.all([
    fetchTodaySteps(freshToken),
    fetchTodayCaloriesBurned(freshToken),
  ]);

  return { steps, caloriesBurned };
};

module.exports = {
  getAuthUrl,
  getTokensFromCode,
  fetchTodaysFitnessData,
};
