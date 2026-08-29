const { generateText } = require('./geminiService');

/**
 * Generate personalized monthly suggestions and health score using Gemini API
 * with a resilient clinical rule-based fallback.
 *
 * @param {object} user - User document/profile
 * @param {object} reportData - Compiled monthly metrics
 * @returns {Promise<object>} Personalized suggestions object
 */
const generateMonthlyAiSuggestions = async (user, reportData) => {
  const { summary, nutrients, weightTrend, adherence, month } = reportData;

  const prompt = `
You are a senior clinical nutritionist and health analytics AI for Calorify (an AI-powered nutrition platform tailored for Bangladesh).
Analyze the following user's completed monthly health data for ${month} and generate personalized, structured health suggestions.

USER PROFILE:
- Name: ${user.name || 'User'}
- Age: ${user.age || 'Not specified'}
- Gender: ${user.gender || 'Not specified'}
- Height: ${user.height ? `${user.height} cm` : 'Not specified'}
- Starting Weight: ${weightTrend.startingWeight} kg | Ending Weight: ${weightTrend.endingWeight} kg (Change: ${weightTrend.weightChange > 0 ? '+' : ''}${weightTrend.weightChange} kg)
- BMI: Starting ${weightTrend.startingBMI || 'N/A'}, Ending ${weightTrend.endingBMI || 'N/A'} (${weightTrend.bmiCategory})
- Primary Health Goal: ${user.goal || 'maintain'} (options: lose_weight, gain_muscle, maintain)
- Daily Calorie Target: ${summary.dailyCalorieTarget} kcal
- Medical Conditions: ${user.medicalConditions && user.medicalConditions.length > 0 ? user.medicalConditions.join(', ') : 'None reported'}
- Allergies: ${user.allergies && user.allergies.length > 0 ? user.allergies.join(', ') : 'None reported'}

MONTHLY PERFORMANCE STATS:
- Total Logged Days: ${summary.totalLoggedDays} days
- Average Daily Calorie Intake: ${summary.averageDailyCalories} kcal/day (Target: ${summary.dailyCalorieTarget} kcal/day)
- Total Calories Burned (Active): ${summary.totalCaloriesBurned} kcal (Avg Daily Steps: ${summary.averageDailySteps})
- Average Daily Nutrients:
  * Carbs: ${nutrients.averageCarbs}g (${nutrients.carbsPercentage}% of total calories)
  * Protein: ${nutrients.averageProtein}g (${nutrients.proteinPercentage}% of total calories)
  * Fat: ${nutrients.averageFat}g (${nutrients.fatPercentage}% of total calories)
- Plan Adherence Rate: ${adherence.adherencePercentage}% (${adherence.adherentDays} adherent days)
- Longest Adherence Streak: ${adherence.longestStreak} days (Ending Streak: ${adherence.endingStreak} days)

REQUIREMENTS:
1. Provide a numerical Health Score (1 to 100) and Letter Grade (A+, A, B, C, or D) reflecting consistency, macro balance, and goal alignment.
2. Formulate 2-3 specific strengths/achievements from this month.
3. Formulate 2-3 specific areas for improvement or potential health risks (e.g. low protein, high fat/sugar, inactivity, irregular calorie intake).
4. Formulate 3-4 actionable dietary suggestions incorporating healthy localized Bangladeshi foods (e.g., lentils/dal, Rui/Katla/Ilish fish, Telapia/Pangash, Deshi chicken, egg whites, red rice/Lal chal, green leafy vegetables/Shak like Pui/Lal shak, seasonal fruits like Guava/Payra, Papaya, minimal mustard oil).
5. Formulate 2-3 lifestyle and fitness recommendations (e.g., step targets, hydration, sleep, active burn).
6. Formulate 2 concrete, measurable target goals for next month.

Respond ONLY with a valid JSON object in this exact schema, without markdown formatting or code fences:
{
  "healthScore": 88,
  "healthGrade": "A",
  "overallEvaluation": "Detailed 2-3 sentence overview evaluating the user's monthly nutrition and consistency.",
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "improvements": [
    "Area for improvement 1",
    "Area for improvement 2"
  ],
  "dietaryAdvice": [
    "Dietary tip 1",
    "Dietary tip 2",
    "Dietary tip 3"
  ],
  "lifestyleAdvice": [
    "Lifestyle tip 1",
    "Lifestyle tip 2"
  ],
  "nextMonthGoals": [
    "Goal 1",
    "Goal 2"
  ]
}
`;

  try {
    const rawResponse = await generateText(prompt);
    // Clean up potential markdown code fences like ```json ... ```
    const cleaned = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed.healthScore === 'number' && parsed.overallEvaluation) {
      return {
        healthScore: Math.max(1, Math.min(100, Math.round(parsed.healthScore))),
        healthGrade: parsed.healthGrade || getGradeFromScore(parsed.healthScore),
        overallEvaluation: parsed.overallEvaluation,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
        dietaryAdvice: Array.isArray(parsed.dietaryAdvice) ? parsed.dietaryAdvice : [],
        lifestyleAdvice: Array.isArray(parsed.lifestyleAdvice) ? parsed.lifestyleAdvice : [],
        nextMonthGoals: Array.isArray(parsed.nextMonthGoals) ? parsed.nextMonthGoals : [],
      };
    }
  } catch (error) {
    console.warn('[reportAiService] Gemini API generation failed or returned invalid JSON, using fallback engine:', error.message);
  }

  // Resilient deterministic fallback engine
  return generateDeterministicSuggestions(user, reportData);
};

