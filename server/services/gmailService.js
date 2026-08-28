const nodemailer = require('nodemailer');
const SystemConfig = require('../models/SystemConfig');

let transporter = null;
let configuredUser = null;
let configuredPass = null;

/**
 * Dynamically resolves and creates the SMTP transport from MongoDB SystemConfig or Env variables.
 */
const getTransporter = async () => {
  // If already initialized, reuse
  if (transporter && configuredUser && configuredPass) {
    return transporter;
  }

  // 1. Prioritize local environment variables (.env)
  emailUser = process.env.GMAIL_USER;
  emailPass = process.env.GMAIL_PASS || process.env.GMAIL_API_KEY || process.env.GMAIL_REFRESH_TOKEN;

  // 2. Fall back to shared MongoDB configuration if not set locally
  if (!emailUser || !emailPass) {
    try {
      const userDoc = await SystemConfig.findOne({ key: 'GMAIL_USER' });
      const keyDoc = await SystemConfig.findOne({ key: 'GMAIL_API_KEY' });
      if (userDoc && !emailUser) emailUser = userDoc.value;
      if (keyDoc && !emailPass) emailPass = keyDoc.value;
    } catch (err) {
      console.log('[Gmail Service]: Failed to load database configuration fallback.');
    }
  }

  if (emailUser && emailPass) {
    const isOAuth2 = emailPass.startsWith('1//') || emailPass.startsWith('1/') || ((process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID) && emailPass.length > 30);

    if (isOAuth2) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: emailUser,
          clientId: process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET,
          refreshToken: emailPass,
        },
      });
      console.log(`[Gmail Service]: OAuth2 Transporter successfully active for: ${emailUser}`);
    } else {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
      console.log(`[Gmail Service]: SMTP Transporter successfully active for: ${emailUser}`);
    }
    configuredUser = emailUser;
    configuredPass = emailPass;
    return transporter;
  }

  return null;
};

/**
 * Send an email (with database-backed configuration for any PC/machine compatibility)
 * @param {string} to - recipient email
 * @param {string} subject
 * @param {string} html - HTML body
 */
const sendEmail = async (to, subject, html) => {
  const activeTransporter = await getTransporter();

  if (!activeTransporter) {
    console.log('\n================== EMAIL SIMULATION ==================');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log('------------------------------------------------------');
    console.log(html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('======================================================\n');
    return { messageId: 'mock-email-id-' + Date.now() };
  }

  const mailOptions = {
    from: `"Calorify" <${configuredUser}>`,
    to,
    subject,
    html,
  };
  return activeTransporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
