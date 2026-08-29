const DietPlan = require('../models/DietPlan');
const User = require('../models/User');
const MedicalReport = require('../models/MedicalReport');
const Progress = require('../models/Progress');
const DishImage = require('../models/DishImage');
const { generateText, parseJSONResponse } = require('../services/geminiService');
const { sendEmail } = require('../services/gmailService');

// ─── Helper: Generate a Pollinations AI food image URL ───────────────────────
async function generateDishImageURL(dishName) {
  if (!dishName) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';

  try {
    const dish = await DishImage.findOne({ name: { $regex: new RegExp(`^${dishName}$`, 'i') } });
    if (dish && dish.imageUrl) {
      return dish.imageUrl;
    }
  } catch (error) {
    console.error('Error fetching dish image from DB:', error);
  }

  const finalPrompt = `Professional close-up food photography of authentic Bangladeshi ${dishName}, showing the main ingredients clearly, 4k, photorealistic, highly detailed, appetizing`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=800&height=800&nologo=true&model=flux`;
}

// ─── Helper: Compute TDEE using Mifflin-St Jeor formula ─────────────────────
// BMR = 10*weight(kg) + 6.25*height(cm) - 5*age(yr) ± gender_constant
// TDEE = BMR * activityMultiplier
// Goal adjustment: -15% for lose_weight, +10% for gain_muscle
function computeTDEE(user) {
  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };

  const weight = user.weight || 70;  // kg
  const height = user.height || 170; // cm
  const age = user.age || 25;  // years

  // Gender constant: male = +5, female = -161, prefer_not_to_say = average (-78)
  const genderConstant =
    user.gender === 'male' ? 5 :
      user.gender === 'female' ? -161 : -78;

  const bmr = 10 * weight + 6.25 * height - 5 * age + genderConstant;
  const multiplier = activityMultipliers[user.activityLevel] || 1.2;
  let tdee = Math.round(bmr * multiplier);

  if (user.goal === 'lose_weight') tdee = Math.round(tdee * 0.85);
  if (user.goal === 'gain_muscle') tdee = Math.round(tdee * 1.10);

  return Math.max(tdee, 1200); // Safety floor: never below 1200 kcal
}

// ─── Helper: Merge data from all medical reports ─────────────────────────────
// Q3 rule: Merge — union arrays (diagnoses, allergies), latest value for scalars (hba1c)
function mergeMedicalReports(reports) {
  if (!reports || reports.length === 0) return null;

  const merged = {
    diagnoses: [],
    allergies: [],
    hba1c: null,
  };

  // Process from oldest to newest so latest scalar values overwrite
  const sorted = [...reports].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  for (const report of sorted) {
    const pd = report.parsedData;
    if (!pd) continue;

    // Union: add new diagnoses not already in the set
    if (pd.diagnoses?.length) {
      for (const d of pd.diagnoses) {
        if (d && !merged.diagnoses.includes(d)) merged.diagnoses.push(d);
      }
    }

    // Union: add new allergies not already in the set
    if (pd.allergies?.length) {
      for (const a of pd.allergies) {
        if (a && !merged.allergies.includes(a)) merged.allergies.push(a);
      }
    }

    // Latest wins for scalar fields
    if (pd.hba1c != null) merged.hba1c = pd.hba1c;
  }

  return merged;
}

// ─── Helper: Dictionaries for Cuisines and Diet Preferences ─────────────────
const CUISINE_DEFINITIONS = {
  bangladeshi: 'Authentic Bangladeshi / Bengali cuisine (e.g. Shak bhaji, Chorchori, Shorshe Ilish, Rui Kalia, Bhorta, Daal, Khichuri).',
  pan_asian: 'Pan-Asian cuisine (e.g. Thai, Japanese, Chinese, Vietnamese inspired stir-fries, noodle soups, steamed fish, edamame, tofu).',
  continental: 'Continental / Western cuisine (e.g. Grilled proteins, roasted vegetables, baked salmon, garden salads, chicken breast, quinoa bowls).',
  italian: 'Healthy Italian cuisine (e.g. Whole-wheat pasta, marinara, grilled chicken piccata, minestrone, caprese, herb-roasted vegetables).',
  mediterranean: 'Mediterranean cuisine (e.g. Greek salads, hummus, grilled seafood, tabbouleh, lean chicken shawarma bowls, olive oil, tzatziki).',
  middle_eastern: 'Middle Eastern cuisine (e.g. Shish tawook, lentil soup/shorba, fattoush, grilled kababs, spiced chickpea bowls).',
  mexican: 'Healthy Mexican cuisine (e.g. Burrito bowls, grilled fajitas, black bean salsa, guacamole, corn tortilla tacos, lime-cilantro chicken).',
  indian: 'Pan-Indian cuisine (e.g. Tandoori chicken/paneer, dal tadka, palak, sambar, idli, vegetable curries).',
};

const DIET_PREFERENCE_DEFINITIONS = {
  diabetic_friendly: 'Strictly diabetic-friendly: prioritize low-glycemic index (GI) foods, complex carbohydrates, high dietary fiber, and zero refined sugars.',
  low_carb_keto: 'Low-carb / Keto-aligned: minimize high-carb grains/rice/potatoes; emphasize lean meats, fish, eggs, avocado, nuts, and leafy greens.',
  high_protein: 'High-protein focus: maximize protein density with generous servings of fish, lean poultry, eggs, legumes, and tofu.',
  low_oil: 'Low-oil / Heart-healthy: utilize air-frying, steaming, poaching, grilling with minimal cooking oil.',
  vegetarian_vegan: '100% Vegetarian / Plant-based: rely on wholesome plant proteins (lentils, chickpeas, tofu, paneer) and seasonal vegetables.',
  gluten_free: 'Gluten-free: avoid wheat, barley, rye; use rice, oats, quinoa, corn, potatoes, and naturally gluten-free ingredients.',
  quick_prep: 'Quick & easy preparation: accessible everyday ingredients taking under 20 minutes to prepare and cook.',
  balanced_macro: 'Balanced macronutrient distribution (~45-50% carbs, 25-30% protein, 20-25% healthy fats).',
};

function formatPreferences({ cuisines = [], customCuisine = '', dietPreferences = [], customDietPreference = '', customNotes = '' }) {
  const rules = [];

  // Cuisine rules
  const cuisineTexts = [];
  if (cuisines?.length) {
    cuisines.forEach((c) => {
      if (CUISINE_DEFINITIONS[c]) cuisineTexts.push(CUISINE_DEFINITIONS[c]);
      else cuisineTexts.push(c);
    });
  }
  if (customCuisine && customCuisine.trim()) {
    cuisineTexts.push(`Custom Cuisine Style: ${customCuisine.trim()}`);
  }
  if (cuisineTexts.length > 0) {
    rules.push(`CUISINE STYLES TO EMPHASIZE: ${cuisineTexts.join(' | ')}`);
  } else {
    rules.push(`CUISINE STYLE: Authentic Bangladeshi & South Asian dishes.`);
  }

  // Dietary preference rules
  const dietTexts = [];
  if (dietPreferences?.length) {
    dietPreferences.forEach((d) => {
      if (DIET_PREFERENCE_DEFINITIONS[d]) dietTexts.push(DIET_PREFERENCE_DEFINITIONS[d]);
      else dietTexts.push(d);
    });
  }
  if (customDietPreference && customDietPreference.trim()) {
    dietTexts.push(`Custom Diet Requirement: ${customDietPreference.trim()}`);
  }
  if (dietTexts.length > 0) {
    rules.push(`DIETARY PREFERENCES: ${dietTexts.join(' | ')}`);
  }

  // Custom User Notes
  if (customNotes && customNotes.trim()) {
    rules.push(`USER SPECIFIC REQUESTS: ${customNotes.trim()}`);
  }

  return rules;
}

function buildDietPlanPrompt({ user, reportData, wearableData, goalText, cuisines = [], customCuisine = '', dietPreferences = [], customDietPreference = '', customNotes = '' }) {
  const profileSection = `
=== PERSONAL HEALTH PROFILE ===
- Age: ${user.age || 'Not specified'} years
- Weight: ${user.weight || 'Not specified'} kg
- Height: ${user.height || 'Not specified'} cm
- Gender: ${user.gender || 'Not specified'}
- Activity Level: ${(user.activityLevel || 'sedentary').replace(/_/g, ' ')}
- Daily Calorie Target (TDEE-calculated): ${user.dailyCalorieTarget} kcal
- Fitness Goal: ${goalText}
${user.medicalConditions?.length ? `- Medical Conditions: ${user.medicalConditions.join(', ')}` : '- Medical Conditions: None reported'}
${user.allergies?.length ? `- Allergies: ${user.allergies.join(', ')}` : '- Allergies: None reported'}`.trim();

  let medicalSection = '';
  if (reportData) {
    const diagStr = reportData.diagnoses?.length ? reportData.diagnoses.join(', ') : 'None on record';
    const hba1cStr = reportData.hba1c != null ? `${reportData.hba1c}%` : 'Not recorded';
    const medAllergyStr = reportData.allergies?.length ? reportData.allergies.join(', ') : 'None on record';
    medicalSection = `
=== MEDICAL REPORT DATA ===
- Confirmed Diagnoses: ${diagStr}
- HbA1c Level: ${hba1cStr}
- Medically Confirmed Allergies: ${medAllergyStr}`.trim();
  }

  let wearableSection = '';
  if (wearableData) {
    wearableSection = `
=== WEARABLE / ACTIVITY DATA ===
- Daily Steps Recorded: ${wearableData.steps?.toLocaleString() || 0}
- Active Calories Burned: ${wearableData.caloriesBurned || 0} kcal
- Date Recorded: ${wearableData.date ? new Date(wearableData.date).toDateString() : 'Unknown'}`.trim();
  }

  const baseRules = [
    `Avoid ALL allergens mentioned across both the health profile and medical report sections.`,
    `Keep each day's total calories within ±75 kcal of the Daily Calorie Target (${user.dailyCalorieTarget} kcal).`,
    `Each day must have exactly 4 meals: breakfast, lunch, snacks, dinner — in that order.`,
  ];

  const prefRules = formatPreferences({ cuisines, customCuisine, dietPreferences, customDietPreference, customNotes });

  if (reportData?.hba1c != null && reportData.hba1c > 6.5) {
    baseRules.push(`IMPORTANT: HbA1c is ${reportData.hba1c}% — generate a diabetic-friendly, low-glycemic index plan.`);
  }
  if (wearableData?.steps > 10000) {
    baseRules.push(`User is highly active (${wearableData.steps?.toLocaleString()} steps) — adjust meal timing to support recovery.`);
  }

  const allRules = [...baseRules, ...prefRules];
  const rulesSection = `=== INSTRUCTIONS ===\n${allRules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

  const exampleStructure = `[
  {
    "day": "Monday",
    "meals": [
      { "meal": "breakfast", "name": "...", "calories": 400, "carbs": 50, "protein": 15, "fat": 10 },
      { "meal": "lunch", "name": "...", "calories": 700, "carbs": 90, "protein": 30, "fat": 15 },
      { "meal": "snacks", "name": "...", "calories": 200, "carbs": 30, "protein": 5, "fat": 5 },
      { "meal": "dinner", "name": "...", "calories": 600, "carbs": 70, "protein": 25, "fat": 15 }
    ]
  }
]`;

  return `Generate a structured 7-day personalized diet plan for a user with the following profile:

