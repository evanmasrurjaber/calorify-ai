// Notification Controller — Member 4 (Noorani Faiza Khan) responsibility
const { google } = require('googleapis');
const { sendEmail } = require('../services/gmailService');
const User = require('../models/User');
const SystemConfig = require('../models/SystemConfig');

// Helper to create Google OAuth2 client for Gmail API
const getOAuthClient = () => {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:5000/api/notifications/callback'
  );
};

// @route GET /api/notifications/auth
// Redirects the admin/owner to Google login to authorize email sending from any PC
const getGoogleAuthUrl = (req, res) => {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // Force consent screen to guarantee refresh_token is returned
    scope: [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  res.redirect(url);
};

// @route GET /api/notifications/callback
// Exchanges query authorization code for refresh token and saves to MongoDB
const googleAuthCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Authorization code is missing');

    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Fetch the email of the authorized Gmail account
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email;

    if (!tokens.refresh_token) {
      return res.status(400).send(
        '<h3>No refresh token returned.</h3>' +
        '<p>Please go to your <a href="https://myaccount.google.com/connections">Google Security Connections page</a>, ' +
        'remove the "Calorify" application, and try logging in again to force Google to issue a new refresh token.</p>'
      );
    }

    // Save configuration persistently in the shared cloud MongoDB Atlas database
    await SystemConfig.findOneAndUpdate(
      { key: 'GMAIL_USER' },
      { value: email },
      { upsert: true, new: true }
    );

    await SystemConfig.findOneAndUpdate(
      { key: 'GMAIL_API_KEY' }, // Storing refresh token as the active key in the DB
      { value: tokens.refresh_token },
      { upsert: true, new: true }
    );

    // Print keys to the server terminal for easy copy-paste into local .env files
    console.log('\n======================================================');
    console.log('📬 GMAIL API OAUTH2 KEYS GENERATED:');
    console.log(`GMAIL_USER=${email}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('======================================================\n');

    res.send(`
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 50px auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 20px; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <h2 style="color: #10b981; margin-bottom: 10px;">⚡ Calorify Gmail Configured!</h2>
        <p style="color: #475569; font-size: 15px;">Successfully authorized email notifications for account:</p>
        <p style="font-size: 16px; font-weight: bold; color: #1e293b; background: #f1f5f9; padding: 10px; border-radius: 8px; margin: 15px 0;">${email}</p>
        <p style="color: #64748b; font-size: 13px; line-height: 1.5;">The refresh token has been stored in MongoDB. The website can now send automated emails from any PC running this code.</p>
        <button onclick="window.close()" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px;">Close Window</button>
      </div>
    `);
  } catch (error) {
    console.error('OAuth Callback Error:', error);
    res.status(500).send(`Gmail API authentication failed: ${error.message}`);
  }
};

// @route POST /api/notifications/send-reminder
const sendMealReminder = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.notifications?.dailyMealReminder) {
      return res.status(400).json({ message: 'User has daily meal reminders disabled' });
    }

    const subject = `🍽️ Calorify: Time to Log Your Meals!`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
        <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">🍽️ Meal Log Reminder</h2>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">This is a friendly reminder to log your diet intake (breakfast, lunch, dinner, or snacks) on Calorify today.</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6;">Logging your meals consistently helps you stay on top of your daily calorie target and reach your health goals!</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="http://localhost:5173/meal-log" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">Log Your Meals Now</a>
        </div>
        <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 20px;">You can manage your notification preferences anytime from your Profile settings page.</p>
        <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br/><strong>The Calorify Team</strong></p>
      </div>
    `;

    await sendEmail(user.email, subject, html);
    res.json({ success: true, message: 'Meal reminder email sent' });
  } catch (error) {
    console.error('Error in sendMealReminder:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { sendMealReminder, getGoogleAuthUrl, googleAuthCallback };
