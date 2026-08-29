const dotenv = require('dotenv');
dotenv.config();
const connectDB = require('./config/db');
const { sendEmail } = require('./services/gmailService');

const run = async () => {
  // Wait for DB to connect so SystemConfig is seeded/loaded
  await connectDB();
  
  // Wait another second just in case
  await new Promise(r => setTimeout(r, 1000));

  try {
    console.log(`Attempting to send a real email to ${process.env.GMAIL_USER}...`);
    const result = await sendEmail(
      process.env.GMAIL_USER,
      'Test Email from Calorify ⚡',
      '<h1>Calorify Email Test</h1><p>If you receive this, the email notification system works perfectly on any PC!</p>'
    );
    console.log('SUCCESS:', result);
  } catch (err) {
    console.error('FAILED TO SEND EMAIL:', err);
  }
  process.exit(0);
};

run();
