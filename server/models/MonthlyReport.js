const mongoose = require('mongoose');

const monthlyReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    month: { type: String, required: true, index: true }, // Format: "YYYY-MM", e.g. "2026-08"
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    daysInMonth: { type: Number, required: true },

    // Calorie Data
    summary: {
      totalCaloriesConsumed: { type: Number, default: 0 },
      averageDailyCalories: { type: Number, default: 0 },
      dailyCalorieTarget: { type: Number, default: 2000 },
      calorieAdherenceScore: { type: Number, default: 0 }, // % days within ±15% of target
      totalCaloriesBurned: { type: Number, default: 0 },
      averageDailyBurn: { type: Number, default: 0 },
      netCalories: { type: Number, default: 0 },
      totalSteps: { type: Number, default: 0 },
      averageDailySteps: { type: Number, default: 0 },
      totalLoggedDays: { type: Number, default: 0 },
    },

    // Nutrient Intake (Macronutrients)
    nutrients: {
      totalCarbs: { type: Number, default: 0 },       // grams
      totalProtein: { type: Number, default: 0 },     // grams
      totalFat: { type: Number, default: 0 },         // grams
      averageCarbs: { type: Number, default: 0 },     // grams/day
      averageProtein: { type: Number, default: 0 },   // grams/day
      averageFat: { type: Number, default: 0 },       // grams/day
      carbsPercentage: { type: Number, default: 0 },   // % of total macro kcal
      proteinPercentage: { type: Number, default: 0 }, // % of total macro kcal
      fatPercentage: { type: Number, default: 0 },     // % of total macro kcal
    },

    // Weight Trend & Body Composition
    weightTrend: {
      startingWeight: { type: Number, default: 0 },
      endingWeight: { type: Number, default: 0 },
      minWeight: { type: Number, default: 0 },
      maxWeight: { type: Number, default: 0 },
      weightChange: { type: Number, default: 0 },     // net change in kg (+/-)
      startingBMI: { type: Number, default: 0 },
      endingBMI: { type: Number, default: 0 },
      bmiCategory: { type: String, default: 'Normal' },
      entries: [
        {
          date: { type: Date },
          weight: { type: Number },
        },
      ],
    },

    // Plan Adherence & Streak History
    adherence: {
      adherentDays: { type: Number, default: 0 },
      nonAdherentDays: { type: Number, default: 0 },
      adherencePercentage: { type: Number, default: 0 },
      longestStreak: { type: Number, default: 0 },
      endingStreak: { type: Number, default: 0 },
    },

    // Weekly performance breakdown
    weeklyBreakdown: [
      {
        weekNumber: { type: Number },
        label: { type: String },
        caloriesConsumed: { type: Number, default: 0 },
        avgCalories: { type: Number, default: 0 },
        adherentDays: { type: Number, default: 0 },
        adherencePercentage: { type: Number, default: 0 },
        weightChange: { type: Number, default: 0 },
      },
    ],

    // Daily granular breakdown for chart plotting
    dailyBreakdown: [
      {
        date: { type: String }, // "YYYY-MM-DD"
        dayNumber: { type: Number },
        caloriesConsumed: { type: Number, default: 0 },
        caloriesBurned: { type: Number, default: 0 },
        carbs: { type: Number, default: 0 },
        protein: { type: Number, default: 0 },
        fat: { type: Number, default: 0 },
        weight: { type: Number, default: null },
        adherence: { type: Boolean, default: false },
        streak: { type: Number, default: 0 },
        steps: { type: Number, default: 0 },
      },
    ],

    // Personalized Suggestions & AI Evaluation
    personalizedSuggestions: {
      healthScore: { type: Number, default: 85 }, // 1 - 100
      healthGrade: { type: String, default: 'A' }, // A+, A, B, C, D
      overallEvaluation: { type: String },
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      dietaryAdvice: [{ type: String }],
      lifestyleAdvice: [{ type: String }],
      nextMonthGoals: [{ type: String }],
    },

    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Compound index for quick lookup of user's monthly report
monthlyReportSchema.index({ user: 1, month: 1 });

module.exports = mongoose.model('MonthlyReport', monthlyReportSchema);
