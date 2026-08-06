const mongoose = require('mongoose');

const mealLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, default: Date.now },
    mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'] },
    foodName: { type: String, required: true },
    calories: { type: Number },
    carbs: { type: Number },
    protein: { type: Number },
    fat: { type: Number },
    loggedVia: { type: String, enum: ['text', 'image', 'wearable'], default: 'text' },
    imageUrl: { type: String }, // if logged via photo
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealLog', mealLogSchema);
