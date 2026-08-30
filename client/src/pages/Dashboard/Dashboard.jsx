import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getActiveDietPlan } from '../../services/dietPlanService';
import { getDailyLog, logMealText } from '../../services/mealLogService';
import { getUserProfile } from '../../services/userService';
import {
  TrendingUp,
  Scale,
  Target,
  Activity,
  Zap,
  Flame,
  Utensils,
  Star,
  Settings,
  Calendar,
  Sparkles,
  Plus,
  Award,
  FileText,
  Sunrise,
  Sun,
  Moon,
  Apple,
  Info,
  TrendingDown,
  Dumbbell,
  Edit3,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

// Helper: Get local YYYY-MM-DD string without UTC timezone offset errors
const formatLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Auto-calculate personalized TDEE calorie need from user metrics (Mifflin-St Jeor)
const computeDynamicTDEE = (u) => {
  if (!u) return 2000;
  const weight = Number(u.weight);
  const height = Number(u.height);
  const age = Number(u.age);

  if (!weight || !height || !age) {
    return u.dailyCalorieTarget && u.dailyCalorieTarget !== 2000 ? u.dailyCalorieTarget : 2000;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
  };

  const genderConstant =
    u.gender === 'male' ? 5 :
    u.gender === 'female' ? -161 : -78;

  const bmr = 10 * weight + 6.25 * height - 5 * age + genderConstant;
  const multiplier = activityMultipliers[u.activityLevel] || 1.2;
  let tdee = Math.round(bmr * multiplier);

  if (u.goal === 'lose_weight') tdee = Math.round(tdee * 0.85);
  if (u.goal === 'gain_muscle') tdee = Math.round(tdee * 1.10);

  return Math.max(tdee, 1200);
};

export default function Dashboard() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState(null);
  
  // Diet plan state
  const [todayDietPlan, setTodayDietPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Daily intake tracker states
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [weeklyTotals, setWeeklyTotals] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [weeklyDaysLogged, setWeeklyDaysLogged] = useState(0);
  const [trackerLoading, setTrackerLoading] = useState(false);

  // Quick 1-Click logging state from Today's Meal Plan
  const [loggingIndex, setLoggingIndex] = useState(null);
  const [loggedIndices, setLoggedIndices] = useState({});

  const getGoalLabel = (goal) => {
    switch (goal) {
      case 'lose_weight': return 'Lose Weight';
      case 'gain_muscle': return 'Gain Muscle';
      default: return 'Maintain Weight';
    }
  };

  // Generate calendar days for date selector (today + previous 6 days)
  const calendarDays = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = formatLocalDate(d);
      list.push({
        dateStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        isToday: i === 0,
      });
    }
    return list;
  }, []);

  // Format week range string based on a date in that week
  const getWeekRangeLabel = (dateStr) => {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    const anchor = y && m && d ? new Date(y, m - 1, d) : new Date();
    const dayOfWeek = anchor.getDay(); // 0 = Sun, 1 = Mon...
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mon = new Date(anchor);
    mon.setDate(anchor.getDate() + diffToMon);
    return mon.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // Sync latest user profile and auth state on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data } = await getUserProfile();
        if (data) {
          setProfile(data);
          const token = localStorage.getItem('calorify_token');
          if (token) login(data, token);
        }
      } catch (err) {
        console.error('Error syncing profile in dashboard:', err);
      }
    };
    fetchUserData();
  }, []);

  // Fetch active diet plan for the day
  useEffect(() => {
    const fetchDietPlan = async () => {
      try {
        setPlanLoading(true);
        const { data } = await getActiveDietPlan();
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayPlan = data?.plan?.find((d) => d.day === todayName) || null;
        setTodayDietPlan(todayPlan);
      } catch (err) {
        setTodayDietPlan(null);
      } finally {
        setPlanLoading(false);
      }
    };
    fetchDietPlan();
  }, []);

  // Fetch tracker data (daily and weekly aggregated metrics)
  const fetchTrackerData = useCallback(async () => {
    try {
      setTrackerLoading(true);
      
      // Fetch daily intake totals
      const dailyRes = await getDailyLog(selectedDate, 'daily');
      setDailyTotals(dailyRes.data.totals || { calories: 0, carbs: 0, protein: 0, fat: 0 });

      // Fetch weekly totals
      const weeklyRes = await getDailyLog(selectedDate, 'weekly');
      setWeeklyTotals(weeklyRes.data.totals || { calories: 0, carbs: 0, protein: 0, fat: 0 });

      // Count distinct days logged in this week
      const logs = weeklyRes.data.logs || [];
      const distinctDays = new Set(
        logs.map(log => (log.date || log.createdAt).slice(0, 10))
      );
      setWeeklyDaysLogged(distinctDays.size);
    } catch (err) {
      console.error('Error loading tracker data:', err);
    } finally {
      setTrackerLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchTrackerData();
  }, [fetchTrackerData]);

  // Handle 1-Click Quick Log from Today's Meal Plan
  const handleQuickLogMeal = async (meal, idx) => {
    try {
      setLoggingIndex(idx);
      const defaultOrder = ['breakfast', 'lunch', 'snacks', 'dinner'];
      const mealType = (meal.meal || defaultOrder[idx] || 'lunch').toLowerCase();

      await logMealText({
        foodName: meal.name,
        mealType,
        portionDescription: `Planned ${mealType} item from AI Diet Plan`,
        date: selectedDate,
        calories: meal.calories,
        carbs: meal.carbs,
        protein: meal.protein,
        fat: meal.fat,
      });

      // Mark as logged locally
      setLoggedIndices((prev) => ({ ...prev, [idx]: true }));
      // Automatically refresh tracker intake numbers in real-time
      await fetchTrackerData();
    } catch (err) {
      console.error('Quick log meal error:', err);
      alert('Failed to log meal to tracker: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoggingIndex(null);
    }
  };

  // Calorie calculations dynamically auto-computed from active user metrics (Mifflin-St Jeor)
  const targetCalories = useMemo(() => {
    const currentUser = profile || user;
    return computeDynamicTDEE(currentUser);
  }, [profile, user]);

  const consumedCalories = dailyTotals.calories || 0;
  const caloriesLeft = Math.max(targetCalories - consumedCalories, 0);
  const isOverTarget = consumedCalories > targetCalories;
  const calPercent = Math.min(Math.round((consumedCalories / targetCalories) * 100), 100);

  // SVG Circular Gauge calculations
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  // Macro calculations (dynamically computed from today's active plan or balanced macro split)
  const targetProtein = todayDietPlan
    ? todayDietPlan.meals.reduce((sum, m) => sum + (m.protein || 0), 0)
    : Math.round((targetCalories * 0.25) / 4);

  const targetCarbs = todayDietPlan
    ? todayDietPlan.meals.reduce((sum, m) => sum + (m.carbs || 0), 0)
    : Math.round((targetCalories * 0.50) / 4);

  const targetFat = todayDietPlan
    ? todayDietPlan.meals.reduce((sum, m) => sum + (m.fat || 0), 0)
    : Math.round((targetCalories * 0.25) / 9);

  // Excess / Over-eaten checks for macros
  const isProteinOver = dailyTotals.protein > targetProtein;
  const isCarbsOver = dailyTotals.carbs > targetCarbs;
  const isFatOver = dailyTotals.fat > targetFat;
  const hasAnyExcess = isOverTarget || isCarbsOver || isProteinOver || isFatOver;

  const mealIconComponents = {
    breakfast: { Icon: Sunrise, color: 'bg-amber-50 text-amber-600 border-amber-200' },
    lunch:     { Icon: Sun,     color: 'bg-orange-50 text-orange-600 border-orange-200' },
    snacks:    { Icon: Apple,   color: 'bg-rose-50 text-rose-600 border-rose-200' },
    dinner:    { Icon: Moon,    color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  };

  const getMealTypeLabel = (meal, idx) => {
    const raw = (meal?.meal || '').toLowerCase().trim();
    if (raw === 'breakfast') return 'Breakfast';
    if (raw === 'lunch') return 'Lunch';
    if (raw === 'snacks' || raw === 'snack') return 'Snacks';
    if (raw === 'dinner') return 'Dinner';
    const defaultOrder = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
    return defaultOrder[idx] || 'Meal';
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Sparkles size={24} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Track your meals, daily habit challenges, and generate custom diet plans with AI.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/diet-plan"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <Zap size={16} />
            Generate Diet Plan
          </Link>
          <Link
            to={`/meal-log?date=${selectedDate}`}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition active:scale-95"
          >
            <Plus size={16} />
            Log Meal
          </Link>
        </div>
      </div>

      {/* Grid Layout: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Daily Intake Tracker (Gauge + Macros + Weekly Aggregate) - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">

          {/* Daily Tracker Card */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Header: Title + Date Filter Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider bg-emerald-50 px-3 py-1 rounded-md">
                  Daily Intake Tracker
                </span>
                <h2 className="text-xl font-extrabold text-gray-900 mt-2">
                  Calorie & Macro Progress
                </h2>
              </div>

              {/* Date Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                {calendarDays.map((item) => {
                  const isSelected = selectedDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      onClick={() => setSelectedDate(item.dateStr)}
                      className={`flex flex-col items-center justify-center min-w-[48px] py-1.5 px-2 rounded-2xl border transition-all text-center ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 font-bold'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      <span className={`text-[9px] uppercase font-bold ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                        {item.isToday ? 'Today' : item.dayName}
                      </span>
                      <span className="text-xs font-black mt-0.5">{item.dayNum}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Over-eaten / Excess Caution Warning Banner */}
            {hasAnyExcess && (
              <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-start gap-3.5 text-rose-900 shadow-xs animate-fade-in">
                <span className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle size={18} />
                </span>
                <div className="space-y-1 text-xs">
                  <p className="font-extrabold text-sm text-rose-900">
                    Caution! Over-Eaten Today ⚠️
                  </p>
                  <p className="font-medium text-rose-700 leading-relaxed">
                    You have exceeded your daily recommended nutritional targets:
                  </p>
                  <ul className="space-y-0.5 mt-1 text-[11px] font-bold text-rose-800">
                    {isOverTarget && (
                      <li className="flex items-center gap-1">
                        • <span>Calories exceeded by <strong>+{consumedCalories - targetCalories} kcal</strong></span>
                      </li>
                    )}
                    {isCarbsOver && (
                      <li className="flex items-center gap-1">
                        • <span>Carbs exceeded by <strong>+{dailyTotals.carbs - targetCarbs}g</strong></span>
                      </li>
                    )}
                    {isProteinOver && (
                      <li className="flex items-center gap-1">
                        • <span>Protein exceeded by <strong>+{dailyTotals.protein - targetProtein}g</strong></span>
                      </li>
                    )}
                    {isFatOver && (
                      <li className="flex items-center gap-1">
                        • <span>Fat exceeded by <strong>+{dailyTotals.fat - targetFat}g</strong></span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {trackerLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
                <span className="text-xs font-bold text-gray-400">Loading daily intake...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-2">
                
                {/* Visual Gauge Column */}
                <div className="flex flex-col items-center justify-center relative">
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                      {/* Background track circle */}
                      <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        stroke="#f1f5f9"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                      />
                      {/* Foreground animated progress circle */}
                      <circle
                        cx="70"
                        cy="70"
                        r={radius}
                        stroke={isOverTarget ? '#f43f5e' : '#10b981'}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        fill="transparent"
                        className="transition-all duration-700 ease-out"
                      />
                    </svg>

                    {/* Centered Gauge Content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-gray-900 leading-none">
                        {consumedCalories}
                      </span>
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mt-1">
                        / {targetCalories} kcal
                      </span>
                      <span className={`text-[10px] font-black uppercase mt-1 px-2 py-0.5 rounded-full ${
                        isOverTarget ? 'bg-rose-100 text-rose-700 font-extrabold' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isOverTarget ? 'Over Target ⚠️' : `${calPercent}% of Goal`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 text-center">
                    <p className={`text-xs font-bold ${isOverTarget ? 'text-rose-600' : 'text-gray-500'}`}>
                      {isOverTarget
                        ? `Exceeded daily target by ${consumedCalories - targetCalories} kcal`
                        : `${caloriesLeft} kcal remaining for today`}
                    </p>
                  </div>
                </div>

                {/* Macronutrient Breakdown Bars */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase text-gray-400 tracking-wider">
                    Macronutrient Distribution
                  </h3>

                  {/* Protein */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700 flex items-center gap-1.5">
                        Protein
                        {isProteinOver && (
                          <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            +{dailyTotals.protein - targetProtein}g over
                          </span>
                        )}
                      </span>
                      <span className={`font-extrabold ${isProteinOver ? 'text-rose-600' : 'text-gray-900'}`}>
                        {dailyTotals.protein}g / {targetProtein}g
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isProteinOver ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min((dailyTotals.protein / targetProtein) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700 flex items-center gap-1.5">
                        Carbs
                        {isCarbsOver && (
                          <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            +{dailyTotals.carbs - targetCarbs}g over
                          </span>
                        )}
                      </span>
                      <span className={`font-extrabold ${isCarbsOver ? 'text-rose-600' : 'text-gray-900'}`}>
                        {dailyTotals.carbs}g / {targetCarbs}g
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCarbsOver ? 'bg-rose-500' : 'bg-amber-400'
                        }`}
                        style={{ width: `${Math.min((dailyTotals.carbs / targetCarbs) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700 flex items-center gap-1.5">
                        Fat
                        {isFatOver && (
                          <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            +{dailyTotals.fat - targetFat}g over
                          </span>
                        )}
                      </span>
                      <span className={`font-extrabold ${isFatOver ? 'text-rose-600' : 'text-gray-900'}`}>
                        {dailyTotals.fat}g / {targetFat}g
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFatOver ? 'bg-rose-500' : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min((dailyTotals.fat / targetFat) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Saved Weekly Aggregate Card */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider bg-emerald-50 px-3 py-1 rounded-md">
                Saved Weekly Aggregate
              </span>
              <h3 className="text-lg font-black text-gray-900 mt-3">This week's intake</h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Week containing {getWeekRangeLabel(selectedDate)}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wide mb-1">Days Logged</p>
                <p className="text-lg font-black text-gray-800">{weeklyDaysLogged}/7</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wide mb-1">Total Cal</p>
                <p className="text-lg font-black text-gray-800">{weeklyTotals.calories}<span className="text-[10px] font-normal text-gray-500 ml-0.5">kcal</span></p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wide mb-1">Daily Avg</p>
                <p className="text-lg font-black text-gray-800">{weeklyDaysLogged > 0 ? Math.round(weeklyTotals.calories / weeklyDaysLogged) : 0}<span className="text-[10px] font-normal text-gray-500 ml-0.5">kcal</span></p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wide mb-1">Protein Total</p>
                <p className="text-lg font-black text-emerald-600">{weeklyTotals.protein}g</p>
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center col-span-2 md:col-span-1">
                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wide mb-1">Carbs Total</p>
                <p className="text-lg font-black text-amber-500">{weeklyTotals.carbs}g</p>
              </div>
            </div>

            <p className="text-[10px] font-medium text-gray-400 leading-relaxed italic border-t border-gray-100 pt-4 flex items-center gap-1.5">
              <Info size={14} className="text-emerald-600 shrink-0" />
              This Monday-Sunday summary is automatically stored whenever a meal is added or removed, ready for the monthly health report.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Active Diet Plan & Metrics (1/3 width) */}
        <div className="space-y-6">
          
          {/* Today's Diet Plan Widget */}
          <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-[#565e74] text-xs font-bold uppercase tracking-wider mb-1">
                  Today's Meal Plan
                </h3>
                <p className="text-[#0F172A] font-bold text-sm">
                  Generated by AI
                </p>
              </div>
              <Link
                to="/diet-plan"
                className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition"
              >
                View Plan →
              </Link>
            </div>

            {planLoading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent" />
                <span className="text-xs text-gray-400">Loading plan...</span>
              </div>
            ) : todayDietPlan ? (
              <div className="space-y-3">
                {todayDietPlan.meals.map((meal, idx) => {
                  const mealType = (meal.meal || ['breakfast', 'lunch', 'snacks', 'dinner'][idx] || 'lunch').toLowerCase();
                  const iconConfig = mealIconComponents[mealType] || {
                    Icon: Utensils,
                    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
                  };
                  const MealIcon = iconConfig.Icon;
                  const typeLabel = getMealTypeLabel(meal, idx);
                  const isLogged = loggedIndices[idx];
                  const isLogging = loggingIndex === idx;

                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center justify-between gap-2.5 transition hover:bg-white hover:border-gray-200"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`p-2 rounded-xl border shrink-0 ${iconConfig.color}`}>
                          <MealIcon size={16} />
                        </span>
                        <div className="min-w-0">
                          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-600 block">
                            {typeLabel}
                          </span>
                          <p className="text-xs font-bold text-gray-800 truncate leading-tight mt-0.5" title={meal.name}>
                            {meal.name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-150">
                          {meal.calories} kcal
                        </span>

                        <button
                          onClick={() => handleQuickLogMeal(meal, idx)}
                          disabled={isLogging}
                          className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-xl transition shadow-xs cursor-pointer ${
                            isLogged
                              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                              : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 hover:border-emerald-300 active:scale-95'
                          }`}
                          title="1-Click Log this planned meal to Dashboard tracker"
                        >
                          {isLogging ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-emerald-600 border-t-transparent" />
                          ) : isLogged ? (
                            <>
                              <CheckCircle2 size={12} />
                              <span>Logged</span>
                            </>
                          ) : (
                            <>
                              <Plus size={12} />
                              <span>Log</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center bg-emerald-50/20 rounded-2xl border border-emerald-100 border-dashed">
                <p className="text-xs font-bold text-[#0F172A] mb-1">No Active Diet Plan</p>
                <Link to="/diet-plan" className="text-xs font-black text-emerald-600 hover:underline mt-1">
                  Generate Personalized Plan
                </Link>
              </div>
            )}
          </div>

          {/* Health Metrics Card */}
          <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[#565e74] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Activity size={16} className="text-emerald-500" /> My Metrics
              </h3>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition"
                title="Edit Health Metrics in Profile"
              >
                <Edit3 size={12} />
                Edit
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                <span className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Weight</span>
                <span className="text-base font-black text-[#0F172A]">{profile?.weight || user?.weight || '--'}<span className="text-[10px] font-bold text-gray-400 ml-0.5">kg</span></span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                <span className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Height</span>
                <span className="text-base font-black text-[#0F172A]">{profile?.height || user?.height || '--'}<span className="text-[10px] font-bold text-gray-400 ml-0.5">cm</span></span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                <span className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Age</span>
                <span className="text-base font-black text-[#0F172A]">{profile?.age || user?.age || '--'}<span className="text-[10px] font-bold text-gray-400 ml-0.5">yrs</span></span>
              </div>
            </div>

            <div className="mt-4 bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-center">
              <span className="block text-[10px] text-emerald-800 font-black uppercase tracking-wider mb-0.5">Daily Calorie Target</span>
              <span className="text-2xl font-black text-emerald-900">
                {targetCalories}
                <span className="text-xs font-bold text-emerald-700 ml-1">kcal</span>
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
              <span className="font-bold text-[#565e74]">Current Goal:</span>
              <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-black text-[10px] uppercase">
                {getGoalLabel(profile?.goal || user?.goal)}
              </span>
            </div>
          </div>

          {/* Quick Navigation Panel */}
          <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-[#565e74] text-xs font-bold uppercase tracking-wider">Quick Navigation</h3>
            <div className="grid grid-cols-2 gap-2.5">
              <Link to="/diet-plan" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 p-3 rounded-2xl text-center transition flex flex-col items-center">
                <Utensils size={20} className="text-gray-400 mb-1.5" />
                <span className="text-[10px] text-gray-700 font-bold">Diet Planner</span>
              </Link>
              <Link to="/challenges" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 p-3 rounded-2xl text-center transition flex flex-col items-center">
                <Award size={20} className="text-amber-500 mb-1.5" />
                <span className="text-[10px] text-gray-700 font-bold">Daily Challenges</span>
              </Link>
              <Link to="/monthly-report" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 p-3 rounded-2xl text-center transition flex flex-col items-center">
                <FileText size={20} className="text-emerald-500 mb-1.5" />
                <span className="text-[10px] text-gray-700 font-bold">Health Report</span>
              </Link>
              <Link to="/meal-log" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 p-3 rounded-2xl text-center transition flex flex-col items-center">
                <TrendingUp size={20} className="text-gray-400 mb-1.5" />
                <span className="text-[10px] text-gray-700 font-bold">AI Scanner</span>
              </Link>
              <Link to="/subscription" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 p-3 rounded-2xl text-center transition flex flex-col items-center">
                <Star size={20} className="text-amber-400 mb-1.5" />
                <span className="text-[10px] text-gray-700 font-bold">Go Premium</span>
              </Link>
              <Link to="/profile" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/30 p-3 rounded-2xl text-center transition flex flex-col items-center">
                <Settings size={20} className="text-gray-400 mb-1.5" />
                <span className="text-[10px] text-gray-700 font-bold">My Profile</span>
              </Link>
            </div>
          </div>

          {/* Habit Streak Promo Panel */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-amber-50 border border-amber-200 text-amber-500 rounded-2xl">
                <Flame size={24} />
              </span>
              <div>
                <h4 className="text-sm font-extrabold text-[#0F172A]">Complete Challenges</h4>
                <p className="text-[11px] font-medium text-[#565e74]">
                  Drink water, count steps, and sleep well to earn points & collect unique health badges!
                </p>
              </div>
            </div>
            <Link
              to="/challenges"
              className="block text-center bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-2xl transition shadow-md shadow-emerald-500/20 active:scale-95"
            >
              Start Challenges
            </Link>
          </div>

        </div>

      </div>

    </div>
  );
}
