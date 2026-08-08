const DietPlan = require('../models/DietPlan');
const User = require('../models/User');
const { generateText } = require('../services/geminiService');


// @route POST /api/diet-plans/generate
function generateDishImageURL(dishName) {
  if (!dishName) return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800';
  // Use Pollinations AI with the highly realistic 'flux' model, driven by the dish name
  const finalPrompt = `Professional close-up food photography of authentic Bangladeshi ${dishName}, showing the main ingredients clearly, 4k, photorealistic, highly detailed, appetizing`;
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=800&height=800&nologo=true&model=flux`;
}

const generateDietPlan = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Deactivate previous active plans
    await DietPlan.updateMany({ user: user._id, isActive: true }, { isActive: false });

    // Generate a 7-day diet plan based on user health profile
    const goalText = user.goal === 'lose_weight' ? 'weight loss' : user.goal === 'gain_muscle' ? 'muscle gain' : 'weight maintenance';
    const medical = user.medicalConditions?.length > 0 ? `Medical conditions: ${user.medicalConditions.join(', ')}` : 'No major medical conditions';
    const allergies = user.allergies?.length > 0 ? `Allergies: ${user.allergies.join(', ')}` : 'No allergies';

    const prompt = `
Generate a structured 7-day Bangladeshi diet plan for a user with the following profile:
- Age: ${user.age || 25}
- Weight: ${user.weight || 70} kg
- Height: ${user.height || 170} cm
- Goal: ${goalText}
- Daily Calorie Target: ${user.dailyCalorieTarget || 2000} kcal
- ${medical}
- ${allergies}

Provide the diet plan in exactly the following JSON structure:
[
  {
    "day": "Monday",
    "meals": [
      { "meal": "breakfast", "name": "Attar Roti with Vegetable Daal", "calories": 400, "carbs": 50, "protein": 15, "fat": 10 },
      { "meal": "lunch", "name": "Plain Rice with Rui Fish Curry & Shak", "calories": 700, "carbs": 90, "protein": 30, "fat": 15 },
      { "meal": "snacks", "name": "Muri Makha (Puffed Rice) & Green Tea", "calories": 200, "carbs": 30, "protein": 5, "fat": 5 },
      { "meal": "dinner", "name": "Chicken Khichuri (Low Oil)", "calories": 600, "carbs": 70, "protein": 25, "fat": 15 }
    ]
  },
  {
    "day": "Tuesday",
    "meals": [
      { "meal": "breakfast", "name": "Oats Khichuri with Egg White", "calories": 380, "carbs": 45, "protein": 18, "fat": 8 },
      { "meal": "lunch", "name": "Plain Rice with Lentil Soup & Bhorta", "calories": 650, "carbs": 85, "protein": 20, "fat": 10 },
      { "meal": "snacks", "name": "Apple slices with Almonds", "calories": 180, "carbs": 25, "protein": 4, "fat": 8 },
      { "meal": "dinner", "name": "Roti with Grilled Chicken & Salad", "calories": 580, "carbs": 55, "protein": 32, "fat": 12 }
    ]
  },
  {
    "day": "Wednesday",
    "meals": [
      { "meal": "breakfast", "name": "Semolina (Halwa) with low sugar & Egg Poach", "calories": 420, "carbs": 55, "protein": 14, "fat": 12 },
      { "meal": "lunch", "name": "Plain Rice with Beef Rezala (lean) & Gourd", "calories": 720, "carbs": 90, "protein": 35, "fat": 18 },
      { "meal": "snacks", "name": "Chana (boiled Chickpeas) salad", "calories": 220, "carbs": 35, "protein": 10, "fat": 4 },
      { "meal": "dinner", "name": "Vegetable Soup with multigrain Roti", "calories": 500, "carbs": 65, "protein": 15, "fat": 8 }
    ]
  },
  {
    "day": "Thursday",
    "meals": [
      { "meal": "breakfast", "name": "Whole wheat bread toast with Peanut Butter", "calories": 360, "carbs": 40, "protein": 12, "fat": 15 },
      { "meal": "lunch", "name": "Plain Rice with Hilsha Fish Curry & Lal Shak", "calories": 680, "carbs": 80, "protein": 28, "fat": 18 },
      { "meal": "snacks", "name": "Singara (low oil) and Tea", "calories": 250, "carbs": 35, "protein": 4, "fat": 10 },
      { "meal": "dinner", "name": "Roti with Mixed Vegetable Curry", "calories": 480, "carbs": 65, "protein": 12, "fat": 8 }
    ]
  },
  {
    "day": "Friday",
    "meals": [
      { "meal": "breakfast", "name": "Attar Roti with Mixed Dal fry", "calories": 390, "carbs": 52, "protein": 14, "fat": 9 },
      { "meal": "lunch", "name": "Bangladeshi style Morog Polao (Light version)", "calories": 800, "carbs": 95, "protein": 35, "fat": 20 },
      { "meal": "snacks", "name": "Guava & Papaya slices", "calories": 120, "carbs": 28, "protein": 2, "fat": 0.5 },
      { "meal": "dinner", "name": "Roti with Rui Fish Curry", "calories": 530, "carbs": 60, "protein": 25, "fat": 12 }
    ]
  },
  {
    "day": "Saturday",
    "meals": [
      { "meal": "breakfast", "name": "Boiled Egg with Brown Bread & Tea", "calories": 340, "carbs": 35, "protein": 15, "fat": 10 },
      { "meal": "lunch", "name": "Plain Rice with Mash Dal & Chicken Curry", "calories": 710, "carbs": 85, "protein": 32, "fat": 15 },
      { "meal": "snacks", "name": "Yogurt (Dahi) with Honey", "calories": 190, "carbs": 25, "protein": 6, "fat": 6 },
      { "meal": "dinner", "name": "Roti with Egg Bhurji & Mixed Salad", "calories": 520, "carbs": 55, "protein": 20, "fat": 14 }
    ]
  },
  {
    "day": "Sunday",
    "meals": [
      { "meal": "breakfast", "name": "Attar Roti with Aloo Bhaji & Egg", "calories": 410, "carbs": 58, "protein": 13, "fat": 11 },
      { "meal": "lunch", "name": "Plain Rice with Pangas Fish & Cabbage curry", "calories": 690, "carbs": 82, "protein": 26, "fat": 16 },
      { "meal": "snacks", "name": "Puffed Rice (Muri) with Chanachur", "calories": 180, "carbs": 28, "protein": 4, "fat": 6 },
      { "meal": "dinner", "name": "Mixed Vegetable Khichuri", "calories": 560, "carbs": 75, "protein": 15, "fat": 12 }
    ]
  }
]

Return ONLY raw valid JSON matching this schema. Do not include markdown code block formatting.
`;

    const rawResponse = await generateText(prompt);
    const cleanJsonStr = rawResponse.replace(/```json|```/g, '').trim();
    const parsedPlan = JSON.parse(cleanJsonStr);

    // Process plan to calculate totalCalories for each day
    const planDays = parsedPlan.map(dayData => {
      const totalCalories = dayData.meals.reduce((sum, m) => sum + (m.calories || 0), 0);
      return {
        day: dayData.day,
        meals: dayData.meals,
        totalCalories
      };
    });

    const dietPlan = await DietPlan.create({
      user: user._id,
      weekStartDate: new Date(),
      plan: planDays,
      isActive: true
    });

    res.status(201).json(dietPlan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/diet-plans/active
const getActivePlan = async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/diet-plans/:id/recipe
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

    if (targetMeal.recipe) {
      try {
        const parsed = JSON.parse(targetMeal.recipe);
        return res.json({ mealName: targetMeal.name, ...parsed });
      } catch (e) {}
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
    console.error("Gemini API Error in generateRecipeDirectly:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { generateDietPlan, getActivePlan, generateRecipe, generateRecipeDirectly };

