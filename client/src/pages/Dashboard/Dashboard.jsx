import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  const getGoalLabel = (goal) => {
    switch (goal) {
      case 'lose_weight': return 'Lose Weight 📉';
      case 'gain_muscle': return 'Gain Muscle 💪';
      default: return 'Maintain Weight ⚖️';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header section */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">
          Welcome back, {user?.name}! 👋
        </h1>
        <p className="text-gray-400">Track your meals, customize plans, and generate recipes with AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Calorie Card */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
          <div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Daily Calorie Target</h3>
            <div className="text-5xl font-black text-white mb-2">
              {user?.dailyCalorieTarget || 2000} <span className="text-lg font-normal text-purple-400">kcal</span>
            </div>
            <p className="text-xs text-gray-500">Calculated based on your health metrics & goals.</p>
          </div>
          <div className="mt-6">
            <div className="w-full bg-gray-950 rounded-full h-2.5 border border-gray-800/50">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full" style={{ width: '45%' }}></div>
            </div>
            <div className="flex justify-between text-xs font-medium text-gray-400 mt-2">
              <span>900 consumed</span>
              <span>1100 left</span>
            </div>
          </div>
        </div>

        {/* Health Metrics Card */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-4">My Metrics</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl text-center">
                <span className="block text-xs text-gray-400 font-medium mb-1">Weight</span>
                <span className="text-lg font-bold text-white">{user?.weight || '--'} kg</span>
              </div>
              <div className="bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl text-center">
                <span className="block text-xs text-gray-400 font-medium mb-1">Height</span>
                <span className="text-lg font-bold text-white">{user?.height || '--'} cm</span>
              </div>
              <div className="bg-gray-950/80 border border-gray-800/50 p-3 rounded-2xl text-center">
                <span className="block text-xs text-gray-400 font-medium mb-1">Age</span>
                <span className="text-lg font-bold text-white">{user?.age || '--'} yrs</span>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-gray-800/50 pt-4 flex justify-between items-center">
            <span className="text-xs text-gray-400">Current Goal:</span>
            <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-3 py-1 rounded-full font-semibold">
              {getGoalLabel(user?.goal)}
            </span>
          </div>
        </div>

        {/* Quick Actions / Shortcuts */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 flex flex-col justify-between">
          <div>
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
        </div>
      </div>

      {/* Gamification & Streaks */}
      <div className="bg-gradient-to-r from-purple-900/20 via-indigo-900/10 to-transparent border border-purple-500/10 rounded-3xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🔥</div>
          <div>
            <h4 className="text-lg font-bold text-white">Consistent Streak: 3 Days!</h4>
            <p className="text-sm text-gray-400">Keep logging your diet plans to unlock the next level badge.</p>
          </div>
        </div>
        <Link to="/challenges" className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-6 py-3 rounded-2xl transition">
          View Habit Challenges
        </Link>
      </div>
    </div>
  );
}
