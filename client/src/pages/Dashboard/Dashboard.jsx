import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getActiveDietPlan } from '../../services/dietPlanService';

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
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-400">Track your meals, customize plans, and generate recipes with AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

        {/* ── Today's Diet Plan Widget (replaces hardcoded calorie bar) ── */}
        <div className="lg:col-span-2 bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Today's Meal Plan
              </h3>
              <p className="text-white font-bold text-lg">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <Link
              to="/diet-plan"
              className="text-xs font-semibold text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 px-3 py-1.5 rounded-xl transition"
            >
              View Full Plan →
            </Link>
          </div>

          {planLoading ? (
            <div className="flex items-center gap-3 py-6">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500 flex-shrink-0"></div>
              <span className="text-sm text-gray-400">Loading today's meals...</span>
            </div>
          ) : todayData ? (
            <>
              {/* Meals grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {todayData.meals.map((meal, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl flex flex-col gap-1"
                  >
                    <span className="text-base">{mealIcons[meal.meal] || '🍽️'}</span>
                    <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                      {meal.meal}
                    </span>
                    <p className="text-xs font-semibold text-white line-clamp-2 leading-tight">
                      {meal.name}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-auto">🔥 {meal.calories} kcal</span>
                  </div>
                ))}
              </div>

              {/* Calorie progress bar */}
              <div>
                <div className="flex justify-between text-xs font-medium text-gray-400 mb-2">
                  <span>Planned: <strong className="text-white">{plannedCalories} kcal</strong></span>
                  <span>Target: <strong className="text-white">{targetCalories} kcal</strong></span>
                </div>
                <div className="w-full bg-gray-950 rounded-full h-2.5 border border-gray-800/50">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-700"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
                <p className="text-[10px] text-gray-600 mt-1 text-right">{progressPercent}% of daily target</p>
              </div>
            </>
          ) : (
            /* No active plan CTA */
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="text-4xl mb-3">📅</div>
              <p className="text-gray-400 text-sm mb-4 max-w-xs">
                You don't have an active diet plan yet. Generate your personalized 7-day Bangladeshi meal plan.
              </p>
              <Link
                to="/diet-plan"
                className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition shadow-lg shadow-purple-500/20"
              >
                Generate My Plan 🚀
              </Link>
            </div>
          )}
        </div>

        {/* Health Metrics Card */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">My Metrics</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl text-center">
                <span className="block text-xs text-gray-400 font-medium mb-1">Weight</span>
                <span className="text-lg font-bold text-white">{user?.weight || '--'} <span className="text-xs font-normal text-gray-500">kg</span></span>
              </div>
              <div className="bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl text-center">
                <span className="block text-xs text-gray-400 font-medium mb-1">Height</span>
                <span className="text-lg font-bold text-white">{user?.height || '--'} <span className="text-xs font-normal text-gray-500">cm</span></span>
              </div>
              <div className="bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl text-center">
                <span className="block text-xs text-gray-400 font-medium mb-1">Age</span>
                <span className="text-lg font-bold text-white">{user?.age || '--'} <span className="text-xs font-normal text-gray-500">yrs</span></span>
              </div>
            </div>

            {/* Daily calorie target (now TDEE-calculated) */}
            <div className="mt-4 bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl text-center">
              <span className="block text-xs text-gray-400 font-medium mb-1">Daily Calorie Target</span>
              <span className="text-2xl font-black text-white">
                {user?.dailyCalorieTarget || 2000}{' '}
                <span className="text-sm font-normal text-purple-400">kcal</span>
              </span>
              <p className="text-[10px] text-gray-600 mt-0.5">TDEE-calculated from your metrics</p>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-800/50 pt-4 flex justify-between items-center">
            <span className="text-xs text-gray-400">Current Goal:</span>
            <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full font-semibold">
              {getGoalLabel(user?.goal)}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6">
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Quick Navigation</h3>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/diet-plan" className="bg-gray-950/80 border border-gray-800/50 hover:border-purple-500/50 p-3 rounded-2xl text-center transition">
              <span className="block text-lg">📅</span>
              <span className="text-xs text-gray-300 font-semibold">Diet Plan</span>
            </Link>
            <Link to="/profile" className="bg-gray-950/80 border border-gray-800/50 hover:border-purple-500/50 p-3 rounded-2xl text-center transition">
              <span className="block text-lg">⚙️</span>
              <span className="text-xs text-gray-300 font-semibold">Settings</span>
            </Link>
            <Link to="/meal-log" className="bg-gray-950/80 border border-gray-800/50 hover:border-purple-500/50 p-3 rounded-2xl text-center transition">
              <span className="block text-lg">🍲</span>
              <span className="text-xs text-gray-300 font-semibold">Meal Logs</span>
            </Link>
            <Link to="/subscription" className="bg-gray-950/80 border border-gray-800/50 hover:border-purple-500/50 p-3 rounded-2xl text-center transition">
              <span className="block text-lg">💎</span>
              <span className="text-xs text-gray-300 font-semibold">Go Premium</span>
            </Link>
          </div>
        </div>

        {/* Gamification & Streaks */}
        <div className="lg:col-span-2 bg-gradient-to-r from-purple-900/20 via-indigo-900/10 to-transparent border border-purple-500/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-4xl">🔥</div>
            <div>
              <h4 className="text-lg font-bold text-white">Stay Consistent!</h4>
              <p className="text-sm text-gray-400">Keep logging your diet plans to unlock the next level badge.</p>
            </div>
          </div>
          <Link to="/challenges" className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-6 py-3 rounded-2xl transition flex-shrink-0">
            View Habit Challenges
          </Link>
        </div>
      </div>
    </div>
  );
}
