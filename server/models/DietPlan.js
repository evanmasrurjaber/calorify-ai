const mongoose = require('mongoose');

const mealSchema = new mongoose.Schema({
  meal: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snacks'] },
  name: { type: String },
  calories: { type: Number },
  carbs: { type: Number },
  protein: { type: Number },
  fat: { type: Number },
  recipe: { type: String },
});

const dayPlanSchema = new mongoose.Schema({
  day: { type: String }, // e.g. "Monday"
  meals: [mealSchema],
  totalCalories: { type: Number },
});

const dietPlanSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStartDate: { type: Date },
    plan: [dayPlanSchema],
    isActive: { type: Boolean, default: true },
    // Cached shopping list JSON string (from single Gemini batch call)
    shoppingList: { type: String, default: null },
    // True = list matches current plan; False = plan was updated since last list generation
    shoppingListUpToDate: { type: Boolean, default: false },
    // DB-persisted item check-off state: array of "CategoryName|itemName" keys
    checkedItems: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DietPlan', dietPlanSchema);
