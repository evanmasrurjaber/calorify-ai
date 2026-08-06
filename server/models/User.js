const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },

    // Health profile
    age: { type: Number },
    weight: { type: Number }, // kg
    height: { type: Number }, // cm
    goal: {
      type: String,
      enum: ['lose_weight', 'maintain', 'gain_muscle'],
      default: 'maintain',
    },
    medicalConditions: [{ type: String }],
    allergies: [{ type: String }],
    dailyCalorieTarget: { type: Number, default: 2000 },

    // Subscription
    isPro: { type: Boolean, default: false },
    subscriptionExpiry: { type: Date },

    // Notification preferences
    notifications: {
      dailyMealReminder: { type: Boolean, default: true },
      weeklyPlanReset: { type: Boolean, default: true },
    },

    // Bookmarks
    bookmarks: [{ type: mongoose.Schema.Types.Mixed }],

    // Gamification
    points: { type: Number, default: 0 },
    badge: {
      type: String,
      enum: ['none', 'healthy_starter', 'nutrition_master', 'diet_legend'],
      default: 'none',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
