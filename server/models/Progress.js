const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    weight: { type: Number }, // kg
    adherence: { type: Boolean, default: false }, // followed plan today?
    streak: { type: Number, default: 0 }, // consecutive adherence days
    steps: { type: Number, default: 0 },
    caloriesBurned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Progress', progressSchema);
