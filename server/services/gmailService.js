// Gmail API / Nodemailer email service
// Member responsibility: Noorani Faiza Khan

const nodemailer = require('nodemailer');

// TODO: Replace with OAuth2 Gmail transport for production
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
  },
});

/**
 * Send an email
 * @param {string} to - recipient email
 * @param {string} subject
 * @param {string} html - HTML body
 */
const sendEmail = async (to, subject, html) => {
  const mailOptions = { from: `"Calorify" <${process.env.GMAIL_USER}>`, to, subject, html };
  return transporter.sendMail(mailOptions);
};

module.exports = { sendEmail };
