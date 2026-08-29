import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getActiveDietPlan } from '../../services/dietPlanService';
import { getDailyLog } from '../../services/mealLogService';
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
  FileText
} from 'lucide-react';

// Helper: Get local YYYY-MM-DD string without UTC timezone offset errors
const formatLocalDate = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  
  // Diet plan state
  const [todayDietPlan, setTodayDietPlan] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Daily intake tracker states
  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));
  const [dailyTotals, setDailyTotals] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [weeklyTotals, setWeeklyTotals] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [weeklyDaysLogged, setWeeklyDaysLogged] = useState(0);
  const [trackerLoading, setTrackerLoading] = useState(false);

  const getGoalLabel = (goal) => {
    switch (goal) {
      case 'lose_weight': return 'Lose Weight 📉';
      case 'gain_muscle': return 'Gain Muscle 💪';
      default: return 'Maintain Weight ⚖️';
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
  useEffect(() => {
    const fetchTrackerData = async () => {
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
    };
    fetchTrackerData();
  }, [selectedDate]);

  // Calorie calculations
  const targetCalories = user?.dailyCalorieTarget || 2000;
  const consumedCalories = dailyTotals.calories || 0;
  const caloriesLeft = Math.max(targetCalories - consumedCalories, 0);
  const isOverTarget = consumedCalories > targetCalories;
  const calPercent = Math.min(Math.round((consumedCalories / targetCalories) * 100), 100);

  // SVG Circular Gauge calculations
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (calPercent / 100) * circumference;

  // Macro calculations (custom targets based on healthy balance)
  const targetProtein = 100;
  const targetCarbs = 250;
  const targetFat = 67;

  const mealIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    snacks: '🍎',
    dinner: '🌙',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <span className="text-2xl">👋</span>
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
      </div>

      {/* Date Calendar Row */}
      <div className="bg-white border border-gray-150 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#565e74] flex items-center gap-1.5">
            <Calendar size={14} className="text-emerald-500" /> Meal Log Calendar
          </span>
          <span className="text-xs font-semibold text-gray-400">
            Select a date to view or update intake
          </span>
        </div>
        
        {/* Calendar Horizontal Selector */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto py-1 scrollbar-none">
          {calendarDays.map((day) => {
            const isSelected = selectedDate === day.dateStr;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex-1 min-w-[60px] py-3 rounded-2xl text-center border transition-all duration-200 ${
                  isSelected
                    ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20 scale-[1.02]'
                    : 'bg-gray-50 border-gray-100 hover:border-gray-300 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">{day.dayName}</p>
                <p className="text-lg font-black mt-0.5">{day.dayNum}</p>
                {day.isToday && (
                  <span className={`block w-1.5 h-1.5 rounded-full mx-auto mt-1 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Daily Intake Tracker & Weekly Summary (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Daily Intake Dashboard */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-1">
                  Daily Intake Tracker
                </h3>
                <h2 className="text-xl font-bold text-gray-900">
                  {new Date(selectedDate.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
              </div>
              <Link
                to={`/meal-log?date=${selectedDate}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2.5 rounded-xl transition"
              >
                <Plus size={14} /> Log Meals
              </Link>
            </div>

            {trackerLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-500 border-t-transparent" />
                <p className="text-sm text-gray-400 font-semibold">Fetching intake details...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* SVG circular calories gauge (5 columns) */}
                <div className="md:col-span-5 flex flex-col items-center justify-center p-4 border border-gray-50 bg-gray-50/30 rounded-3xl">
                  <div className="relative w-40 h-40">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 140 140">
                      {/* Background circle */}
                      <circle
                        className="text-gray-100"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="70"
                        cy="70"
                      />
                      {/* Indicator circle */}
                      <circle
                        className="text-emerald-500 transition-all duration-700"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx="70"
                        cy="70"
                      />
                    </svg>
                    {/* Centered calorie text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-2xl font-black text-gray-900 tabular-nums">
                        {consumedCalories.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase font-black tracking-wider mt-0.5">
                        kcal consumed
                      </span>
                    </div>
                  </div>
                  <div className="text-center mt-3 space-y-0.5">
                    {isOverTarget ? (
                      <p className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full">
                        🚨 {Math.abs(targetCalories - consumedCalories)} kcal over target
                      </p>
                    ) : (
                      <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                        ⭐ {caloriesLeft.toLocaleString()} kcal left
                      </p>
                    )}
                  </div>
                </div>

                {/* Macro progress bars (7 columns) */}
                <div className="md:col-span-7 space-y-5 p-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Macronutrients Breakdown</h4>
                  
                  {/* Protein */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700">Protein</span>
                      <span className="text-gray-900 font-extrabold">{dailyTotals.protein}g / {targetProtein}g</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((dailyTotals.protein / targetProtein) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700">Carbs</span>
                      <span className="text-gray-900 font-extrabold">{dailyTotals.carbs}g / {targetCarbs}g</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((dailyTotals.carbs / targetCarbs) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-gray-700">Fat</span>
                      <span className="text-gray-900 font-extrabold">{dailyTotals.fat}g / {targetFat}g</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-rose-400 h-full rounded-full transition-all duration-500"
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

            <p className="text-[10px] font-medium text-gray-400 leading-relaxed italic border-t border-gray-100 pt-4">
              ℹ️ This Monday-Sunday summary is automatically stored whenever a meal is added or removed, ready for the monthly health report.
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
                {todayDietPlan.meals.map((meal, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 border border-gray-100 p-3 rounded-2xl flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{mealIcons[meal.meal] || '🍽️'}</span>
                      <div className="min-w-0">
                        <span className="text-[9px] uppercase font-bold text-emerald-600 block">{meal.meal}</span>
                        <p className="text-xs font-bold text-gray-800 truncate leading-tight mt-0.5">{meal.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md shrink-0">
                      {meal.calories} kcal
                    </span>
                  </div>
                ))}
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
            <h3 className="text-[#565e74] text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" /> My Metrics
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                <span className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Weight</span>
                <span className="text-base font-black text-[#0F172A]">{user?.weight || '--'}<span className="text-[10px] font-bold text-gray-400 ml-0.5">kg</span></span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                <span className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Height</span>
                <span className="text-base font-black text-[#0F172A]">{user?.height || '--'}<span className="text-[10px] font-bold text-gray-400 ml-0.5">cm</span></span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-2xl text-center">
                <span className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Age</span>
                <span className="text-base font-black text-[#0F172A]">{user?.age || '--'}<span className="text-[10px] font-bold text-gray-400 ml-0.5">yrs</span></span>
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
                {getGoalLabel(user?.goal)}
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
              <span className="text-3xl">🔥</span>
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
