const PDFDocument = require('pdfkit');

/**
 * Generate a beautifully styled, comprehensive multi-page monthly health report PDF
 * @param {object} reportData - Full compiled report data (user, summary, nutrients, weightTrend, adherence, suggestions, etc.)
 * @returns {Promise<Buffer>} PDF Buffer
 */
const generateHealthReportPDF = (reportData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Calorify Health Report - ${reportData.month || 'Monthly'}`,
          Author: 'Calorify AI Nutrition Platform',
          Subject: 'Monthly Health, Calorie, and Nutrition Analytics',
          Keywords: 'Nutrition, Calorie, Health Report, Bangladesh, Calorify AI',
        },
      });

      const buffers = [];
      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const {
        user = {},
        month = '2026-08',
        summary = {},
        nutrients = {},
        weightTrend = {},
        adherence = {},
        weeklyBreakdown = [],
        dailyBreakdown = [],
        personalizedSuggestions = {},
        generatedAt = new Date(),
      } = reportData;

      // Color Palette
      const COLORS = {
        primary: '#10B981',       // Emerald
        primaryDark: '#047857',   // Dark Emerald
        primaryLight: '#D1FAE5',  // Very Light Emerald
        primaryBg: '#ECFDF5',     // Tinted background
        darkText: '#0F172A',      // Slate 900
        mutedText: '#64748B',     // Slate 500
        lightBorder: '#E2E8F0',   // Slate 200
        cardBg: '#F8FAFC',        // Slate 50
        orange: '#F97316',        // Orange for Burn / Fat
        blue: '#3B82F6',          // Blue for Protein / Water
        amber: '#F59E0B',         // Amber for Carbs
        purple: '#8B5CF6',
        red: '#EF4444',
      };

      const monthFormatted = formatMonthString(month);
      const reportId = `CAL-REP-${month.replace('-', '')}-${(user._id || 'USR').toString().slice(-4).toUpperCase()}`;

      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 1: HEADER, EXECUTIVE SCORECARD, CALORIE & NUTRIENT ANALYSIS
      // ─────────────────────────────────────────────────────────────────────────

      // Top Decorative Header Bar
      doc.rect(40, 40, 515, 6).fill(COLORS.primary);

      // Header Brand & Title
      doc.y = 56;
      doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.darkText).text('CALORIFY AI', 40, 56, { continued: true });
      doc.font('Helvetica').fontSize(12).fillColor(COLORS.mutedText).text('  |  Monthly Health & Nutrition Report');

      doc.fontSize(9).fillColor(COLORS.mutedText).text(`Report ID: ${reportId}   •   Generated: ${new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, 40, 80);

      // Report Period Badge (Top Right)
      drawBadge(doc, 430, 54, 125, 24, monthFormatted, COLORS.primaryBg, COLORS.primaryDark);

      // Horizontal Divider
      drawHorizontalLine(doc, 40, 100, 515, COLORS.lightBorder);

      // User Profile Bar
      const profileBoxY = 110;
      doc.roundedRect(40, profileBoxY, 515, 52, 8).fillAndStroke(COLORS.cardBg, COLORS.lightBorder);

      const goalLabels = {
        lose_weight: 'Weight Loss 📉',
        gain_muscle: 'Muscle Hypertrophy 💪',
        maintain: 'Weight Maintenance ⚖️',
      };

      doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkText).text(user.name || 'Member', 55, profileBoxY + 12);
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.mutedText);
      doc.text(`Age: ${user.age || 'N/A'} yrs   •   Gender: ${capitalize(user.gender || 'N/A')}   •   Height: ${user.height ? `${user.height} cm` : 'N/A'}`, 55, profileBoxY + 30);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.darkText).text('Target Goal:', 310, profileBoxY + 12);
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.primaryDark).text(goalLabels[user.goal] || 'Healthy Lifestyle', 375, profileBoxY + 12);

      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.darkText).text('Daily Target:', 310, profileBoxY + 30);
      doc.font('Helvetica').fontSize(9).fillColor(COLORS.darkText).text(`${summary.dailyCalorieTarget || 2000} kcal/day`, 375, profileBoxY + 30);

      // ── Executive Scorecard (4 Highlights) ──
      const scoreCardY = 172;
      const cardW = 122;
      const cardH = 68;

      // Card 1: Health Score
      drawMetricCard(
        doc,
        40,
        scoreCardY,
        cardW,
        cardH,
        'HEALTH SCORE',
        `${personalizedSuggestions.healthScore || 85}/100`,
        `Grade: ${personalizedSuggestions.healthGrade || 'A'}`,
        COLORS.primaryDark,
        COLORS.primaryBg
      );

      // Card 2: Avg Daily Intake
      drawMetricCard(
        doc,
        171,
        scoreCardY,
        cardW,
        cardH,
        'AVG DAILY INTAKE',
        `${summary.averageDailyCalories || 0} kcal`,
        `Target: ${summary.dailyCalorieTarget || 2000} kcal`,
        COLORS.darkText,
        COLORS.cardBg
      );

      // Card 3: Weight Change
      const wtChange = weightTrend.weightChange || 0;
      const wtChangeStr = `${wtChange > 0 ? '+' : ''}${wtChange} kg`;
      drawMetricCard(
        doc,
        302,
        scoreCardY,
        cardW,
        cardH,
        'NET WEIGHT TREND',
        wtChangeStr,
        `End: ${weightTrend.endingWeight || 0} kg`,
        wtChange <= 0 ? COLORS.primaryDark : COLORS.orange,
        COLORS.cardBg
      );

      // Card 4: Plan Adherence
      drawMetricCard(
        doc,
        433,
        scoreCardY,
        cardW,
        cardH,
        'PLAN ADHERENCE',
        `${adherence.adherencePercentage || 0}%`,
        `Best Streak: ${adherence.longestStreak || 0}d`,
        COLORS.primaryDark,
        COLORS.cardBg
      );

      // ── SECTION 1: Calorie & Energy Dynamics ──
      const sec1Y = 252;
      drawSectionHeader(doc, 40, sec1Y, '1. CALORIE & ENERGY BALANCE DYNAMICS', COLORS.primary);

      const calBoxY = sec1Y + 22;
      doc.roundedRect(40, calBoxY, 515, 75, 6).fillAndStroke(COLORS.cardBg, COLORS.lightBorder);

      const colW = 515 / 4;
      drawStatColumn(doc, 40, calBoxY + 12, colW, 'Total Consumed', `${(summary.totalCaloriesConsumed || 0).toLocaleString()} kcal`, `${summary.totalLoggedDays || 0} days logged`);
      drawStatColumn(doc, 40 + colW, calBoxY + 12, colW, 'Daily Average', `${summary.averageDailyCalories || 0} kcal`, `${getDiffText(summary.averageDailyCalories, summary.dailyCalorieTarget)}`);
      drawStatColumn(doc, 40 + colW * 2, calBoxY + 12, colW, 'Active Burn (Wearable)', `${(summary.totalCaloriesBurned || 0).toLocaleString()} kcal`, `Avg: ${summary.averageDailyBurn || 0} kcal/d`);
      drawStatColumn(doc, 40 + colW * 3, calBoxY + 12, colW, 'Calorie Adherence', `${summary.calorieAdherenceScore || 0}%`, 'Within ±15% Target');

      // Calorie Trend Vector Chart (Bar & Target Line)
      const chart1Y = calBoxY + 84;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.darkText).text('Daily Calorie Intake vs Daily Target (kcal)', 45, chart1Y);
      drawCalorieChart(doc, 40, chart1Y + 14, 515, 105, dailyBreakdown, summary.dailyCalorieTarget || 2000, COLORS);

      // ── SECTION 2: Macronutrient Intake & Energy Share ──
      const sec2Y = chart1Y + 130;
      drawSectionHeader(doc, 40, sec2Y, '2. MACRONUTRIENT INTAKE & DISTRIBUTION', COLORS.primary);

      const macroBoxY = sec2Y + 22;
      doc.roundedRect(40, macroBoxY, 515, 68, 6).fillAndStroke(COLORS.cardBg, COLORS.lightBorder);

      const mColW = 515 / 3;
      drawMacroCard(doc, 40, macroBoxY + 10, mColW, 'CARBOHYDRATES', `${nutrients.averageCarbs || 0} g/day`, `${nutrients.carbsPercentage || 0}% of energy`, COLORS.amber);
      drawMacroCard(doc, 40 + mColW, macroBoxY + 10, mColW, 'PROTEIN', `${nutrients.averageProtein || 0} g/day`, `${nutrients.proteinPercentage || 0}% of energy`, COLORS.blue);
      drawMacroCard(doc, 40 + mColW * 2, macroBoxY + 10, mColW, 'DIETARY FATS', `${nutrients.averageFat || 0} g/day`, `${nutrients.fatPercentage || 0}% of energy`, COLORS.orange);

      // Horizontal Macronutrient Proportion Bar
      const macroBarY = macroBoxY + 75;
      drawMacroProportionBar(doc, 40, macroBarY, 515, 20, nutrients, COLORS);

      // Nutrition Guideline Reference
      doc.y = macroBarY + 28;
      doc.font('Helvetica-Oblique').fontSize(8).fillColor(COLORS.mutedText).text(
        '* Recommended distribution for health goals: Carbs 45-60%, Protein 20-30%, Fats 20-30%. Consult personalized AI advice on Page 2 for Bengali diet adjustments.',
        40,
        macroBarY + 28,
        { width: 515 }
      );

      // ─────────────────────────────────────────────────────────────────────────
      // PAGE 2: WEIGHT JOURNEY, ADHERENCE STREAKS & AI PERSONALIZED SUGGESTIONS
      // ─────────────────────────────────────────────────────────────────────────
      doc.addPage();

      // Top Decorative Header Bar
      doc.rect(40, 40, 515, 6).fill(COLORS.primary);

      // Page 2 Header
      doc.y = 56;
      doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.darkText).text('CALORIFY AI', 40, 56, { continued: true });
      doc.font('Helvetica').fontSize(11).fillColor(COLORS.mutedText).text('  |  Biometric Trends & Clinical AI Insights');
      drawBadge(doc, 430, 54, 125, 22, `Page 2 of 2`, COLORS.cardBg, COLORS.darkText);

      drawHorizontalLine(doc, 40, 84, 515, COLORS.lightBorder);

      // ── SECTION 3: Weight Journey & Body Composition ──
      const sec3Y = 96;
      drawSectionHeader(doc, 40, sec3Y, '3. WEIGHT TREND & BODY COMPOSITION', COLORS.primary);

      const wtSummaryY = sec3Y + 22;
      doc.roundedRect(40, wtSummaryY, 515, 54, 6).fillAndStroke(COLORS.cardBg, COLORS.lightBorder);

      const wtColW = 515 / 5;
      drawStatColumn(doc, 40, wtSummaryY + 10, wtColW, 'Start Weight', `${weightTrend.startingWeight || 0} kg`, 'Month Opening');
      drawStatColumn(doc, 40 + wtColW, wtSummaryY + 10, wtColW, 'End Weight', `${weightTrend.endingWeight || 0} kg`, 'Month Closing');
      drawStatColumn(doc, 40 + wtColW * 2, wtSummaryY + 10, wtColW, 'Net Change', wtChangeStr, wtChange <= 0 ? 'Favorable trend' : 'Caloric surplus');
      drawStatColumn(doc, 40 + wtColW * 3, wtSummaryY + 10, wtColW, 'Ending BMI', `${weightTrend.endingBMI || 'N/A'}`, weightTrend.bmiCategory || 'Normal');
      drawStatColumn(doc, 40 + wtColW * 4, wtSummaryY + 10, wtColW, 'Range (Min-Max)', `${weightTrend.minWeight || 0}-${weightTrend.maxWeight || 0}`, 'kg span');

      // Weight Journey Line Chart
      const wtChartY = wtSummaryY + 62;
      doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.darkText).text('Weight Trajectory Over Time (kg)', 45, wtChartY);
      drawWeightChart(doc, 40, wtChartY + 14, 515, 95, dailyBreakdown, weightTrend, COLORS);

      // ── SECTION 4: Plan Adherence & Streak Consistency ──
      const sec4Y = wtChartY + 120;
      drawSectionHeader(doc, 40, sec4Y, '4. DIET PLAN ADHERENCE & HABIT STREAKS', COLORS.primary);

      const adhBoxY = sec4Y + 22;
      doc.roundedRect(40, adhBoxY, 515, 54, 6).fillAndStroke(COLORS.primaryBg, COLORS.primaryLight);

      const aColW = 515 / 4;
      drawStatColumn(doc, 40, adhBoxY + 10, aColW, 'Adherent Days', `${adherence.adherentDays || 0} Days`, `${adherence.adherencePercentage || 0}% adherence`);
      drawStatColumn(doc, 40 + aColW, adhBoxY + 10, aColW, 'Longest Streak', `${adherence.longestStreak || 0} Days`, 'Consecutive');
      drawStatColumn(doc, 40 + aColW * 2, adhBoxY + 10, aColW, 'Ending Streak', `${adherence.endingStreak || 0} Days`, 'Current run');
      drawStatColumn(doc, 40 + aColW * 3, adhBoxY + 10, aColW, 'Wearable Steps', `${(summary.totalSteps || 0).toLocaleString()}`, `Avg: ${(summary.averageDailySteps || 0).toLocaleString()}/d`);

      // ── SECTION 5: Personalized AI Suggestions & Clinical Recommendations ──
      const sec5Y = adhBoxY + 64;
      drawSectionHeader(doc, 40, sec5Y, '5. PERSONALIZED AI NUTRITION & CLINICAL SUGGESTIONS', COLORS.primaryDark);

      let currentY = sec5Y + 22;

      // Overall Evaluation Banner
      if (personalizedSuggestions.overallEvaluation) {
        doc.roundedRect(40, currentY, 515, 42, 6).fillAndStroke(COLORS.cardBg, COLORS.lightBorder);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.primaryDark).text('AI CLINICAL SUMMARY:', 50, currentY + 7);
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.darkText).text(
          personalizedSuggestions.overallEvaluation,
          50,
          currentY + 18,
          { width: 495, lineGap: 1.5 }
        );
        currentY += 48;
      }

      // Strengths & Improvements in 2 Columns
      const col2W = 250;
      const col2Gap = 15;
      const boxH = 88;

      // Left: Strengths
      doc.roundedRect(40, currentY, col2W, boxH, 6).fillAndStroke('#F0FDF4', '#BBF7D0');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#15803D').text('✓ KEY STRENGTHS & ACCOMPLISHMENTS', 50, currentY + 8);
      let sY = currentY + 22;
      (personalizedSuggestions.strengths || []).slice(0, 3).forEach((item) => {
        doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.darkText).text(`• ${item}`, 50, sY, { width: col2W - 20, lineGap: 1 });
        sY += 20;
      });

      // Right: Areas to Improve
      doc.roundedRect(40 + col2W + col2Gap, currentY, col2W, boxH, 6).fillAndStroke('#FEF2F2', '#FECACA');
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#B91C1C').text('! AREAS FOR OPTIMIZATION & RISK AVOIDANCE', 40 + col2W + col2Gap + 10, currentY + 8);
      let iY = currentY + 22;
      (personalizedSuggestions.improvements || []).slice(0, 3).forEach((item) => {
        doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.darkText).text(`• ${item}`, 40 + col2W + col2Gap + 10, iY, { width: col2W - 20, lineGap: 1 });
        iY += 20;
      });

      currentY += boxH + 8;

      // Dietary Recommendations (Bangladeshi cuisine specific)
      const dietBoxH = 68;
      doc.roundedRect(40, currentY, 515, dietBoxH, 6).fillAndStroke(COLORS.cardBg, COLORS.lightBorder);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.darkText).text('TAILORED BANGLADESHI DIETARY ACTION PLAN:', 50, currentY + 8);
      let dY = currentY + 22;
      (personalizedSuggestions.dietaryAdvice || []).slice(0, 3).forEach((item) => {
        doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.darkText).text(`➤  ${item}`, 50, dY, { width: 495, lineGap: 1 });
        dY += 14;
      });

      currentY += dietBoxH + 8;

      // Next Month Goals
      doc.roundedRect(40, currentY, 515, 42, 6).fillAndStroke(COLORS.primaryBg, COLORS.primaryLight);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.primaryDark).text('TARGET GOALS FOR NEXT MONTH:', 50, currentY + 7);
      let gY = currentY + 19;
      (personalizedSuggestions.nextMonthGoals || []).slice(0, 2).forEach((item) => {
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.darkText).text(`🎯  ${item}`, 50, gY, { width: 495 });
        gY += 11;
      });

      // ── Footer / Medical Disclaimer ──
      const footerY = 760;
      drawHorizontalLine(doc, 40, footerY, 515, COLORS.lightBorder);
      doc.font('Helvetica').fontSize(6.5).fillColor(COLORS.mutedText).text(
        'Disclaimer: Calorify AI health reports are compiled automatically from user logs and wearable biometrics for lifestyle optimization and wellness tracking. This report does not replace certified medical evaluation, laboratory testing, or clinical diagnosis.',
        40,
        footerY + 6,
        { width: 515, align: 'center' }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// DRAWING & CHARTING HELPERS (Native PDFKit Vector Graphics)
// ─────────────────────────────────────────────────────────────────────────────

function drawSectionHeader(doc, x, y, title, accentColor) {
  doc.rect(x, y + 2, 3, 11).fill(accentColor);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(title, x + 8, y + 2);
}

function drawHorizontalLine(doc, x, y, width, color) {
  doc.moveTo(x, y).lineTo(x + width, y).strokeColor(color).lineWidth(0.75).stroke();
}

function drawBadge(doc, x, y, width, height, text, bgColor, textColor) {
  doc.roundedRect(x, y, width, height, 11).fill(bgColor);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(textColor).text(text, x, y + 6, {
    width: width,
    align: 'center',
  });
}

function drawMetricCard(doc, x, y, width, height, label, value, subtext, valueColor, bgColor) {
  doc.roundedRect(x, y, width, height, 8).fillAndStroke(bgColor, '#E2E8F0');
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748B').text(label, x + 10, y + 8);
  doc.font('Helvetica-Bold').fontSize(15).fillColor(valueColor).text(value, x + 10, y + 24);
  doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(subtext, x + 10, y + 48);
}

function drawStatColumn(doc, x, y, width, label, value, note) {
  doc.font('Helvetica').fontSize(7.5).fillColor('#64748B').text(label, x + 8, y);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0F172A').text(value, x + 8, y + 12);
  if (note) {
    doc.font('Helvetica').fontSize(7).fillColor('#64748B').text(note, x + 8, y + 27);
  }
}

function drawMacroCard(doc, x, y, width, title, value, pctText, barColor) {
  doc.rect(x + 10, y + 2, 4, 32).fill(barColor);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#64748B').text(title, x + 20, y);
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#0F172A').text(value, x + 20, y + 12);
  doc.font('Helvetica').fontSize(7.5).fillColor(barColor).text(pctText, x + 20, y + 29);
}

function drawMacroProportionBar(doc, x, y, width, height, nutrients, COLORS) {
  const carbsPct = Math.max(0, nutrients.carbsPercentage || 0);
  const proteinPct = Math.max(0, nutrients.proteinPercentage || 0);
  const fatPct = Math.max(0, nutrients.fatPercentage || 0);
  const total = carbsPct + proteinPct + fatPct || 100;

  const carbsW = (carbsPct / total) * width;
  const proteinW = (proteinPct / total) * width;
  const fatW = width - (carbsW + proteinW);

  // Background frame
  doc.roundedRect(x, y, width, height, 4).fillAndStroke('#F1F5F9', '#E2E8F0');

  // Segments
  let currentX = x;
  if (carbsW > 0) {
    doc.rect(currentX, y, carbsW, height).fill(COLORS.amber);
    currentX += carbsW;
  }
  if (proteinW > 0) {
    doc.rect(currentX, y, proteinW, height).fill(COLORS.blue);
    currentX += proteinW;
  }
  if (fatW > 0) {
    doc.rect(currentX, y, fatW, height).fill(COLORS.orange);
  }

  // Legend text under bar
  const legY = y + height + 4;
  doc.font('Helvetica-Bold').fontSize(7);
  doc.fillColor(COLORS.amber).text(`■ Carbs: ${carbsPct}% (${nutrients.averageCarbs || 0}g)`, x, legY, { continued: true });
  doc.fillColor('#64748B').text('   |   ', { continued: true });
  doc.fillColor(COLORS.blue).text(`■ Protein: ${proteinPct}% (${nutrients.averageProtein || 0}g)`, { continued: true });
  doc.fillColor('#64748B').text('   |   ', { continued: true });
  doc.fillColor(COLORS.orange).text(`■ Fats: ${fatPct}% (${nutrients.averageFat || 0}g)`);
}

/**
 * Calorie vector chart rendering daily intake bars with daily target reference line
 */
function drawCalorieChart(doc, x, y, width, height, dailyData, targetCal, COLORS) {
  doc.roundedRect(x, y, width, height, 6).fillAndStroke('#FFFFFF', '#E2E8F0');

  const plotX = x + 35;
  const plotY = y + 10;
  const plotW = width - 45;
  const plotH = height - 25;

  const daysCount = dailyData.length || 30;
  const maxCal = Math.max(targetCal * 1.3, ...dailyData.map((d) => Math.max(d.caloriesConsumed || 0, d.caloriesBurned || 0)), 2400);

  // Y-axis gridlines and labels
  const steps = 3;
  for (let i = 0; i <= steps; i++) {
    const val = Math.round((maxCal / steps) * i);
    const lineY = plotY + plotH - (i / steps) * plotH;
    doc.moveTo(plotX, lineY).lineTo(plotX + plotW, lineY).strokeColor('#F1F5F9').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(6).fillColor('#94A3B8').text(`${val}`, x + 5, lineY - 3, { width: 25, align: 'right' });
  }

  // Target Calorie Reference Line (dashed)
  const targetLineY = plotY + plotH - (targetCal / maxCal) * plotH;
  if (targetLineY >= plotY && targetLineY <= plotY + plotH) {
    doc.save();
    doc.dash(3, { space: 3 });
    doc.moveTo(plotX, targetLineY).lineTo(plotX + plotW, targetLineY).strokeColor(COLORS.primaryDark).lineWidth(1).stroke();
    doc.undash();
    doc.restore();
    doc.font('Helvetica-Bold').fontSize(6).fillColor(COLORS.primaryDark).text(`Target ${targetCal} kcal`, plotX + plotW - 65, targetLineY - 8);
  }

  // Plot Daily Bars
  const barSlotW = plotW / daysCount;
  const barW = Math.max(2, Math.min(8, barSlotW * 0.65));

  dailyData.forEach((day, index) => {
    const barX = plotX + index * barSlotW + (barSlotW - barW) / 2;
    const consumed = day.caloriesConsumed || 0;
    const barH = (consumed / maxCal) * plotH;
    const barY = plotY + plotH - barH;

    if (consumed > 0) {
      // Color bar green if near target, amber if high/low
      const isTargetMet = Math.abs(consumed - targetCal) <= targetCal * 0.15;
      const barColor = isTargetMet ? COLORS.primary : consumed > targetCal ? '#F87171' : '#FBBF24';
      doc.rect(barX, barY, barW, barH).fill(barColor);
    }

    // X-axis Day labels every 5 days
    const dayNum = day.dayNumber || index + 1;
    if (dayNum === 1 || dayNum % 5 === 0 || dayNum === daysCount) {
      doc.font('Helvetica').fontSize(5.5).fillColor('#94A3B8').text(`${dayNum}`, barX - 4, plotY + plotH + 3, { width: 14, align: 'center' });
    }
  });
}

/**
 * Weight Journey vector chart rendering weight line graph over the month
 */
function drawWeightChart(doc, x, y, width, height, dailyData, weightTrend, COLORS) {
  doc.roundedRect(x, y, width, height, 6).fillAndStroke('#FFFFFF', '#E2E8F0');

  const plotX = x + 35;
  const plotY = y + 10;
  const plotW = width - 45;
  const plotH = height - 25;

  const validEntries = dailyData.filter((d) => d.weight && d.weight > 0);
  const minW = Math.max(0, (weightTrend.minWeight || 60) - 2);
  const maxW = (weightTrend.maxWeight || 80) + 2;
  const range = maxW - minW || 10;

  // Y-axis gridlines
  const steps = 3;
  for (let i = 0; i <= steps; i++) {
    const val = (minW + (range / steps) * i).toFixed(1);
    const lineY = plotY + plotH - (i / steps) * plotH;
    doc.moveTo(plotX, lineY).lineTo(plotX + plotW, lineY).strokeColor('#F1F5F9').lineWidth(0.5).stroke();
    doc.font('Helvetica').fontSize(6).fillColor('#94A3B8').text(`${val}kg`, x + 2, lineY - 3, { width: 30, align: 'right' });
  }

  if (validEntries.length > 0) {
    const totalDays = dailyData.length || 30;
    const points = validEntries.map((entry) => {
      const dayNum = entry.dayNumber || 1;
      const px = plotX + ((dayNum - 1) / (totalDays - 1 || 1)) * plotW;
      const py = plotY + plotH - ((entry.weight - minW) / range) * plotH;
      return { x: px, y: py, weight: entry.weight, dayNum };
    });

    // Draw connecting line
    doc.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      doc.lineTo(points[i].x, points[i].y);
    }
    doc.strokeColor(COLORS.primaryDark).lineWidth(2).stroke();

    // Draw dots on data points
    points.forEach((pt) => {
      doc.circle(pt.x, pt.y, 2.5).fillAndStroke('#FFFFFF', COLORS.primaryDark);
    });
  } else {
    doc.font('Helvetica').fontSize(8).fillColor('#94A3B8').text('No daily weight records logged this month', plotX + 100, plotY + 35);
  }
}

function formatMonthString(monthStr) {
  if (!monthStr) return 'Current Month';
  const parts = monthStr.split('-');
  if (parts.length < 2) return monthStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function getDiffText(actual, target) {
  if (!actual || !target) return 'On track';
  const diff = actual - target;
  if (Math.abs(diff) <= 50) return 'Perfect balance';
  return diff > 0 ? `+${diff} kcal over target` : `${Math.abs(diff)} kcal deficit`;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { generateHealthReportPDF };
