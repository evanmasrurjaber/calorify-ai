import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getActiveDietPlan } from '../../services/dietPlanService';
import { TrendingUp, Scale, Target, Activity, Zap, Flame, Utensils, Star, Settings } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [todayData, setTodayData] = useState(null);
  const [planLoading, setPlanLoading] = useState(true);

  const getGoalLabel = (goal) => {
    switch (goal) {
      case 'lose_weight': return 'Lose Weight 📉';
      case 'gain_muscle': return 'Gain Muscle 💪';
      default: return 'Maintain Weight ⚖️';
    }
  };

  useEffect(() => {
    const fetchTodaysPlan = async () => {
      try {
        setPlanLoading(true);
        const { data } = await getActiveDietPlan();
        // Find today's plan by matching day name (e.g. "Monday")
        const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const todayPlan = data?.plan?.find((d) => d.day === todayName) || null;
        setTodayData(todayPlan);
      } catch (err) {
        // No active plan — not an error, just means no plan yet
        setTodayData(null);
      } finally {
        setPlanLoading(false);
      }
    };
    fetchTodaysPlan();
  }, []);

  // Calculate how many calories are planned for today
  const plannedCalories = todayData?.totalCalories || 0;
  const targetCalories = user?.dailyCalorieTarget || 2000;
  const progressPercent = Math.min(Math.round((plannedCalories / targetCalories) * 100), 100);

  const mealIcons = {
    breakfast: '🌅',
    lunch: '☀️',
    snacks: '🍎',
    dinner: '🌙',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
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
                Track your meals, customize plans, and generate recipes with AI.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* ── Today's Diet Plan Widget ── */}
        <div className="lg:col-span-2 bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[#565e74] text-xs font-bold uppercase tracking-wider mb-1">
                Today's Meal Plan
              </h3>
              <p className="text-[#0F172A] font-bold text-lg">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link
              to="/diet-plan"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition"
            >
              View Full Plan →
            </Link>
          </div>

          {planLoading ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent"></div>
              <span className="text-sm font-semibold text-gray-500">Loading today's meals...</span>
            </div>
          ) : todayData ? (
            <>
              {/* Meals grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {todayData.meals.map((meal, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50/80 border border-gray-100 p-4 rounded-2xl flex flex-col gap-2 hover:shadow-md transition"
                  >
                    <span className="text-xl">{mealIcons[meal.meal] || '🍽️'}</span>
                    <div>
                      <span className="text-[10px] uppercase font-black text-emerald-600 tracking-wider">
                        {meal.meal}
                      </span>
                      <p className="text-xs font-bold text-gray-800 line-clamp-2 leading-tight mt-0.5">
                        {meal.name}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-600 bg-orange-50 px-2 py-1 rounded-md mt-auto self-start">
                      <Flame size={12} /> {meal.calories} kcal
                    </span>
                  </div>
                ))}
              </div>

              {/* Calorie progress bar */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex justify-between text-xs font-bold text-[#565e74] mb-2">
                  <span>Planned: <span className="text-[#0F172A]">{plannedCalories} kcal</span></span>
                  <span>Target: <span className="text-[#0F172A]">{targetCalories} kcal</span></span>
                </div>
                <div className="w-full bg-[#e1e2e8] rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-400 to-teal-500 h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <p className="text-[10px] font-semibold text-gray-500 mt-2 text-right">{progressPercent}% of daily target</p>
              </div>
            </>
          ) : (
            /* No active plan CTA */
            <div className="flex flex-col items-center justify-center py-10 text-center bg-emerald-50/30 rounded-2xl border border-emerald-100 border-dashed">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-full mb-4">
                <Utensils size={32} />
              </div>
              <p className="text-[#0F172A] font-bold mb-1">No Active Diet Plan</p>
              <p className="text-[#565e74] text-sm mb-5 max-w-sm">
                You don't have an active diet plan yet. Generate your personalized 7-day Bangladeshi meal plan.
              </p>
              <Link
                to="/diet-plan"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold px-6 py-2.5 rounded-xl transition shadow-md shadow-emerald-500/20"
              >
                Generate My Plan
              </Link>
            </div>
          )}
        </div>

        {/* Health Metrics Card */}
        <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-[#565e74] text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" /> My Metrics
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Weight</span>
                <span className="text-lg font-black text-[#0F172A]">{user?.weight || '--'} <span className="text-xs font-semibold text-gray-400">kg</span></span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Height</span>
                <span className="text-lg font-black text-[#0F172A]">{user?.height || '--'} <span className="text-xs font-semibold text-gray-400">cm</span></span>
              </div>
              <div className="bg-gray-50 border border-gray-100 p-3 rounded-2xl text-center">
                <span className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Age</span>
                <span className="text-lg font-black text-[#0F172A]">{user?.age || '--'} <span className="text-xs font-semibold text-gray-400">yrs</span></span>
              </div>
            </div>

            {/* Daily calorie target (now TDEE-calculated) */}
            <div className="mt-4 bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl text-center">
              <span className="block text-xs text-emerald-800 font-bold uppercase tracking-wider mb-1">Daily Calorie Target</span>
              <span className="text-3xl font-black text-emerald-900">
                {user?.dailyCalorieTarget || 2000}
                <span className="text-sm font-semibold text-emerald-700 ml-1">kcal</span>
              </span>
              <p className="text-[10px] font-semibold text-emerald-600 mt-1">TDEE-calculated from your metrics</p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs font-bold text-[#565e74]">Current Goal:</span>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-full font-bold shadow-sm">
              {getGoalLabel(user?.goal)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation & Gamification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-[#e1e2e8] rounded-3xl p-6 shadow-sm">
          <h3 className="text-[#565e74] text-xs font-bold uppercase tracking-wider mb-4">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/diet-plan" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 p-4 rounded-2xl text-center transition group">
              <Utensils size={24} className="mx-auto text-gray-400 group-hover:text-emerald-500 transition mb-2" />
              <span className="text-xs text-gray-700 font-bold">Diet Plan</span>
            </Link>
            <Link to="/profile" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 p-4 rounded-2xl text-center transition group">
              <Settings size={24} className="mx-auto text-gray-400 group-hover:text-emerald-500 transition mb-2" />
              <span className="text-xs text-gray-700 font-bold">Settings</span>
            </Link>
            <Link to="/meal-log" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 p-4 rounded-2xl text-center transition group">
              <TrendingUp size={24} className="mx-auto text-gray-400 group-hover:text-emerald-500 transition mb-2" />
              <span className="text-xs text-gray-700 font-bold">Meal Logs</span>
            </Link>
            <Link to="/subscription" className="bg-gray-50 border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/50 p-4 rounded-2xl text-center transition group">
              <Star size={24} className="mx-auto text-amber-400 group-hover:text-amber-500 transition mb-2" />
              <span className="text-xs text-gray-700 font-bold">Go Premium</span>
            </Link>
          </div>
        </div>

        {/* Gamification & Streaks */}
        <div className="lg:col-span-2 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-100 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
              <span className="text-4xl">🔥</span>
            </div>
            <div>
              <h4 className="text-xl font-black text-[#0F172A] mb-1">Stay Consistent!</h4>
              <p className="text-sm font-medium text-[#565e74]">
                Keep logging your diet plans and weight to unlock the next level badge.
              </p>
            </div>
          </div>
          <Link to="/challenges" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3.5 rounded-2xl transition shadow-md shadow-emerald-500/20 flex-shrink-0 active:scale-95">
            View Habit Challenges
          </Link>
        </div>
      </div>
    </div>
  );
}
