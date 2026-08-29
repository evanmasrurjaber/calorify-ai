const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const dietPlanRoutes = require('./routes/dietPlanRoutes');
const mealLogRoutes = require('./routes/mealLogRoutes');
const progressRoutes = require('./routes/progressRoutes');
const challengeRoutes = require('./routes/challengeRoutes');
const shoppingListRoutes = require('./routes/shoppingListRoutes');
const medicalReportRoutes = require('./routes/medicalReportRoutes');
const bookmarkRoutes = require('./routes/bookmarkRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const wearableRoutes = require('./routes/wearableRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const healthReportRoutes = require('./routes/healthReportRoutes');
const communityPostRoutes = require('./routes/communityPostRoutes');

connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/diet-plans', dietPlanRoutes);
app.use('/api/meal-logs', mealLogRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/shopping-list', shoppingListRoutes);
app.use('/api/medical-reports', medicalReportRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wearable', wearableRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', healthReportRoutes);
app.use('/api/health-reports', healthReportRoutes);
app.use('/api/community-posts', communityPostRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Calorify API is running 🚀' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
