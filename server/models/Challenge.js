const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    title: { type: String, required: true }, // e.g. "Drink 2L Water"
    description: { type: String },
    pointsReward: { type: Number, default: 10 },
    completed: { type: Boolean, default: false },
    completedAt: { type: Date },
    target: { type: Number, default: 0 },
    current: { type: Number, default: 0 },
    step: { type: Number, default: 0 },
    unit: { type: String, default: '' },
    badgeKey: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Challenge', challengeSchema);