${profileSection}
${medicalSection ? '\n' + medicalSection : ''}
${wearableSection ? '\n' + wearableSection : ''}

${rulesSection}

Return ONLY raw valid JSON matching this schema for all 7 days (Monday through Sunday). Do not include markdown code block formatting.

Example structure:
${exampleStructure}`;
}

function buildSingleDayPrompt({ dayName, user, reportData, wearableData, goalText, cuisines = [], customCuisine = '', dietPreferences = [], customDietPreference = '', customNotes = '' }) {
  const profileSection = `
=== PERSONAL HEALTH PROFILE ===
- Target Calories: ${user.dailyCalorieTarget} kcal
- Fitness Goal: ${goalText}
${user.medicalConditions?.length ? `- Medical Conditions: ${user.medicalConditions.join(', ')}` : ''}
${user.allergies?.length ? `- Allergies: ${user.allergies.join(', ')}` : ''}`.trim();

  const baseRules = [
    `Generate exactly 4 distinct, balanced meals for ${dayName}: breakfast, lunch, snacks, dinner.`,
    `Keep the day's total calories within ±50 kcal of the target (${user.dailyCalorieTarget} kcal).`,
    `Avoid user allergens.`,
  ];

  const prefRules = formatPreferences({ cuisines, customCuisine, dietPreferences, customDietPreference, customNotes });
  const allRules = [...baseRules, ...prefRules];
  const rulesSection = allRules.map((r, i) => `${i + 1}. ${r}`).join('\n');

  return `Generate a fresh single-day meal plan for "${dayName}" for this user:
${profileSection}

=== INSTRUCTIONS ===
${rulesSection}

Return ONLY raw valid JSON matching this schema:
{
  "day": "${dayName}",
  "meals": [
    { "meal": "breakfast", "name": "...", "calories": 400, "carbs": 45, "protein": 15, "fat": 10 },
    { "meal": "lunch", "name": "...", "calories": 700, "carbs": 80, "protein": 30, "fat": 15 },
    { "meal": "snacks", "name": "...", "calories": 200, "carbs": 25, "protein": 5, "fat": 5 },
    { "meal": "dinner", "name": "...", "calories": 600, "carbs": 65, "protein": 25, "fat": 12 }
  ]
}
Do not include markdown code block characters.`;
}