const getGradeFromScore = (score) => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  return 'D';
};

/**
 * Deterministic rule-based suggestions engine based on clinical nutrition principles.
 */
const generateDeterministicSuggestions = (user, reportData) => {
  const { summary, nutrients, weightTrend, adherence } = reportData;
  const goal = user.goal || 'maintain';
  const targetCals = summary.dailyCalorieTarget || 2000;
  const avgCals = summary.averageDailyCalories || targetCals;
  const calDiff = avgCals - targetCals;
  const adherencePct = adherence.adherencePercentage || 0;
  const proteinPct = nutrients.proteinPercentage || 0;

  // Calculate score
  let score = 70;
  if (adherencePct >= 80) score += 15;
  else if (adherencePct >= 60) score += 10;
  else if (adherencePct < 40) score -= 10;

  if (Math.abs(calDiff) <= 150) score += 10;
  else if (Math.abs(calDiff) > 400) score -= 10;

  if (proteinPct >= 20) score += 5;
  if (summary.totalLoggedDays >= 20) score += 5;

  score = Math.max(45, Math.min(98, score));
  const healthGrade = getGradeFromScore(score);

  const strengths = [];
  const improvements = [];
  const dietaryAdvice = [];
  const lifestyleAdvice = [];
  const nextMonthGoals = [];

  // Strengths
  if (adherencePct >= 70) {
    strengths.push(`Impressive plan adherence of ${adherencePct}%, demonstrating strong daily discipline.`);
  } else {
    strengths.push(`Successfully logged ${summary.totalLoggedDays} active tracking days this month.`);
  }

  if (adherence.longestStreak >= 5) {
    strengths.push(`Achieved a commendable ${adherence.longestStreak}-day consecutive adherence streak.`);
  }

  if (goal === 'lose_weight' && weightTrend.weightChange < 0) {
    strengths.push(`Maintained a healthy calorie deficit resulting in a ${Math.abs(weightTrend.weightChange)} kg weight reduction.`);
  } else if (goal === 'gain_muscle' && weightTrend.weightChange > 0) {
    strengths.push(`Successfully sustained a caloric surplus with a ${weightTrend.weightChange} kg weight gain for muscle building.`);
  } else if (Math.abs(weightTrend.weightChange) <= 0.5) {
    strengths.push(`Demonstrated steady metabolic equilibrium with stable weight maintenance.`);
  }

  // Improvements
  if (adherencePct < 65) {
    improvements.push(`Adherence dropped on non-routine days; focus on meal prep over weekends.`);
  }
  if (proteinPct < 18) {
    improvements.push(`Average protein contribution (${proteinPct}%) is below the recommended 20-30% threshold for optimal muscle recovery.`);
  }
  if (calDiff > 250 && goal === 'lose_weight') {
    improvements.push(`Average calorie intake exceeded your weight-loss target by ~${Math.round(calDiff)} kcal/day.`);
  } else if (calDiff < -300 && goal === 'gain_muscle') {
    improvements.push(`Calorie intake was under target by ~${Math.abs(Math.round(calDiff))} kcal/day, slowing muscle hypertrophy.`);
  }
  if (summary.averageDailySteps < 6000) {
    improvements.push(`Average daily physical activity (${summary.averageDailySteps.toLocaleString()} steps) can be elevated to boost active burn.`);
  }

  // Dietary Advice (Bangladeshi cuisine contextualized)
  if (proteinPct < 20) {
    dietaryAdvice.push(`Incorporate more protein-dense Bengali staples: whole boiled eggs, Chola/chickpea salad, grilled Rui/Katla fish, and thick Tok Dal.`);
  } else {
    dietaryAdvice.push(`Maintain your balanced protein intake with fresh Deshi chicken breast, lentils, and steamed fish curry.`);
  }

  if (nutrients.carbsPercentage > 55) {
    dietaryAdvice.push(`Substitute refined white rice with fiber-rich Lal Chal (brown rice) or whole wheat Ata ruti to stabilize post-meal glucose.`);
  } else {
    dietaryAdvice.push(`Pair complex carbohydrates with colorful seasonal vegetables like Pui Shak, Dheki Shak, and gourd for rich micronutrient bioavailability.`);
  }

  dietaryAdvice.push(`Control cooking oil portions to no more than 2-3 teaspoons of cold-pressed mustard oil or soybean oil per meal.`);
  dietaryAdvice.push(`Snack on local antioxidant-rich fruits such as fresh Guava (Payra), Green Apple, or Papaya instead of processed snacks.`);

  // Lifestyle Advice
  lifestyleAdvice.push(`Aim for at least 8,000 daily steps and 2.5 to 3 liters of water intake throughout the day.`);
  lifestyleAdvice.push(`Prioritize 7-8 hours of restful sleep to optimize cortisol regulation and metabolic recovery.`);

  // Next Month Goals
  nextMonthGoals.push(`Achieve at least 80% meal plan adherence and extend your longest streak to 10+ consecutive days.`);
  nextMonthGoals.push(
    goal === 'lose_weight'
      ? `Maintain a steady 300-500 kcal daily deficit targeting 1.5 - 2.0 kg progressive fat loss next month.`
      : goal === 'gain_muscle'
      ? `Hit 1.6g of protein per kg of body weight daily to support lean hypertrophy.`
      : `Keep daily caloric intake within ±100 kcal of your ${targetCals} kcal maintenance target.`
  );

  const overallEvaluation = `This month you achieved a Health Score of ${score}/100 (${healthGrade}). You logged ${summary.totalLoggedDays} days with an average daily intake of ${avgCals} kcal against your ${targetCals} kcal target. Your weight shifted from ${weightTrend.startingWeight} kg to ${weightTrend.endingWeight} kg (${weightTrend.weightChange >= 0 ? '+' : ''}${weightTrend.weightChange} kg). With continuous logging and strategic macronutrient balancing, you are well-positioned to hit your next milestones.`;

  return {
    healthScore: score,
    healthGrade,
    overallEvaluation,
    strengths,
    improvements,
    dietaryAdvice,
    lifestyleAdvice,
    nextMonthGoals,
  };
};

module.exports = { generateMonthlyAiSuggestions };
