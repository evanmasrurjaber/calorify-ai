require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { generateHealthReportPDF } = require('../utils/generatePDF');
const { generateMonthlyAiSuggestions } = require('../services/reportAiService');

async function testPdfGeneration() {
  console.log('Testing PDF Generation & AI Suggestions Engine...');

  const mockUser = {
    _id: '65f123456789abcdef012345',
    name: 'Rahim Ahmed',
    age: 28,
    gender: 'male',
    height: 175,
    weight: 78.5,
    goal: 'lose_weight',
    dailyCalorieTarget: 2100,
    medicalConditions: ['Pre-hypertension'],
    allergies: ['Peanuts'],
  };

  const mockReportData = {
    user: mockUser,
    month: '2026-08',
    startDate: new Date('2026-08-01T00:00:00Z'),
    endDate: new Date('2026-08-31T23:59:59Z'),
    daysInMonth: 31,
    summary: {
      totalCaloriesConsumed: 58900,
      averageDailyCalories: 1963,
      dailyCalorieTarget: 2100,
      calorieAdherenceScore: 87,
      totalCaloriesBurned: 12400,
      averageDailyBurn: 413,
      netCalories: 46500,
      totalSteps: 248000,
      averageDailySteps: 8266,
      totalLoggedDays: 30,
    },
    nutrients: {
      totalCarbs: 6900,
      totalProtein: 3300,
      totalFat: 1950,
      averageCarbs: 230,
      averageProtein: 110,
      averageFat: 65,
      carbsPercentage: 47,
      proteinPercentage: 23,
      fatPercentage: 30,
    },
    weightTrend: {
      startingWeight: 80.2,
      endingWeight: 78.1,
      minWeight: 78.0,
      maxWeight: 80.5,
      weightChange: -2.1,
      startingBMI: 26.2,
      endingBMI: 25.5,
      bmiCategory: 'Overweight',
      entries: [
        { date: new Date('2026-08-01'), weight: 80.2 },
        { date: new Date('2026-08-07'), weight: 79.8 },
        { date: new Date('2026-08-14'), weight: 79.2 },
        { date: new Date('2026-08-21'), weight: 78.6 },
        { date: new Date('2026-08-28'), weight: 78.1 },
      ],
    },
    adherence: {
      adherentDays: 26,
      nonAdherentDays: 4,
      adherencePercentage: 87,
      longestStreak: 12,
      endingStreak: 6,
    },
    weeklyBreakdown: [
      { weekNumber: 1, label: 'Week 1 (08/1 - 08/7)', caloriesConsumed: 13650, avgCalories: 1950, adherentDays: 6, adherencePercentage: 86, weightChange: -0.4 },
      { weekNumber: 2, label: 'Week 2 (08/8 - 08/14)', caloriesConsumed: 13790, avgCalories: 1970, adherentDays: 7, adherencePercentage: 100, weightChange: -0.6 },
      { weekNumber: 3, label: 'Week 3 (08/15 - 08/21)', caloriesConsumed: 13580, avgCalories: 1940, adherentDays: 6, adherencePercentage: 86, weightChange: -0.6 },
      { weekNumber: 4, label: 'Week 4 (08/22 - 08/31)', caloriesConsumed: 17880, avgCalories: 1986, adherentDays: 7, adherencePercentage: 78, weightChange: -0.5 },
    ],
    dailyBreakdown: Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      return {
        date: `2026-08-${String(day).padStart(2, '0')}`,
        dayNumber: day,
        caloriesConsumed: 1850 + (day % 5) * 60,
        caloriesBurned: 350 + (day % 3) * 50,
        carbs: 220 + (day % 4) * 10,
        protein: 105 + (day % 3) * 5,
        fat: 60 + (day % 2) * 5,
        weight: 80.2 - (day * 0.07),
        adherence: day % 7 !== 0,
        streak: (day % 7) + 1,
        steps: 7500 + (day % 6) * 400,
      };
    }),
  };

  // Test AI / deterministic suggestions
  console.log('Generating suggestions...');
  const suggestions = await generateMonthlyAiSuggestions(mockUser, mockReportData);
  mockReportData.personalizedSuggestions = suggestions;

  console.log('Suggestions result:', {
    healthScore: suggestions.healthScore,
    healthGrade: suggestions.healthGrade,
    strengthsCount: suggestions.strengths?.length,
    improvementsCount: suggestions.improvements?.length,
    dietaryAdviceCount: suggestions.dietaryAdvice?.length,
  });

  // Test PDF generation
  console.log('Generating PDF buffer...');
  const pdfBuffer = await generateHealthReportPDF(mockReportData);

  console.log(`PDF successfully generated! Buffer size: ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);

  const outputPath = path.join(__dirname, 'sample-health-report.pdf');
  fs.writeFileSync(outputPath, pdfBuffer);
  console.log(`Saved sample PDF to ${outputPath}`);

  if (pdfBuffer.length > 5000) {
    console.log('✅ ALL PDF & Report compilation tests PASSED!');
  } else {
    throw new Error('PDF buffer size suspiciously small.');
  }
}

testPdfGeneration().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
