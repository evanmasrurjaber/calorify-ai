const DietPlan = require('../models/DietPlan');
const User = require('../models/User');
const MedicalReport = require('../models/MedicalReport');
const Progress = require('../models/Progress');
const { generateText } = require('../services/geminiService');

// ─── Helper: Generate a Pollinations AI food image URL ───────────────────────
function generateDishImageURL(dishName) {
  if (!dishName) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';
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
  const age    = user.age    || 25;  // years

  // Gender constant: male = +5, female = -161, prefer_not_to_say = average (-78)
  const genderConstant =
    user.gender === 'male'   ? 5  :
    user.gender === 'female' ? -161 : -78;

  const bmr        = 10 * weight + 6.25 * height - 5 * age + genderConstant;
  const multiplier = activityMultipliers[user.activityLevel] || 1.2;
  let tdee         = Math.round(bmr * multiplier);

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

// ─── Helper: Build the multi-source Gemini prompt ────────────────────────────
function buildDietPlanPrompt({ user, reportData, wearableData, goalText }) {
  // Section: Health Profile (always present)
  const profileSection = `
=== PERSONAL HEALTH PROFILE ===
- Age: ${user.age || 'Not specified'} years
- Weight: ${user.weight || 'Not specified'} kg
- Height: ${user.height || 'Not specified'} cm
- Gender: ${user.gender || 'Not specified'}
- Activity Level: ${(user.activityLevel || 'sedentary').replace(/_/g, ' ')}
- Daily Calorie Target (TDEE-calculated): ${user.dailyCalorieTarget} kcal
- Fitness Goal: ${goalText}
${user.medicalConditions?.length ? `- Medical Conditions (self-reported): ${user.medicalConditions.join(', ')}` : '- Medical Conditions: None reported'}
${user.allergies?.length ? `- Allergies (self-reported): ${user.allergies.join(', ')}` : '- Allergies: None reported'}`.trim();

  // Section: Medical Reports (optional — only included if reports exist)
  let medicalSection = '';
  if (reportData) {
    const diagStr = reportData.diagnoses?.length ? reportData.diagnoses.join(', ') : 'None on record';
    const hba1cStr = reportData.hba1c != null ? `${reportData.hba1c}%` : 'Not recorded';
    const medAllergyStr = reportData.allergies?.length ? reportData.allergies.join(', ') : 'None on record';
    medicalSection = `
=== MEDICAL REPORT DATA (merged from all uploaded reports) ===
- Confirmed Diagnoses: ${diagStr}
- HbA1c Level: ${hba1cStr}
- Medically Confirmed Allergies: ${medAllergyStr}`.trim();
  }

  // Section: Wearable / Activity Data (optional — only included if a Progress log exists)
  let wearableSection = '';
  if (wearableData) {
    wearableSection = `
=== WEARABLE / ACTIVITY DATA (most recent log) ===
- Daily Steps Recorded: ${wearableData.steps?.toLocaleString() || 0}
- Active Calories Burned: ${wearableData.caloriesBurned || 0} kcal
- Date Recorded: ${wearableData.date ? new Date(wearableData.date).toDateString() : 'Unknown'}`.trim();
  }

  // Assemble rules based on available data
  const rules = [
    `Avoid ALL allergens mentioned across both the health profile and medical report sections.`,
    `Keep each day's total calories within ±75 kcal of the Daily Calorie Target (${user.dailyCalorieTarget} kcal).`,
    `All meals must be authentic Bangladeshi dishes.`,
    `Each day must have exactly 4 meals: breakfast, lunch, snacks, dinner — in that order.`,
  ];
  if (reportData?.hba1c != null && reportData.hba1c > 6.5) {
    rules.push(`IMPORTANT: HbA1c is ${reportData.hba1c}% — generate a diabetic-friendly, low-glycemic index plan. Minimize simple carbohydrates, prioritize high-fiber foods.`);
  }
  if (wearableData?.steps > 10000) {
    rules.push(`User is highly active (${wearableData.steps?.toLocaleString()} steps) — adjust meal timing to support recovery and muscle repair.`);
  }

  const rulesSection = `=== INSTRUCTIONS ===\n${rules.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

  const exampleStructure = `[
  {
    "day": "Monday",
    "meals": [
      { "meal": "breakfast", "name": "Attar Roti with Vegetable Daal", "calories": 400, "carbs": 50, "protein": 15, "fat": 10 },
      { "meal": "lunch", "name": "Plain Rice with Rui Fish Curry & Shak", "calories": 700, "carbs": 90, "protein": 30, "fat": 15 },
      { "meal": "snacks", "name": "Muri Makha (Puffed Rice) & Green Tea", "calories": 200, "carbs": 30, "protein": 5, "fat": 5 },
      { "meal": "dinner", "name": "Chicken Khichuri (Low Oil)", "calories": 600, "carbs": 70, "protein": 25, "fat": 15 }
    ]
  }
]`;

  return `Generate a structured 7-day Bangladeshi diet plan for a user with the following profile:

${profileSection}
${medicalSection ? '\n' + medicalSection : ''}
${wearableSection ? '\n' + wearableSection : ''}

${rulesSection}

Return ONLY raw valid JSON matching this schema for all 7 days (Monday through Sunday). Do not include markdown code block formatting.

Example structure (follow this exactly for all 7 days):
${exampleStructure}`;
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
    });

    // 6. Call Gemini API and parse the JSON response
    const rawResponse = await generateText(prompt);
    const cleanJsonStr = rawResponse.replace(/```json|```/g, '').trim();
    const parsedPlan = JSON.parse(cleanJsonStr);

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

    res.status(201).json(dietPlan);
  } catch (error) {
    console.error('Diet plan generation error:', error);
    res.status(500).json({ message: error.message });
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
      const meal = day.meals.id(id);
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
    const cleanJsonStr = rawResponse.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonStr);

    parsedData.image_url = generateDishImageURL(targetMeal.name);

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
    const cleanJsonStr = rawResponse.replace(/```json|```/g, '').trim();
    const parsedData = JSON.parse(cleanJsonStr);

    parsedData.image_url = generateDishImageURL(name);

    res.json({ mealName: name, calories, ...parsedData });
  } catch (error) {
    console.error('Gemini API Error in generateRecipeDirectly:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  generateDietPlan,
  getActivePlan,
  generateRecipe,
  generateRecipeDirectly,
  getGenerationContext,
};
