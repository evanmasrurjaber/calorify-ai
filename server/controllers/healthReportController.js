// Monthly Health Report Controller — Member 2 responsibility
// Compiles user's calorie data, average nutrient intake, weight trend,
// plan adherence percentage, and streak history into a structured report,
// rendered with AI suggestions and downloadable PDF.

const User = require('../models/User');
const MealLog = require('../models/MealLog');
const Progress = require('../models/Progress');
const MonthlyReport = require('../models/MonthlyReport');
const { generateMonthlyAiSuggestions } = require('../services/reportAiService');
const { generateHealthReportPDF } = require('../utils/generatePDF');

/**
 * Helper to compile complete monthly metrics for a given user and month
 */
const compileMonthlyData = async (userId, requestedMonth, forceRefresh = false) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  // Determine month string (defaults to current month if not passed)
  let monthStr = requestedMonth;
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    monthStr = currentMonthStr;
  }

  const isPastMonth = monthStr < currentMonthStr;
  let cachedSuggestions = null;

  // For past months, if a cached report exists and refresh is not forced, return it immediately
  const existingReport = await MonthlyReport.findOne({ user: userId, month: monthStr });
  if (existingReport && !forceRefresh) {
    if (isPastMonth) {
      return existingReport.toObject();
    }
    // For ongoing month, reuse existing AI suggestions if less than 30 mins old, but always recompile live stats
    if (existingReport.personalizedSuggestions?.healthScore) {
      const cacheAgeMs = Date.now() - new Date(existingReport.updatedAt || existingReport.createdAt).getTime();
      if (cacheAgeMs < 1000 * 60 * 30) {
        cachedSuggestions = existingReport.personalizedSuggestions;
      }
    }
  }

  // Date boundaries
  const [year, monthNum] = monthStr.split('-').map(Number);
  const startDate = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0));
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, monthNum - 1, daysInMonth, 23, 59, 59, 999));

  // Query records
  const [mealLogs, progressEntries] = await Promise.all([
    MealLog.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
    Progress.find({ user: userId, date: { $gte: startDate, $lte: endDate } }).sort({ date: 1 }),
  ]);

  // Build daily maps
  const dailyDataMap = {};
  for (let day = 1; day <= daysInMonth; day++) {
    const dayDateStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    dailyDataMap[dayDateStr] = {
      date: dayDateStr,
      dayNumber: day,
      caloriesConsumed: 0,
      caloriesBurned: 0,
      carbs: 0,
      protein: 0,
      fat: 0,
      weight: null,
      adherence: false,
      streak: 0,
      steps: 0,
      hasMealLog: false,
      hasProgressLog: false,
    };
  }

  // Helper to match a log date to a dailyDataMap key regardless of UTC/local offset
  const getDayEntry = (dateInput) => {
    const d = new Date(dateInput);
    const utcKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (dailyDataMap[utcKey]) return dailyDataMap[utcKey];

    const localKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dailyDataMap[localKey]) return dailyDataMap[localKey];

    const dayNum = Math.min(Math.max(1, d.getUTCDate()), daysInMonth);
    const fallbackKey = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    return dailyDataMap[fallbackKey] || null;
  };

  // Aggregate meal logs by date
  mealLogs.forEach((log) => {
    const targetDay = getDayEntry(log.date);
    if (targetDay) {
      targetDay.caloriesConsumed += log.calories || 0;
      targetDay.carbs += log.carbs || 0;
      targetDay.protein += log.protein || 0;
      targetDay.fat += log.fat || 0;
      targetDay.hasMealLog = true;
    }
  });

  // Aggregate progress entries by date
  progressEntries.forEach((prog) => {
    const targetDay = getDayEntry(prog.date);
    if (targetDay) {
      if (prog.weight && prog.weight > 0) targetDay.weight = prog.weight;
      if (prog.adherence !== undefined) targetDay.adherence = !!prog.adherence;
      if (prog.streak !== undefined) targetDay.streak = prog.streak;
      if (prog.steps) targetDay.steps += prog.steps;
      if (prog.caloriesBurned) targetDay.caloriesBurned += prog.caloriesBurned;
      // Fallback calories consumed from progress if no meal logs exist for that day
      if (!targetDay.hasMealLog && prog.caloriesConsumed) {
        targetDay.caloriesConsumed = prog.caloriesConsumed;
      }
      targetDay.hasProgressLog = true;
    }
  });

  const dailyBreakdown = Object.values(dailyDataMap);

  // 1. Calorie summary
  const daysWithCalories = dailyBreakdown.filter((d) => d.caloriesConsumed > 0);
  const totalCaloriesConsumed = dailyBreakdown.reduce((sum, d) => sum + d.caloriesConsumed, 0);
  const averageDailyCalories = daysWithCalories.length > 0 ? Math.round(totalCaloriesConsumed / daysWithCalories.length) : 0;
  const targetCalories = user.dailyCalorieTarget || 2000;

  const totalCaloriesBurned = dailyBreakdown.reduce((sum, d) => sum + d.caloriesBurned, 0);
  const daysWithBurn = dailyBreakdown.filter((d) => d.caloriesBurned > 0);
  const averageDailyBurn = daysWithBurn.length > 0 ? Math.round(totalCaloriesBurned / daysWithBurn.length) : 0;

  const totalSteps = dailyBreakdown.reduce((sum, d) => sum + d.steps, 0);
  const daysWithSteps = dailyBreakdown.filter((d) => d.steps > 0);
  const averageDailySteps = daysWithSteps.length > 0 ? Math.round(totalSteps / daysWithSteps.length) : 0;

  const loggedDaysCount = dailyBreakdown.filter((d) => d.hasMealLog || d.hasProgressLog).length;

  // Calorie adherence score (% days within ±15% of target)
  const daysInCalorieTarget = daysWithCalories.filter(
    (d) => Math.abs(d.caloriesConsumed - targetCalories) <= targetCalories * 0.15
  ).length;
  const calorieAdherenceScore = daysWithCalories.length > 0 ? Math.round((daysInCalorieTarget / daysWithCalories.length) * 100) : 0;

  // 2. Nutrients
  const totalCarbs = Math.round(dailyBreakdown.reduce((sum, d) => sum + d.carbs, 0));
  const totalProtein = Math.round(dailyBreakdown.reduce((sum, d) => sum + d.protein, 0));
  const totalFat = Math.round(dailyBreakdown.reduce((sum, d) => sum + d.fat, 0));

  const averageCarbs = daysWithCalories.length > 0 ? Math.round(totalCarbs / daysWithCalories.length) : 0;
  const averageProtein = daysWithCalories.length > 0 ? Math.round(totalProtein / daysWithCalories.length) : 0;
  const averageFat = daysWithCalories.length > 0 ? Math.round(totalFat / daysWithCalories.length) : 0;

  const carbsKcal = totalCarbs * 4;
  const proteinKcal = totalProtein * 4;
  const fatKcal = totalFat * 9;
  const totalMacroKcal = carbsKcal + proteinKcal + fatKcal;

  const carbsPercentage = totalMacroKcal > 0 ? Math.round((carbsKcal / totalMacroKcal) * 100) : 0;
  const proteinPercentage = totalMacroKcal > 0 ? Math.round((proteinKcal / totalMacroKcal) * 100) : 0;
  const fatPercentage = totalMacroKcal > 0 ? Math.round((fatKcal / totalMacroKcal) * 100) : 0;

  // 3. Weight Trend & Body Composition
  const weightLogs = dailyBreakdown.filter((d) => d.weight && d.weight > 0);
  const startingWeight = weightLogs.length > 0 ? weightLogs[0].weight : user.weight || 0;
  const endingWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : startingWeight;
  const weightsArray = weightLogs.map((d) => d.weight);
  const minWeight = weightsArray.length > 0 ? Math.min(...weightsArray) : startingWeight;
  const maxWeight = weightsArray.length > 0 ? Math.max(...weightsArray) : startingWeight;
  const weightChange = +(endingWeight - startingWeight).toFixed(1);

  // BMI calculations
  let startingBMI = 0;
  let endingBMI = 0;
  let bmiCategory = 'Normal';
  if (user.height && user.height > 0) {
    const heightMeters = user.height / 100;
    startingBMI = +(startingWeight / (heightMeters * heightMeters)).toFixed(1);
    endingBMI = +(endingWeight / (heightMeters * heightMeters)).toFixed(1);

    if (endingBMI < 18.5) bmiCategory = 'Underweight';
    else if (endingBMI < 25) bmiCategory = 'Normal';
    else if (endingBMI < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';
  }

  // 4. Plan Adherence & Streak History
  const adherentDays = dailyBreakdown.filter((d) => d.adherence === true).length;
  const totalAdherenceTracked = dailyBreakdown.filter((d) => d.hasProgressLog).length;
  const adherencePercentage = totalAdherenceTracked > 0 ? Math.round((adherentDays / totalAdherenceTracked) * 100) : 0;
  const longestStreak = Math.max(0, ...dailyBreakdown.map((d) => d.streak || 0));
  const endingStreak = dailyBreakdown.length > 0 ? dailyBreakdown[dailyBreakdown.length - 1].streak || 0 : 0;

  // 5. Weekly Breakdown
  const weeklyBreakdown = [];
  const weeksCount = Math.ceil(daysInMonth / 7);
  for (let w = 1; w <= weeksCount; w++) {
    const startDay = (w - 1) * 7 + 1;
    const endDay = Math.min(w * 7, daysInMonth);
    const weekDays = dailyBreakdown.slice(startDay - 1, endDay);

    const weekCals = weekDays.reduce((acc, d) => acc + d.caloriesConsumed, 0);
    const weekCalsDays = weekDays.filter((d) => d.caloriesConsumed > 0).length;
    const avgWeekCals = weekCalsDays > 0 ? Math.round(weekCals / weekCalsDays) : 0;

    const weekAdherent = weekDays.filter((d) => d.adherence === true).length;
    const weekAdhTracked = weekDays.filter((d) => d.hasProgressLog).length;
    const weekAdhPct = weekAdhTracked > 0 ? Math.round((weekAdherent / weekAdhTracked) * 100) : 0;

    const weekWeights = weekDays.filter((d) => d.weight && d.weight > 0);
    const weekWtChange =
      weekWeights.length > 1
        ? +(weekWeights[weekWeights.length - 1].weight - weekWeights[0].weight).toFixed(1)
        : 0;

    weeklyBreakdown.push({
      weekNumber: w,
      label: `Week ${w} (${monthStr.split('-')[1]}/${startDay} - ${monthStr.split('-')[1]}/${endDay})`,
      caloriesConsumed: weekCals,
      avgCalories: avgWeekCals,
      adherentDays: weekAdherent,
      adherencePercentage: weekAdhPct,
      weightChange: weekWtChange,
    });
  }

  // Raw report object for suggestions
  const compiledData = {
    user,
    month: monthStr,
    startDate,
    endDate,
    daysInMonth,
    summary: {
      totalCaloriesConsumed,
      averageDailyCalories,
      dailyCalorieTarget: targetCalories,
      calorieAdherenceScore,
      totalCaloriesBurned,
      averageDailyBurn,
      netCalories: totalCaloriesConsumed - totalCaloriesBurned,
      totalSteps,
      averageDailySteps,
      totalLoggedDays: loggedDaysCount,
    },
    nutrients: {
      totalCarbs,
      totalProtein,
      totalFat,
      averageCarbs,
      averageProtein,
      averageFat,
      carbsPercentage,
      proteinPercentage,
      fatPercentage,
    },
    weightTrend: {
      startingWeight,
      endingWeight,
      minWeight,
      maxWeight,
      weightChange,
      startingBMI,
      endingBMI,
      bmiCategory,
      entries: weightLogs.map((d) => ({ date: new Date(d.date), weight: d.weight })),
    },
    adherence: {
      adherentDays,
      nonAdherentDays: Math.max(0, totalAdherenceTracked - adherentDays),
      adherencePercentage,
      longestStreak,
      endingStreak,
    },
    weeklyBreakdown,
    dailyBreakdown,
  };

  // Generate personalized suggestions (or reuse fresh cached suggestions)
  const personalizedSuggestions =
    cachedSuggestions && !forceRefresh
      ? cachedSuggestions
      : await generateMonthlyAiSuggestions(user, compiledData);
  compiledData.personalizedSuggestions = personalizedSuggestions;

  // Persist / Upsert in MongoDB
  const savedReport = await MonthlyReport.findOneAndUpdate(
    { user: userId, month: monthStr },
    {
      user: userId,
      month: monthStr,
      startDate,
      endDate,
      daysInMonth,
      summary: compiledData.summary,
      nutrients: compiledData.nutrients,
      weightTrend: compiledData.weightTrend,
      adherence: compiledData.adherence,
      weeklyBreakdown: compiledData.weeklyBreakdown,
      dailyBreakdown: compiledData.dailyBreakdown,
      personalizedSuggestions: compiledData.personalizedSuggestions,
      generatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return { ...savedReport.toObject(), user };
};

// ─── GET /api/reports/monthly?month=YYYY-MM ──────────────────────────────────
// Returns structured monthly health report with AI suggestions
const getMonthlyReport = async (req, res) => {
  try {
    const month = req.query.month;
    const forceRefresh = req.query.refresh === 'true';
    const report = await compileMonthlyData(req.user.id, month, forceRefresh);
    res.status(200).json({ success: true, report });
  } catch (error) {
    console.error('[getMonthlyReport]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/reports/monthly/pdf?month=YYYY-MM ──────────────────────────────
// Generates and streams downloadable PDF health report
const downloadMonthlyReportPDF = async (req, res) => {
  try {
    const month = req.query.month;
    const report = await compileMonthlyData(req.user.id, month);

    const pdfBuffer = await generateHealthReportPDF(report);

    const filename = `Calorify-Health-Report-${report.month || 'Monthly'}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('[downloadMonthlyReportPDF]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/reports/history ────────────────────────────────────────────────
// Lists all available past months with activity for the user
const getReportHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch distinct months from MealLog, Progress, and MonthlyReport
    const [mealDates, progressDates, savedReports] = await Promise.all([
      MealLog.find({ user: userId }).select('date').lean(),
      Progress.find({ user: userId }).select('date').lean(),
      MonthlyReport.find({ user: userId }).select('month summary personalizedSuggestions createdAt').lean(),
    ]);

    const monthsMap = {};

    mealDates.forEach((l) => {
      if (l.date) {
        const d = new Date(l.date);
        const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        monthsMap[m] = true;
      }
    });

    progressDates.forEach((p) => {
      if (p.date) {
        const d = new Date(p.date);
        const m = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        monthsMap[m] = true;
      }
    });

    savedReports.forEach((r) => {
      if (r.month) monthsMap[r.month] = true;
    });

    // Also include current month
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsMap[currentMonth] = true;

    const availableMonths = Object.keys(monthsMap).sort().reverse();

    const history = availableMonths.map((m) => {
      const saved = savedReports.find((r) => r.month === m);
      return {
        month: m,
        isGenerated: !!saved,
        healthScore: saved?.personalizedSuggestions?.healthScore || null,
        healthGrade: saved?.personalizedSuggestions?.healthGrade || null,
        totalCalories: saved?.summary?.totalCaloriesConsumed || null,
        totalLoggedDays: saved?.summary?.totalLoggedDays || null,
      };
    });

    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('[getReportHistory]', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  compileMonthlyData,
  getMonthlyReport,
  downloadMonthlyReportPDF,
  getReportHistory,
};
