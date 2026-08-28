const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const SystemConfig = require('../models/SystemConfig');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const fallbackUri = 'mongodb://127.0.0.1:27017/calorify';

  const seedSystemConfig = async () => {
    try {
      // Seed central GMAIL_USER if not present
      const userConfig = await SystemConfig.findOne({ key: 'GMAIL_USER' });
      if (!userConfig) {
        await SystemConfig.create({
          key: 'GMAIL_USER',
          value: 'calorify.app.notifications@gmail.com'
        });
      }

      // Seed central GMAIL_API_KEY if not present
      const keyConfig = await SystemConfig.findOne({ key: 'GMAIL_API_KEY' });
      if (!keyConfig) {
        await SystemConfig.create({
          key: 'GMAIL_API_KEY',
          value: 'hxqy nzws yrqf qluz'
        });
      }
      console.log('[SystemConfig]: Central Gmail and API Key successfully verified/seeded in MongoDB.');
    } catch (err) {
      console.error('[SystemConfig] Seeding error:', err.message);
    }
  };

  try {
    const conn = await mongoose.connect(primaryUri);
    console.log(`MongoDB Connected (Primary Atlas): ${conn.connection.host}`);
    await seedSystemConfig();
  } catch (error) {
    console.error(`Primary MongoDB connection error: ${error.message}`);
    console.log(`Attempting fallback to local MongoDB: ${fallbackUri}...`);
    try {
      const conn = await mongoose.connect(fallbackUri);
      console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
      await seedSystemConfig();
    } catch (fallbackError) {
      console.error(`Local fallback MongoDB connection error: ${fallbackError.message}`);
      console.error('\n======================================================');
      console.error('⚠️ DATABASE CONNECTION FAILED!');
      console.error('Please check:');
      console.error('1. If using MongoDB Atlas, verify your current IP is whitelisted in Atlas -> Network Access.');
      console.error('2. If running locally, make sure your local MongoDB service is started (run mongod).');
      console.error('======================================================\n');
      process.exit(1);
    }
  }
};

module.exports = connectDB;
