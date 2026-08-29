import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  RefreshCw,
  TrendingUp,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Award,
  Calendar,
  Sparkles,
  Utensils,
  Footprints,
  Activity,
  Heart,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import {
  getMonthlyReport,
  downloadMonthlyReportPDF,
  getReportHistory,
} from '../../services/healthReportService';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export default function MonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableMonths, setAvailableMonths] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'calories' | 'macros' | 'weight' | 'ai'
  const [error, setError] = useState(null);

  // Initialize available months and default selected month
  useEffect(() => {
    fetchHistoryAndDefault();
  }, []);

  // Fetch report whenever selectedMonth changes
  useEffect(() => {
    if (selectedMonth) {
      fetchReport(selectedMonth);
    }
  }, [selectedMonth]);

  const fetchHistoryAndDefault = async () => {
    try {
      setLoading(true);
      const res = await getReportHistory();
      const history = res.data?.history || [];
      const monthList = history.map((h) => h.month);

      const now = new Date();
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      if (!monthList.includes(curMonth)) {
        monthList.unshift(curMonth);
      }

      setAvailableMonths(monthList);
      const initialMonth = monthList[0] || curMonth;
      setSelectedMonth(initialMonth);
    } catch (err) {
      console.error('Failed to fetch report history:', err);
      const now = new Date();
      const fallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setAvailableMonths([fallback]);
      setSelectedMonth(fallback);
    }
  };

  const fetchReport = async (month, forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await getMonthlyReport(month, forceRefresh);
      if (res.data?.success) {
        setReport(res.data.report);
      } else {
        setError('Unable to load report for the selected month.');
      }
    } catch (err) {
      console.error('Error fetching monthly report:', err);
      setError(err.response?.data?.message || 'Failed to generate monthly health report.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      await downloadMonthlyReportPDF(selectedMonth);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const formatMonthLabel = (mStr) => {
    if (!mStr) return 'Current Month';
    const [year, month] = mStr.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Safe data accessors
  const summary = report?.summary || {};
  const nutrients = report?.nutrients || {};
  const weightTrend = report?.weightTrend || {};
  const adherence = report?.adherence || {};
  const suggestions = report?.personalizedSuggestions || {};
  const dailyData = report?.dailyBreakdown || [];
  const weeklyData = report?.weeklyBreakdown || [];

  // Macro pie chart data
  const macroPieData = [
    { name: 'Carbs', value: nutrients.carbsPercentage || 0, color: '#F59E0B', grams: nutrients.averageCarbs || 0 },
    { name: 'Protein', value: nutrients.proteinPercentage || 0, color: '#3B82F6', grams: nutrients.averageProtein || 0 },
    { name: 'Fat', value: nutrients.fatPercentage || 0, color: '#F97316', grams: nutrients.averageFat || 0 },
  ];

  // Weight chart data
  const weightChartData = dailyData
    .filter((d) => d.weight && d.weight > 0)
    .map((d) => ({
      date: `Day ${d.dayNumber}`,
      weight: d.weight,
    }));

  // Calorie chart data
  const calorieChartData = dailyData.map((d) => ({
    date: `Day ${d.dayNumber}`,
    consumed: d.caloriesConsumed || 0,
    burned: d.caloriesBurned || 0,
    target: summary.dailyCalorieTarget || 2000,
  }));

  const getGradeBadgeColor = (grade) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'B':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'C':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      default:
        return 'bg-rose-100 text-rose-800 border-rose-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <FileText size={28} />
            </span>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Monthly Health Report
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Sparkles size={13} className="text-emerald-600" />
                  AI Compiled
                </span>
              </div>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Aggregated calorie balance, macronutrients, weight journey, habit streaks, and personalized clinical guidance.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-800 font-bold text-sm rounded-2xl px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs transition"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  📅 {formatMonthLabel(m)}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              ▼
            </div>
          </div>

          {/* Regenerate / Refresh */}
          <button
            onClick={() => fetchReport(selectedMonth, true)}
            disabled={refreshing || loading}
            className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl border border-gray-200 shadow-xs transition hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Refresh & Regenerate AI Insights"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
          </button>

          {/* Download PDF Action */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition active:scale-95 disabled:opacity-60"
          >
            {downloading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Building PDF...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Download PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-2xl text-sm font-medium">
          <AlertTriangle size={20} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-white border border-gray-100 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4 shadow-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
          <p className="text-gray-600 font-bold text-base">Compiling monthly health data & AI suggestions...</p>
          <p className="text-gray-400 text-xs">Crunching calorie logs, macro ratios, wearable syncs, and weight trends</p>
        </div>
      ) : (
        <>
          {/* ── Top Executive Scorecard ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Health Score & Grade */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border border-emerald-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-emerald-100/80 text-emerald-800 rounded-2xl">
                  <Award size={22} />
                </span>
                <span
                  className={`text-xs font-black px-3 py-1 rounded-full border shadow-xs ${getGradeBadgeColor(
                    suggestions.healthGrade
                  )}`}
                >
                  Grade {suggestions.healthGrade || 'A'}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Monthly Health Score</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">{suggestions.healthScore || 85}</span>
                  <span className="text-sm font-bold text-gray-400">/ 100</span>
                </div>
              </div>
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                Evaluated from diet consistency, macro balance & plan adherence.
              </p>
            </div>

            {/* Card 2: Calorie Balance */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Zap size={22} />
                </span>
                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  Target: {summary.dailyCalorieTarget || 2000} kcal
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Daily Avg Intake</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">{summary.averageDailyCalories || 0}</span>
                  <span className="text-xs font-semibold text-gray-500">kcal/day</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Total: {(summary.totalCaloriesConsumed || 0).toLocaleString()} kcal</span>
                <span className="font-bold text-emerald-600">{summary.calorieAdherenceScore || 0}% target hit</span>
              </div>
            </div>

            {/* Card 3: Weight Trend */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-orange-50 text-orange-600 rounded-2xl">
                  <TrendingUp size={22} />
                </span>
                <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-full">
                  BMI: {weightTrend.endingBMI || 'N/A'} ({weightTrend.bmiCategory || 'Normal'})
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Net Weight Shift</p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-black ${
                      (weightTrend.weightChange || 0) <= 0 ? 'text-emerald-600' : 'text-orange-600'
                    }`}
                  >
                    {(weightTrend.weightChange || 0) > 0 ? '+' : ''}
                    {weightTrend.weightChange || 0}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">kg</span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>Start: {weightTrend.startingWeight || 0} kg</span>
                <span>End: {weightTrend.endingWeight || 0} kg</span>
              </div>
            </div>

            {/* Card 4: Plan Adherence & Streak */}
            <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl">
                  <CheckCircle2 size={22} />
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                  🔥 Best: {adherence.longestStreak || 0} Days
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Plan Adherence</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-gray-900">{adherence.adherencePercentage || 0}%</span>
                  <span className="text-xs font-semibold text-gray-500">
                    ({adherence.adherentDays || 0} adherent days)
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-500 font-medium">
                <span>{summary.totalLoggedDays || 0} days logged</span>
                <span>Ending Streak: {adherence.endingStreak || 0}d</span>
              </div>
            </div>
          </div>

          {/* ── Navigation Tabs ── */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
            {[
              { id: 'overview', label: 'Overview & AI Insights', icon: Sparkles },
              { id: 'calories', label: 'Calorie Dynamics', icon: Zap },
              { id: 'macros', label: 'Macronutrient Split', icon: Utensils },
              { id: 'weight', label: 'Weight & Biometrics', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── TAB 1: Overview & AI Insights ── */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* AI Clinical Summary Banner */}
              <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 shadow-lg relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 translate-x-10 -translate-y-10">
                  <Sparkles size={240} />
                </div>
                <div className="relative z-10 space-y-4 max-w-3xl">
                  <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles size={16} />
                    <span>Personalized Clinical Evaluation • {formatMonthLabel(selectedMonth)}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                    {suggestions.overallEvaluation ||
                      'Great commitment this month! Keep following your balanced meal plan and activity targets to maintain metabolic momentum.'}
                  </h2>
                </div>
              </div>

              {/* Strengths and Areas for Improvement Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-6 sm:p-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-emerald-100 text-emerald-800 rounded-2xl">
                      <CheckCircle2 size={22} />
                    </span>
                    <h3 className="text-lg font-bold text-emerald-900">Key Strengths & Milestones</h3>
                  </div>
                  <ul className="space-y-3">
                    {(suggestions.strengths || []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-white/80 p-3.5 rounded-2xl border border-emerald-100 shadow-xs">
                        <span className="text-emerald-600 font-bold text-base mt-0.5">✓</span>
                        <span className="text-sm font-medium text-gray-800 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Areas for Improvement */}
                <div className="bg-amber-50/50 border border-amber-200 rounded-3xl p-6 sm:p-7 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-amber-100 text-amber-800 rounded-2xl">
                      <AlertTriangle size={22} />
                    </span>
                    <h3 className="text-lg font-bold text-amber-900">Areas for Optimization & Risks</h3>
                  </div>
                  <ul className="space-y-3">
                    {(suggestions.improvements || []).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-white/80 p-3.5 rounded-2xl border border-amber-100 shadow-xs">
                        <span className="text-amber-600 font-bold text-base mt-0.5">!</span>
                        <span className="text-sm font-medium text-gray-800 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Localized Bangladeshi Nutrition & Lifestyle Advice */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border border-gray-150 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                      <Utensils size={22} />
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Tailored Bangladeshi Dietary Guidance</h3>
                      <p className="text-xs text-gray-500 font-medium">Contextual meal advice for local Bangladeshi cuisine</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(suggestions.dietaryAdvice || []).map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                        <span className="text-emerald-600 font-bold text-base">🍲</span>
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goals for Next Month */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-5">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                        <Activity size={22} />
                      </span>
                      <h3 className="text-lg font-bold text-gray-900">Next Month's Focus</h3>
                    </div>
                    <div className="space-y-3">
                      {(suggestions.nextMonthGoals || []).map((goal, idx) => (
                        <div key={idx} className="p-4 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-1">
                          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Goal {idx + 1}</span>
                          <p className="text-sm font-bold text-gray-900">{goal}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                    <p className="text-xs text-gray-500 font-medium">
                      Need a portable version for doctor consultation?
                    </p>
                    <button
                      onClick={handleDownloadPDF}
                      className="mt-2.5 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                    >
                      Download Full PDF Report
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: Calorie Dynamics ── */}
          {activeTab === 'calories' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Daily Calorie Consumption vs Target</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Visualizing daily caloric load against your target ({summary.dailyCalorieTarget || 2000} kcal/day)
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" /> Consumed (kcal)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-orange-400" /> Active Burn
                    </span>
                  </div>
                </div>

                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={calorieChartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                      <YAxis stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '16px',
                          border: '1px solid #e1e2e8',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        }}
                      />
                      <Bar dataKey="consumed" name="Consumed (kcal)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="burned" name="Burned (kcal)" fill="#fb923c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Weekly Aggregated Performance Table */}
              <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
                <h3 className="text-lg font-bold text-gray-900">Weekly Aggregation Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <th className="py-3 px-4">Period</th>
                        <th className="py-3 px-4">Total Consumed</th>
                        <th className="py-3 px-4">Daily Average</th>
                        <th className="py-3 px-4">Adherence Rate</th>
                        <th className="py-3 px-4">Weight Shift</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {weeklyData.map((week, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition font-medium">
                          <td className="py-3.5 px-4 font-bold text-gray-900">{week.label}</td>
                          <td className="py-3.5 px-4 text-gray-700">{(week.caloriesConsumed || 0).toLocaleString()} kcal</td>
                          <td className="py-3.5 px-4 text-gray-700">{week.avgCalories || 0} kcal/d</td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">
                              {week.adherencePercentage}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-gray-700">
                            {week.weightChange !== 0 ? `${week.weightChange > 0 ? '+' : ''}${week.weightChange} kg` : 'Stable'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 3: Macronutrient Split ── */}
          {activeTab === 'macros' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Macro Donut Chart (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col items-center justify-between space-y-6">
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900">Macronutrient Energy Share</h3>
                  <p className="text-xs text-gray-500 mt-1">Caloric contribution from daily nutrition</p>
                </div>

                <div className="w-full h-64 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={macroPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {macroPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-gray-900">{summary.averageDailyCalories || 0}</span>
                    <span className="text-[11px] font-bold text-gray-400 uppercase">kcal/day</span>
                  </div>
                </div>

                {/* Macro Legend Pills */}
                <div className="grid grid-cols-3 gap-2 w-full">
                  {macroPieData.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-2xl text-center border border-gray-100">
                      <span className="text-xs font-bold text-gray-500 block mb-0.5">{item.name}</span>
                      <span className="text-lg font-black text-gray-900" style={{ color: item.color }}>
                        {item.value}%
                      </span>
                      <span className="text-[10px] text-gray-400 block font-medium mt-0.5">{item.grams}g/day</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Macro Deep-dive & Recommendations (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                  <h3 className="text-xl font-bold text-gray-900">Macronutrient Quality Analysis</h3>

                  {/* Carbs */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-bold text-gray-800">
                      <span className="text-amber-600">🍞 Carbohydrates: {nutrients.averageCarbs || 0}g ({nutrients.carbsPercentage || 0}%)</span>
                      <span className="text-xs font-semibold text-gray-400">Target Range: 45 - 60%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-amber-400 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(nutrients.carbsPercentage || 0, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Provides primary glucose for cognitive function and physical stamina. Prefer complex carbs like whole lentils and Lal chal.
                    </p>
                  </div>

                  {/* Protein */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-sm font-bold text-gray-800">
                      <span className="text-blue-600">🍗 Protein: {nutrients.averageProtein || 0}g ({nutrients.proteinPercentage || 0}%)</span>
                      <span className="text-xs font-semibold text-gray-400">Target Range: 20 - 30%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(nutrients.proteinPercentage || 0, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Essential for cellular repair, immune health, and lean muscle retention. Maintain consistent intake with eggs, fish, and chicken.
                    </p>
                  </div>

                  {/* Fats */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-sm font-bold text-gray-800">
                      <span className="text-orange-600">🥑 Dietary Fats: {nutrients.averageFat || 0}g ({nutrients.fatPercentage || 0}%)</span>
                      <span className="text-xs font-semibold text-gray-400">Target Range: 20 - 30%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-orange-400 h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(nutrients.fatPercentage || 0, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-500">
                      Vital for hormone synthesis and fat-soluble vitamin absorption. Keep cooking oil moderation in check.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: Weight & Biometrics ── */}
          {activeTab === 'weight' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Weight Trajectory Over Time</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Tracking weight changes across {formatMonthLabel(selectedMonth)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      Starting: {weightTrend.startingWeight || 0} kg
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                      Ending: {weightTrend.endingWeight || 0} kg
                    </span>
                  </div>
                </div>

                {weightChartData.length > 0 ? (
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                        <XAxis dataKey="date" stroke="#888" tick={{ fill: '#888', fontSize: 11 }} />
                        <YAxis
                          domain={['dataMin - 1', 'dataMax + 1']}
                          stroke="#888"
                          tick={{ fill: '#888', fontSize: 11 }}
                          tickFormatter={(val) => `${val.toFixed(1)}kg`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '16px',
                            border: '1px solid #e1e2e8',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="weight"
                          name="Weight (kg)"
                          stroke="#10b981"
                          strokeWidth={4}
                          dot={{ r: 4, fill: '#fff', stroke: '#10b981', strokeWidth: 2 }}
                          activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="w-full h-72 flex flex-col items-center justify-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-gray-400">
                    <TrendingUp size={40} className="mb-2 text-gray-300" />
                    <p className="font-bold text-sm">No daily weight logs recorded for this month</p>
                    <p className="text-xs text-gray-400 mt-1">Log your weight in the Progress & Wearables page</p>
                  </div>
                )}
              </div>

              {/* BMI & Body Composition Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Starting BMI</p>
                  <p className="text-3xl font-black text-gray-900">{weightTrend.startingBMI || 'N/A'}</p>
                </div>
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ending BMI</p>
                  <p className="text-3xl font-black text-emerald-600">{weightTrend.endingBMI || 'N/A'}</p>
                </div>
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-xs text-center">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">BMI Classification</p>
                  <p className="text-2xl font-black text-gray-900">{weightTrend.bmiCategory || 'Normal'}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
