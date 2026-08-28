// Calorie Counting API service — powered by Gemini Vision API
// Member responsibility: Jarin Tasnim Dia

const { generateWithFile } = require('./geminiService');

const CALORIE_ESTIMATION_PROMPT = `You are a professional nutritionist AI specialized in Bangladeshi and South Asian cuisine.
Analyze this meal photo carefully. Identify all visible food items and estimate their portion sizes.
Then return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "foodName": "comma-separated list of all detected food items",
  "calories": <total estimated calories as integer>,
  "carbs": <total carbohydrates in grams as integer>,
  "protein": <total protein in grams as integer>,
  "fat": <total fat in grams as integer>,
  "confidence": "high or medium or low",
  "breakdown": [
    { "item": "food item name", "calories": <integer>, "portionEstimate": "e.g. 1 cup or 150g" }
  ]
}
Base your estimates on typical South Asian/Bangladeshi serving sizes where applicable.
Return ONLY the JSON object.`;

/**
 * Estimate calories and macronutrients from an image using Gemini Vision API.
 * @param {Buffer} imageBuffer - Raw image buffer from Multer memory storage
 * @param {string} mimeType    - e.g. 'image/jpeg' or 'image/png'
 * @returns {Promise<{ foodName, calories, carbs, protein, fat, confidence, breakdown }>}
 */
const estimateCaloriesFromImage = async (imageBuffer, mimeType) => {
  const rawText = await generateWithFile(CALORIE_ESTIMATION_PROMPT, imageBuffer, mimeType);

  // Strip any markdown code fences Gemini might wrap around the JSON
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${rawText.slice(0, 200)}`);
  }

  return {
    foodName:   String(parsed.foodName   || 'Unknown food'),
    calories:   parseInt(parsed.calories  ?? 0, 10),
    carbs:      parseInt(parsed.carbs     ?? 0, 10),
    protein:    parseInt(parsed.protein   ?? 0, 10),
    fat:        parseInt(parsed.fat       ?? 0, 10),
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    breakdown:  Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
  };
};

/**
 * Estimate calories and macronutrients from a food name string using Gemini text API.
 * @param {string} foodName           - Name of the food (e.g. "Dal Bhat")
 * @param {string} portionDescription - Optional portion hint (e.g. "1 plate")
 * @returns {Promise<{ foodName, calories, carbs, protein, fat, confidence, breakdown }>}
 */
const estimateCaloriesFromText = async (foodName, portionDescription = '') => {
  const { generateText } = require('./geminiService');

  const portionHint = portionDescription ? ` The portion size is: ${portionDescription}.` : '';
  const prompt = `You are a professional nutritionist AI specialized in Bangladeshi and South Asian cuisine.
Estimate the calorie and macronutrient content for: "${foodName}".${portionHint}
Return ONLY a valid JSON object with this exact structure, no markdown, no explanation:
{
  "foodName": "${foodName}",
  "calories": <total estimated calories as integer>,
  "carbs": <total carbohydrates in grams as integer>,
  "protein": <total protein in grams as integer>,
  "fat": <total fat in grams as integer>,
  "confidence": "high or medium or low",
  "breakdown": [
    { "item": "food item name", "calories": <integer>, "portionEstimate": "estimated portion" }
  ]
}
Return ONLY the JSON object.`;

  const rawText = await generateText(prompt);
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${rawText.slice(0, 200)}`);
  }

  return {
    foodName:   String(parsed.foodName   || foodName),
    calories:   parseInt(parsed.calories  ?? 0, 10),
    carbs:      parseInt(parsed.carbs     ?? 0, 10),
    protein:    parseInt(parsed.protein   ?? 0, 10),
    fat:        parseInt(parsed.fat       ?? 0, 10),
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'medium',
    breakdown:  Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
  };
};

module.exports = { estimateCaloriesFromImage, estimateCaloriesFromText };

