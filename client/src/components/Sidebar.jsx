import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  Watch,
  Camera,
  CalendarDays,
  ShoppingCart,
  BookmarkCheck,
  User,
  Sparkles,
  LogOut,
  Crown
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const userMenuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Progress & Wearables', path: '/wearable', icon: TrendingUp },
    { name: 'Daily Challenges', path: '/challenges', icon: Watch },
    { name: 'AI Food Scanner', path: '/meal-log', icon: Camera },
    { name: 'Diet Planner', path: '/diet-plan', icon: CalendarDays },
    { name: 'Shopping List', path: '/shopping-list', icon: ShoppingCart },
    { name: 'Recipe Library', path: '/bookmarks', icon: BookmarkCheck },
    { name: 'My Profile', path: '/profile', icon: User },
  ];

  const adminMenuItems = [
    { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : userMenuItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-[#e1e2e8] flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Brand Logo Header */}
        <div className="p-6 pb-6">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
              <svg
                className="w-5 h-5 text-[#10B981] fill-[#10B981] block"
                viewBox="0 0 24 24"
              >
                {/* Center top leaf */}
                <path d="M12 2.5C9.8 5.2 8.7 8.3 8.9 11.3c1 .6 2 1.3 3.1 2.2 1.1-.9 2.1-1.6 3.1-2.2.2-3-.9-6.1-3.1-8.8z" />
                {/* Left bottom leaf */}
                <path d="M11.3 14.3c-1.5-1.4-3.3-2.4-5.3-2.8-.4 2.6.4 5.2 2.1 6.9 1.7 1.7 4.3 2.5 6.9 2.1-.5-2-1.5-3.9-3.7-6.2z" />
                {/* Right bottom leaf (perfect reflection) */}
                <path d="M12.7 14.3c1.5-1.4 3.3-2.4 5.3-2.8.4 2.6-.4 5.2-2.1 6.9-1.7 1.7-4.3 2.5-6.9 2.1.5-2 1.5-3.9 3.7-6.2z" />
              </svg>
            </div>
            <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight leading-none">
              Calorify
            </h1>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="px-3 space-y-1 flex-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <div key={item.path} className="relative">
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-7 bg-[#10B981] rounded-r-full" />
                )}
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#10B981]/10 text-[#006c49] font-bold shadow-xs'
                      : 'text-[#565e74] hover:bg-[#f8f9ff] hover:text-[#0F172A] hover:scale-[1.02]'
                  }`}
                >
                  <Icon
                    size={19}
                    className={`shrink-0 transition-colors ${
                      isActive ? 'text-[#10B981]' : 'text-[#565e74]'
                    }`}
                  />
                  <span className="tracking-tight">{item.name}</span>
                </Link>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Upgrade & Profile Section */}
      <div className="p-4 border-t border-[#e1e2e8] space-y-3 bg-[#fafbff]">
        {/* Upgrade Card */}
        <Link
          to="/subscription"
          className="w-full bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white text-xs font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#10B981]/25 group hover:scale-[1.02]"
        >
          <Crown size={16} className="text-yellow-300 group-hover:rotate-12 transition-transform" />
          <span>Upgrade to Pro</span>
        </Link>

        {/* User Profile info */}
        {user && (
          <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-[#e1e2e8] shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#10B981] to-[#006c49] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="text-xs font-bold text-[#0F172A] truncate leading-tight">{user.name}</span>
                <span className="text-[10px] text-[#565e74] font-medium">{user.points || 0} pts</span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#565e74] hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition shrink-0"
              title="Sign Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