function buildSingleMealPrompt({ mealType, targetCalories, user, reportData, currentMealName, cuisines = [], customCuisine = '', dietPreferences = [], customDietPreference = '', customNotes = '' }) {
  const baseRules = [
    `Generate a completely NEW, fresh alternative dish for "${mealType}".`,
    `Target calories for this meal: approximately ${targetCalories} kcal (±40 kcal).`,
    `Do NOT return the current dish name "${currentMealName}" — provide a brand new alternative.`,
  ];

  if (user.allergies?.length) {
    baseRules.push(`Avoid user allergies: ${user.allergies.join(', ')}`);
  }

  const prefRules = formatPreferences({ cuisines, customCuisine, dietPreferences, customDietPreference, customNotes });
  const allRules = [...baseRules, ...prefRules];
  const rulesSection = allRules.map((r, i) => `${i + 1}. ${r}`).join('\n');

  return `Generate a single fresh alternative meal item for ${mealType}:

=== INSTRUCTIONS ===
${rulesSection}

Return ONLY raw valid JSON matching this schema:
{
  "meal": "${mealType}",
  "name": "Fresh Alternative Dish Name",
  "calories": ${targetCalories},
  "carbs": 45,
  "protein": 25,
  "fat": 12
}
Do not include markdown code block characters.`;
}

