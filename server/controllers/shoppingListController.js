const DietPlan = require('../models/DietPlan');
const { generateText, parseJSONResponse } = require('../services/geminiService');

// ─── Helper: Build the single batch Gemini prompt ────────────────────────────
// All meal names for the full week batched into one call.
function buildShoppingListPrompt(mealNames) {
  return `You are a culinary assistant helping generate a weekly grocery shopping list for a Bangladeshi household.

Below is the complete list of all meals from a 7-day personalized meal plan (2 servings per meal):
${mealNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}

Your task:
1. Identify ALL raw ingredients needed to cook every dish listed above.
2. Consolidate duplicate ingredients across dishes (e.g. if multiple dishes use onion, list it once with a combined quantity).
3. Provide a realistic combined quantity for 2 servings per dish (e.g. "700g", "3 cups", "6 pieces").
4. Group ingredients into these exact category names: Proteins, Vegetables, Grains & Legumes, Dairy & Eggs, Spices & Condiments, Oils & Fats, Fruits, Other.
5. Only include categories that have at least one item. Skip empty categories.

Return ONLY valid raw JSON in this exact schema. Do not include markdown code blocks or any extra text:
{
  "categories": [
    {
      "name": "Proteins",
      "items": [
        { "name": "Hilsa Fish", "quantity": "600g" },
        { "name": "Chicken Breast", "quantity": "800g" }
      ]
    },
    {
      "name": "Vegetables",
      "items": [
        { "name": "Onion", "quantity": "1kg" }
      ]
    }
  ]
}`;
}

// ─── GET /api/shopping-list ──────────────────────────────────────────────────
// Three cases:
//   1. upToDate=true  + cached list  → return immediately (no Gemini call)
//   2. upToDate=false + cached list  → return stale list with upToDate: false flag
//   3. upToDate=false + no list      → auto-generate via single Gemini call, set upToDate: true
const getShoppingList = async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) {
      return res.status(404).json({
        message: 'No active diet plan found. Please generate a diet plan first.',
      });
    }

    // Case 1: Up to date and cached — serve instantly
    if (plan.shoppingListUpToDate && plan.shoppingList) {
      try {
        const cached = JSON.parse(plan.shoppingList);
        return res.json({
          upToDate: true,
          planId: plan._id,
          checkedItems: plan.checkedItems || [],
          ...cached,
        });
      } catch (e) {
        // Cache corrupt — fall through to regenerate
        console.warn('Shopping list cache corrupt, regenerating...');
      }
    }

    // Case 2: Stale but has an old list — return it with upToDate: false so
    // the frontend can show the outdated warning. Do NOT auto-regenerate.
    if (!plan.shoppingListUpToDate && plan.shoppingList) {
      try {
        const stale = JSON.parse(plan.shoppingList);
        return res.json({
          upToDate: false,
          planId: plan._id,
          checkedItems: plan.checkedItems || [],
          ...stale,
        });
      } catch (e) {
        // Stale cache also corrupt — fall through to regenerate
        console.warn('Stale shopping list cache corrupt, regenerating...');
      }
    }

    // Case 3: No list at all — auto-generate with a single Gemini batch call
    const mealNames = [];
    for (const day of plan.plan) {
      for (const meal of day.meals) {
        if (meal.name) mealNames.push(meal.name);
      }
    }

    if (mealNames.length === 0) {
      return res.status(400).json({
        message: 'Diet plan has no meals. Please regenerate your diet plan.',
      });
    }

    const prompt = buildShoppingListPrompt(mealNames);
    const rawResponse = await generateText(prompt);
    const parsedData = parseJSONResponse(rawResponse);

    // Persist to DB: cache the list and mark it as up to date
    plan.shoppingList = JSON.stringify(parsedData);
    plan.shoppingListUpToDate = true;
    plan.checkedItems = [];
    plan.markModified('shoppingList');
    plan.markModified('checkedItems');
    await plan.save();

    res.json({
      upToDate: true,
      planId: plan._id,
      checkedItems: [],
      ...parsedData,
    });
  } catch (error) {
    const errorMsg = error.response?.data?.error?.message || error.message;
    console.error('Shopping list error:', errorMsg);
    res.status(500).json({ message: errorMsg });
  }
};

// ─── DELETE /api/shopping-list/cache ────────────────────────────────────────
// Called by the "Refresh List" button — clears the cached list so the next
// GET triggers a fresh Gemini call and marks the result as up to date.
const clearShoppingListCache = async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });

    plan.shoppingList = null;
    plan.shoppingListUpToDate = false;
    plan.checkedItems = [];
    await plan.save();

    res.json({ message: 'Shopping list cache cleared. Refresh to regenerate.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── PATCH /api/shopping-list/check ─────────────────────────────────────────
// Toggles a single item's checked state in the DB.
// Body: { key: "CategoryName|itemName" }
const toggleCheckedItem = async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) return res.status(400).json({ message: 'key is required' });

    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });

    const idx = plan.checkedItems.indexOf(key);
    if (idx === -1) {
      plan.checkedItems.push(key);
    } else {
      plan.checkedItems.splice(idx, 1);
    }

    plan.markModified('checkedItems');
    await plan.save();

    res.json({ checkedItems: plan.checkedItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── DELETE /api/shopping-list/check ────────────────────────────────────────
// Clears all checked items (uncheck all).
const clearAllChecked = async (req, res) => {
  try {
    const plan = await DietPlan.findOne({ user: req.user.id, isActive: true });
    if (!plan) return res.status(404).json({ message: 'No active diet plan found' });

    plan.checkedItems = [];
    plan.markModified('checkedItems');
    await plan.save();

    res.json({ checkedItems: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getShoppingList,
  clearShoppingListCache,
  toggleCheckedItem,
  clearAllChecked,
};
