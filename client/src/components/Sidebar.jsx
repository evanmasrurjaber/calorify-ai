import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📋' },
    { name: 'Progress Tracker', path: '/progress', icon: '📈' },
    { name: 'AI Food Scanner', path: '/meal-log', icon: '📸' },
    { name: 'Diet Planner', path: '/diet-plan', icon: '📅' },
    { name: 'Shopping List', path: '/shopping-list', icon: '🛒' },
    { name: 'Recipe Library', path: '/bookmarks', icon: '📖' },
    { name: 'My Profile', path: '/profile', icon: '👤' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-150 flex flex-col justify-between shrink-0 h-screen sticky top-0">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Logo */}
        <div className="p-6">
          <Link to="/dashboard" className="flex items-center gap-3">
            <span className="bg-emerald-600 text-white font-black text-xl h-10 w-10 rounded-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
              C
            </span>
            <span className="text-xl font-extrabold text-gray-900 tracking-tight">
              Calorify
            </span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="px-4 space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Upgrade / Premium Card & Profile at bottom */}
      <div className="p-4 border-t border-gray-100 space-y-4">
        {/* Go Premium Card */}
        <div className="bg-emerald-50/70 border border-emerald-100/50 rounded-2xl p-4 text-center">
          <h4 className="text-xs font-extrabold text-emerald-900 mb-1">Go Premium</h4>
          <p className="text-[10px] text-emerald-700 mb-3 leading-relaxed">
            Unlock unlimited AI food scans & Smart Lab report uploads.
          </p>
          <Link
            to="/subscription"
            className="block w-full bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-sm"
          >
            Upgrade Now
          </Link>
        </div>

        {/* User Profile info */}
        {user && (
          <div className="flex items-center justify-between gap-2 bg-gray-55/50 p-2 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-650 flex items-center justify-center text-white font-bold text-sm shrink-0">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-bold text-gray-900 truncate leading-tight">{user.name}</span>
                <span className="text-[10px] text-gray-400 font-medium">Score: {user.points || 0} pts</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[10px] font-bold text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-gray-100 transition shrink-0"
              title="Sign Out"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
