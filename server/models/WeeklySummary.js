const mongoose = require('mongoose');

const weeklySummarySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStartDate: { type: Date, required: true }, // Monday of the week (UTC Normalized)
    weekEndDate: { type: Date, required: true },   // Sunday of the week (UTC Normalized)
    totalCalories: { type: Number, default: 0 },
    dailyAverageCalories: { type: Number, default: 0 },
    totalProtein: { type: Number, default: 0 },
    totalCarbs: { type: Number, default: 0 },
    totalFat: { type: Number, default: 0 },
    daysLogged: { type: Number, default: 0 },     // number of days with logs in this week
  },
  { timestamps: true }
);

// Prevent duplicate weekly summaries per user
weeklySummarySchema.index({ user: 1, weekStartDate: 1 }, { unique: true });

module.exports = mongoose.model('WeeklySummary', weeklySummarySchema);