// ─── Helper: Build human-readable labels ─────────────────────────────────────
function getGoalText(goal) {
  if (goal === 'lose_weight') return 'Weight Loss';
  if (goal === 'gain_muscle') return 'Muscle Gain';
  return 'Weight Maintenance';
}

function getGoalLabel(goal) {
  if (goal === 'lose_weight') return 'Lose Weight 📉';
  if (goal === 'gain_muscle') return 'Gain Muscle 💪';
  return 'Maintain Weight ⚖️';
}

function getActivityLabel(level) {
  const map = {
    sedentary: 'Sedentary',
    lightly_active: 'Lightly Active',
    moderately_active: 'Moderately Active',
    very_active: 'Very Active',
  };
  return map[level] || 'Sedentary';
}

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/diet-plans/generation-context
// Returns a preview of all data sources that will be used for generation
// so the frontend can display the Data Sources Panel without generating a plan
// ─────────────────────────────────────────────────────────────────────────────
const getGenerationContext = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check profile completeness (all core fields must be present)
    const isProfileComplete = !!(user.age && user.weight && user.height && user.goal);

    // Calculate TDEE for preview (but don't save yet)
    const calculatedTarget = computeTDEE(user);

    // Fetch and merge all medical reports
    const allReports = await MedicalReport.find({ user: user._id }).sort({ createdAt: -1 });
    const mergedReport = mergeMedicalReports(allReports);

    // Fetch most recent wearable/progress log
    const latestProgress = await Progress.findOne({ user: user._id }).sort({ date: -1 });

    res.json({
      profile: {
        isComplete: isProfileComplete,
        age: user.age,
        weight: user.weight,
        height: user.height,
        gender: user.gender,
        activityLevel: user.activityLevel,
        activityLabel: getActivityLabel(user.activityLevel),
        goal: user.goal,
        goalLabel: getGoalLabel(user.goal),
        calculatedTarget,
        medicalConditions: user.medicalConditions,
        allergies: user.allergies,
      },
      medicalReport: mergedReport
        ? { available: true, ...mergedReport }
        : { available: false },
      wearable: latestProgress && (latestProgress.steps > 0 || latestProgress.caloriesBurned > 0)
        ? {
          available: true,
          steps: latestProgress.steps,
          caloriesBurned: latestProgress.caloriesBurned,
          date: latestProgress.date,
        }
        : { available: false },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/diet-plans/generate
// Main generation endpoint: merges all data sources, calls Gemini, saves to DB
// ─────────────────────────────────────────────────────────────────────────────
const generateDietPlan = async (req, res) => {
  try {
    const {
      cuisines = [],
      customCuisine = '',
      dietPreferences = [],
      customDietPreference = '',
      customNotes = '',
    } = req.body || {};
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 1. Deactivate all previously active plans for this user
    await DietPlan.updateMany({ user: user._id, isActive: true }, { isActive: false });

    // 2. Auto-calculate TDEE and persist it back to the User document
    const calculatedCalorieTarget = computeTDEE(user);
    user.dailyCalorieTarget = calculatedCalorieTarget;
    await user.save();

    // 3. Fetch and merge all medical reports (optional data source)
    const allReports = await MedicalReport.find({ user: user._id }).sort({ createdAt: -1 });
    const reportData = mergeMedicalReports(allReports); // null if none exist

    // 4. Fetch most recent wearable/progress log (optional data source)
    const latestProgress = await Progress.findOne({ user: user._id }).sort({ date: -1 });
    const wearableData =
      latestProgress && (latestProgress.steps > 0 || latestProgress.caloriesBurned > 0)
        ? {
          steps: latestProgress.steps,
          caloriesBurned: latestProgress.caloriesBurned,
          date: latestProgress.date,
        }
        : null; // null means wearable section is skipped in the prompt

    // 5. Build the multi-source prompt
    const prompt = buildDietPlanPrompt({
      user,
      reportData,
      wearableData,
      goalText: getGoalText(user.goal),
      cuisines,
      customCuisine,
      dietPreferences,
      customDietPreference,
      customNotes,
    });

    // 6. Call Gemini API and parse the JSON response
    const rawResponse = await generateText(prompt);
    const parsedPlan = parseJSONResponse(rawResponse);

    // 7. Compute totalCalories per day
    const planDays = parsedPlan.map((dayData) => {
      const totalCalories = dayData.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      return {
        day: dayData.day,
        meals: dayData.meals,
        totalCalories,
      };
    });

    // 8. Persist the new active diet plan to MongoDB
    const dietPlan = await DietPlan.create({
      user: user._id,
      weekStartDate: new Date(),
      plan: planDays,
      isActive: true,
    });

    // Send plan generation confirmation email asynchronously if preferences allow
    if (user.notifications?.weeklyPlanReset) {
      const subject = `Your Personalized Diet Plan is Ready! 🥗`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">🥗 Custom Diet Plan Generated</h2>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">Your personalized 7-day diet plan has been generated by Gemini AI according to your goals and metrics.</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6;">You can check it out on your Calorify Dashboard now!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="http://localhost:5173/diet-plan" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px rgba(16,185,129,0.2);">View Diet Plan</a>
          </div>
          <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px; margin-top: 20px;">You can manage your notification preferences anytime from your Profile settings page.</p>
          <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br/><strong>The Calorify Team</strong></p>
        </div>
      `;
      sendEmail(user.email, subject, html).catch(err => console.log('Error sending plan generation email:', err.message));
    }

    res.status(201).json(dietPlan);
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to generate diet plan';
    console.error('Diet plan generation error:', errorMsg);
    res.status(500).json({ message: errorMsg });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/diet-plans/regenerate-day
// Regenerates only a single day in the active plan
// ─────────────────────────────────────────────────────────────────────────────
const regenerateDay = async (req, res) => {
  try {
    const {
      dayIndex = 0,
      cuisines = [],
      customCuisine = '',
      dietPreferences = [],
      customDietPreference = '',
      customNotes = '',
    } = req.body || {};
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });

    if (dayIndex < 0 || dayIndex >= plan.plan.length) {
      return res.status(400).json({ message: 'Invalid day index' });
    }

    const targetDay = plan.plan[dayIndex];
    const user = await User.findById(req.user.id);
    const allReports = await MedicalReport.find({ user: user._id }).sort({ createdAt: -1 });
    const reportData = mergeMedicalReports(allReports);
    const latestProgress = await Progress.findOne({ user: user._id }).sort({ date: -1 });
    const wearableData =
      latestProgress && (latestProgress.steps > 0 || latestProgress.caloriesBurned > 0)
        ? { steps: latestProgress.steps, caloriesBurned: latestProgress.caloriesBurned, date: latestProgress.date }
        : null;

    const prompt = buildSingleDayPrompt({
      dayName: targetDay.day,
      user,
      reportData,
      wearableData,
      goalText: getGoalText(user.goal),
      cuisines,
      customCuisine,
      dietPreferences,
      customDietPreference,
      customNotes,
    });

    const rawResponse = await generateText(prompt);
    const parsedDay = parseJSONResponse(rawResponse);

    // Update target day in the active plan
    targetDay.meals = parsedDay.meals;
    targetDay.totalCalories = parsedDay.meals.reduce((sum, m) => sum + (m.calories || 0), 0);

    plan.markModified('plan');
    await plan.save();

    // Mark the shopping list as outdated (non-conflicting — runs after save)
    await DietPlan.updateOne({ _id: plan._id }, { $set: { shoppingListUpToDate: false } });

    res.json(plan);
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to regenerate day';
    console.error('Regenerate day error:', errorMsg);
    res.status(500).json({ message: errorMsg });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/diet-plans/regenerate-meal
// Regenerates a single meal slot in the active plan
// ─────────────────────────────────────────────────────────────────────────────
const regenerateMeal = async (req, res) => {
  try {
    const {
      mealId,
      cuisines = [],
      customCuisine = '',
      dietPreferences = [],
      customDietPreference = '',
      customNotes = '',
    } = req.body || {};
    if (!mealId) return res.status(400).json({ message: 'mealId is required' });

    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });

    let targetMeal = null;
    let targetDay = null;

    for (const day of plan.plan) {
      const meal = day.meals.find((m) => m._id?.toString() === mealId.toString());
      if (meal) {
        targetMeal = meal;
        targetDay = day;
        break;
      }
    }

    if (!targetMeal) {
      return res.status(404).json({ message: 'Meal not found in active diet plan' });
    }

    const user = await User.findById(req.user.id);
    const allReports = await MedicalReport.find({ user: user._id }).sort({ createdAt: -1 });
    const reportData = mergeMedicalReports(allReports);

    const prompt = buildSingleMealPrompt({
      mealType: targetMeal.meal,
      targetCalories: targetMeal.calories || Math.round(user.dailyCalorieTarget / 4),
      user,
      reportData,
      currentMealName: targetMeal.name,
      cuisines,
      customCuisine,
      dietPreferences,
      customDietPreference,
      customNotes,
    });

    const rawResponse = await generateText(prompt);
    const newMealData = parseJSONResponse(rawResponse);

    targetMeal.name = newMealData.name;
    targetMeal.calories = newMealData.calories;
    targetMeal.carbs = newMealData.carbs;
    targetMeal.protein = newMealData.protein;
    targetMeal.fat = newMealData.fat;
    targetMeal.recipe = null; // Clear cached recipe so new recipe can be generated

    targetDay.totalCalories = targetDay.meals.reduce((sum, m) => sum + (m.calories || 0), 0);

    plan.markModified('plan');
    await plan.save();

    // Mark the shopping list as outdated (non-conflicting — runs after save)
    await DietPlan.updateOne({ _id: plan._id }, { $set: { shoppingListUpToDate: false } });

    res.json(plan);
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Failed to regenerate meal';
    console.error('Regenerate meal error:', errorMsg);
    res.status(500).json({ message: errorMsg });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/diet-plans/active
// Returns the current user's active diet plan
// ─────────────────────────────────────────────────────────────────────────────
const getActivePlan = async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  GET /api/diet-plans/:id/recipe
// Generates or fetches cached recipe + trivia for a specific meal
// ─────────────────────────────────────────────────────────────────────────────
const generateRecipe = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });

    let targetMeal = null;
    for (const day of plan.plan) {
      const meal = day.meals.find((m) => m._id?.toString() === id.toString());
      if (meal) {
        targetMeal = meal;
        break;
      }
    }

    if (!targetMeal) {
      return res.status(404).json({ message: 'Meal not found in active diet plan' });
    }

    // Return cached recipe if already generated
    if (targetMeal.recipe) {
      try {
        const parsed = JSON.parse(targetMeal.recipe);
        return res.json({ mealName: targetMeal.name, ...parsed });
      } catch (e) { /* fall through to regenerate */ }
    }

    const prompt = `
Generate a detailed recipe, accurate and realistic nutritional values, and 2-3 localized health, nutritional, or historical facts (trivia) for the Bangladeshi food item "${targetMeal.name}".
The food item is planned for ${targetMeal.meal}.

Provide the response in the following JSON format. Make sure to calculate the REALISTIC and ACCURATE nutritional values per serving and specify the servings count. DO NOT force the calories to hit an arbitrary target:
{
  "servings": 2,
  "calories_per_serving": 329,
  "carbs_per_serving": 9,
  "protein_per_serving": 17,
  "fat_per_serving": 24,
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2"],
  "trivia": ["fact 1 about ingredients in a Bangladeshi diet", "fact 2 about ingredients..."]
}

Return ONLY valid raw JSON. Do not include markdown code block characters like \`\`\`json.
`;

    const rawResponse = await generateText(prompt);
    const parsedData = parseJSONResponse(rawResponse);

    parsedData.image_url = await generateDishImageURL(targetMeal.name);

    targetMeal.recipe = JSON.stringify(parsedData);
    await plan.save();

    res.json({ mealName: targetMeal.name, ...parsedData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  POST /api/diet-plans/generate-direct
// Generates a recipe directly by food name (used by Recipe Generator page)
// ─────────────────────────────────────────────────────────────────────────────
const generateRecipeDirectly = async (req, res) => {
  try {
    const { name, meal = 'Lunch', calories = 500 } = req.body;
    if (!name) return res.status(400).json({ message: 'Food name is required' });

    const prompt = `
Generate a detailed recipe, accurate and realistic nutritional values, and 2-3 localized health, nutritional, or historical facts (trivia) for the Bangladeshi food item "${name}".
The food item is planned for ${meal}.

Provide the response in the following JSON format. Make sure to calculate the REALISTIC and ACCURATE nutritional values per serving and specify the servings count. DO NOT force the calories to hit an arbitrary target:
{
  "servings": 2,
  "calories_per_serving": 250,
  "carbs_per_serving": 27,
  "protein_per_serving": 12,
  "fat_per_serving": 9,
  "ingredients": ["1 unit food item", "2 units ingredient"],
  "instructions": ["step 1", "step 2"],
  "trivia": ["fact 1 about ingredients in a Bangladeshi diet", "fact 2 about ingredients..."]
}

Return ONLY valid raw JSON. Do not include markdown code block characters like \`\`\`json.
`;

    const rawResponse = await generateText(prompt);
    const parsedData = parseJSONResponse(rawResponse);

    parsedData.image_url = await generateDishImageURL(name);

    res.json({ mealName: name, calories, ...parsedData });
  } catch (error) {
    console.error('Gemini API Error in generateRecipeDirectly:', error);
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/diet-plans/active
// Deletes the active diet plan for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
const deleteActivePlan = async (req, res) => {
  try {
    const deleted = await DietPlan.findOneAndDelete({ user: req.user.id, isActive: true });
    if (!deleted) {
      return res.status(404).json({ message: 'No active diet plan found to delete' });
    }
    res.json({ success: true, message: 'Active diet plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// @route  DELETE /api/diet-plans/:id
// Deletes a specific diet plan by ID
// ─────────────────────────────────────────────────────────────────────────────
const deletePlan = async (req, res) => {
  try {
    const deleted = await DietPlan.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!deleted) {
      return res.status(404).json({ message: 'Diet plan not found' });
    }
    res.json({ success: true, message: 'Diet plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateDietPlan,
  regenerateDay,
  regenerateMeal,
  getActivePlan,
  generateRecipe,
  generateRecipeDirectly,
  getGenerationContext,
  deleteActivePlan,
  deletePlan,
};
