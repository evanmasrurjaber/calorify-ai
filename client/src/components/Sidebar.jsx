import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  Camera,
  CalendarDays,
  ShoppingCart,
  BookmarkCheck,
  FileText,
  LogOut,
  Crown,
  Menu,
  X,
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  const userMenuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Progress & Wearables', path: '/wearable', icon: TrendingUp },
    { name: 'Monthly Report', path: '/monthly-report', icon: FileText },
    { name: 'AI Food Scanner', path: '/meal-log', icon: Camera },
    { name: 'Diet Planner', path: '/diet-plan', icon: CalendarDays },
    { name: 'Shopping List', path: '/shopping-list', icon: ShoppingCart },
    { name: 'Medical Reports', path: '/medical-report', icon: FileText },
    { name: 'Recipe Library', path: '/bookmarks', icon: BookmarkCheck },
  ];

  const adminMenuItems = [
    { name: 'Admin Dashboard', path: '/admin', icon: LayoutDashboard },
  ];

  const menuItems = user?.role === 'admin' ? adminMenuItems : userMenuItems;
  const isProfileActive = location.pathname === '/profile';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ─── Navigation Menu List helper (shared between Desktop & Mobile) ──────────
  const renderNavMenu = (onItemClick) => (
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
              onClick={onItemClick}
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
  );

  // ─── User & Upgrade Footer helper (shared between Desktop & Mobile) ─────────
  const renderFooter = (onItemClick) => (
    <div className="p-4 border-t border-[#e1e2e8] space-y-3 bg-[#fafbff]">
      {/* Upgrade Card — only shown for non-pro members */}
      {!user?.isPro && (
        <Link
          to="/subscription"
          onClick={onItemClick}
          className="w-full bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white text-xs font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#10B981]/25 group hover:scale-[1.02]"
        >
          <Crown size={16} className="text-yellow-300 group-hover:rotate-12 transition-transform" />
          <span>Upgrade to Pro</span>
        </Link>
      )}

      {/* Clean User Profile Card */}
      {user && (
        <div
          className={`flex items-center justify-between gap-3 p-2.5 rounded-2xl border transition-all ${
            isProfileActive
              ? 'bg-[#10B981]/10 border-[#10B981]/30 shadow-xs'
              : 'bg-white border-[#e1e2e8] shadow-xs'
          }`}
        >
          <Link
            to="/profile"
            onClick={onItemClick}
            className="flex items-center gap-3 min-w-0 flex-1 group"
            title="View My Profile"
          >
            {/* Profile Avatar with Pro Badge */}
            <div className="relative shrink-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#10B981] to-[#006c49] flex items-center justify-center text-white font-black text-sm shadow-xs group-hover:scale-105 transition-transform">
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              {user.isPro && (
                <div
                  className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-yellow-950 rounded-full flex items-center justify-center shadow-xs border border-white"
                  title="Pro Member"
                >
                  <Crown size={9} className="fill-yellow-950 text-yellow-950" />
                </div>
              )}
            </div>

            {/* User Name */}
            <div className="min-w-0 flex flex-col text-left">
              <span className="text-xs font-bold text-[#0F172A] truncate leading-tight group-hover:text-[#10B981] transition-colors">
                {user.name}
              </span>
            </div>
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="text-[#565e74] hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition shrink-0"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ── 1. Mobile Top Navbar (visible on mobile only) ── */}
      <header className="md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#e1e2e8] px-4 py-3 flex items-center justify-between shadow-xs">
        {/* Left: Brand Logo */}
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#10B981]/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-[#10B981] fill-[#10B981]" viewBox="0 0 24 24">
              <path d="M12 2.5C9.8 5.2 8.7 8.3 8.9 11.3c1 .6 2 1.3 3.1 2.2 1.1-.9 2.1-1.6 3.1-2.2.2-3-.9-6.1-3.1-8.8z" />
              <path d="M11.3 14.3c-1.5-1.4-3.3-2.4-5.3-2.8-.4 2.6.4 5.2 2.1 6.9 1.7 1.7 4.3 2.5 6.9 2.1-.5-2 1.5-3.9 3.7-6.2z" />
              <path d="M12.7 14.3c1.5-1.4 3.3-2.4 5.3-2.8.4 2.6-.4 5.2-2.1 6.9-1.7 1.7-4.3 2.5-6.9 2.1.5-2 1.5-3.9 3.7-6.2z" />
            </svg>
          </div>
          <span className="text-lg font-extrabold text-[#0F172A] tracking-tight">Calorify</span>
        </Link>

        {/* Right: Hamburger Menu Icon */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 rounded-xl text-[#0F172A] hover:bg-[#f8f9ff] active:scale-95 transition"
          aria-label="Open Navigation Menu"
        >
          <Menu size={22} className="text-[#0F172A]" />
        </button>
      </header>

      {/* ── 2. Mobile Slide-out Drawer (Backdrop + Sidebar) ── */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 transition-opacity duration-300 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Drawer Header with Close Button */}
          <div className="p-5 pb-4 flex items-center justify-between border-b border-[#e1e2e8]/70">
            <Link
              to="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-[#10B981] fill-[#10B981]" viewBox="0 0 24 24">
                  <path d="M12 2.5C9.8 5.2 8.7 8.3 8.9 11.3c1 .6 2 1.3 3.1 2.2 1.1-.9 2.1-1.6 3.1-2.2.2-3-.9-6.1-3.1-8.8z" />
                  <path d="M11.3 14.3c-1.5-1.4-3.3-2.4-5.3-2.8-.4 2.6.4 5.2 2.1 6.9 1.7 1.7 4.3 2.5 6.9 2.1-.5-2 1.5-3.9 3.7-6.2z" />
                  <path d="M12.7 14.3c1.5-1.4 3.3-2.4 5.3-2.8.4 2.6-.4 5.2-2.1 6.9-1.7 1.7-4.3 2.5-6.9 2.1.5-2 1.5-3.9 3.7-6.2z" />
                </svg>
              </div>
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Calorify</h1>
            </Link>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-xl text-[#565e74] hover:text-[#0F172A] hover:bg-[#f8f9ff] active:scale-95 transition"
              aria-label="Close Navigation Menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="py-3">
            {renderNavMenu(() => setMobileOpen(false))}
          </div>
        </div>

        {renderFooter(() => setMobileOpen(false))}
      </aside>

      {/* ── 3. Desktop Fixed Sidebar (visible on md+ screens) ── */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#e1e2e8] flex-col justify-between shrink-0 h-screen sticky top-0 z-30 select-none shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Brand Logo Header */}
          <div className="p-6 pb-6">
            <Link to="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105">
                <svg
                  className="w-5 h-5 text-[#10B981] fill-[#10B981] block"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2.5C9.8 5.2 8.7 8.3 8.9 11.3c1 .6 2 1.3 3.1 2.2 1.1-.9 2.1-1.6 3.1-2.2.2-3-.9-6.1-3.1-8.8z" />
                  <path d="M11.3 14.3c-1.5-1.4-3.3-2.4-5.3-2.8-.4 2.6.4 5.2 2.1 6.9 1.7 1.7 4.3 2.5 6.9 2.1-.5-2 1.5-3.9 3.7-6.2z" />
                  <path d="M12.7 14.3c1.5-1.4 3.3-2.4 5.3-2.8.4 2.6-.4 5.2-2.1 6.9-1.7 1.7-4.3 2.5-6.9 2.1.5-2 1.5-3.9 3.7-6.2z" />
                </svg>
              </div>
              <h1 className="text-xl font-extrabold text-[#0F172A] tracking-tight leading-none">
                Calorify
              </h1>
            </Link>
          </div>

          {renderNavMenu()}
        </div>

        {renderFooter()}
      </aside>
    </>
  );
}
