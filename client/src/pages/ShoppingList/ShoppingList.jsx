import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  RefreshCw,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Sparkles,
  AlertTriangle,
  Package,
  Calendar,
  AlertCircle,
  Beef,
  Salad,
  Wheat,
  Egg,
  Flame,
  Droplets,
  Apple,
  ShoppingBag,
  ShoppingCart,
  ExternalLink,
  Store,
} from 'lucide-react';
import BgShader from '../../components/BgShader';
import {
  getShoppingList,
  clearShoppingListCache,
  toggleCheckedItem,
  clearAllChecked,
  MARKETPLACE_PLATFORMS,
  buildMarketplaceUrl,
  getStoredMarketplace,
  setStoredMarketplace,
} from '../../services/shoppingListService';

// ─── Category icon & colour configuration ─────────────────────────────────────
const CATEGORY_META = {
  'Proteins': {
    icon: Beef,
    color: 'bg-amber-50 border-amber-200/70 text-amber-600',
    badge: 'bg-amber-100 text-amber-800',
  },
  'Vegetables': {
    icon: Salad,
    color: 'bg-emerald-50 border-emerald-200/70 text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  'Grains & Legumes': {
    icon: Wheat,
    color: 'bg-yellow-50 border-yellow-200/70 text-yellow-700',
    badge: 'bg-yellow-100 text-yellow-800',
  },
  'Dairy & Eggs': {
    icon: Egg,
    color: 'bg-blue-50 border-blue-200/70 text-blue-600',
    badge: 'bg-blue-100 text-blue-800',
  },
  'Spices & Condiments': {
    icon: Flame,
    color: 'bg-red-50 border-red-200/70 text-red-600',
    badge: 'bg-red-100 text-red-800',
  },
  'Oils & Fats': {
    icon: Droplets,
    color: 'bg-lime-50 border-lime-200/70 text-lime-700',
    badge: 'bg-lime-100 text-lime-800',
  },
  'Fruits': {
    icon: Apple,
    color: 'bg-pink-50 border-pink-200/70 text-pink-600',
    badge: 'bg-pink-100 text-pink-800',
  },
  'Other': {
    icon: ShoppingBag,
    color: 'bg-gray-50 border-gray-200/60 text-gray-600',
    badge: 'bg-gray-200 text-gray-700',
  },
};

const getCategoryMeta = (name) =>
  CATEGORY_META[name] || {
    icon: Package,
    color: 'bg-gray-50 border-gray-200/60 text-gray-600',
    badge: 'bg-gray-200 text-gray-700',
  };

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="h-5 w-40 bg-[#f2f3f9] rounded-lg" />
            <div className="h-5 w-12 bg-[#f2f3f9] rounded-full" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center justify-between">
                <div className="h-4 w-1/2 bg-[#f2f3f9] rounded-md" />
                <div className="h-4 w-16 bg-[#f2f3f9] rounded-md" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ShoppingList() {
  const [data, setData]                       = useState(null);   // { upToDate, planId, checkedItems, categories }
  const [loading, setLoading]                 = useState(true);
  const [refreshing, setRefreshing]           = useState(false);
  const [error, setError]                     = useState('');
  const [toggling, setToggling]               = useState({});     // optimistic lock per item key
  const [collapsed, setCollapsed]             = useState({});
  const [clearingAll, setClearingAll]         = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(getStoredMarketplace); // Online Marketplace dropdown selection

  // Local checked set — mirrors DB, updated optimistically
  const [localChecked, setLocalChecked] = useState(new Set());

  // Sync local set whenever API data changes
  useEffect(() => {
    if (data?.checkedItems) setLocalChecked(new Set(data.checkedItems));
  }, [data]);

  // ── Handle Marketplace Platform Dropdown change ──
  const handlePlatformChange = (platform) => {
    setSelectedPlatform(platform);
    setStoredMarketplace(platform);
  };

  // ── Fetch (or auto-generate) the shopping list ──
  const fetchList = useCallback(async (bustCache = false) => {
    try {
      if (bustCache) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      if (bustCache) await clearShoppingListCache();
      const { data: res } = await getShoppingList();
      setData(res);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load shopping list. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  // ── Toggle a single item with optimistic UI ──
  const handleToggle = async (key) => {
    if (toggling[key]) return;

    setLocalChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
    setToggling((prev) => ({ ...prev, [key]: true }));

    try {
      const { data: res } = await toggleCheckedItem(key);
      setLocalChecked(new Set(res.checkedItems));
      setData((prev) => prev ? { ...prev, checkedItems: res.checkedItems } : prev);
    } catch (err) {
      // Revert on failure
      setLocalChecked((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
      console.error('Failed to toggle item:', err);
    } finally {
      setToggling((prev) => ({ ...prev, [key]: false }));
    }
  };

  // ── Uncheck all ──
  const handleClearAll = async () => {
    if (clearingAll) return;
    setClearingAll(true);
    setLocalChecked(new Set());
    try {
      await clearAllChecked();
      setData((prev) => prev ? { ...prev, checkedItems: [] } : prev);
    } catch (err) {
      console.error('Failed to clear checked items:', err);
    } finally {
      setClearingAll(false);
    }
  };

  const toggleCollapse = (name) =>
    setCollapsed((prev) => ({ ...prev, [name]: !prev[name] }));

  // ── Progress stats ──
  const allKeys      = data?.categories?.flatMap((c) => c.items.map((i) => `${c.name}|${i.name}`)) || [];
  const totalItems   = allKeys.length;
  const checkedCount = allKeys.filter((k) => localChecked.has(k)).length;
  const progressPct  = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  // ─── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="relative min-h-screen">
        <BgShader />
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/80 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="space-y-2">
              <div className="h-4 w-32 bg-[#f2f3f9] rounded-md animate-pulse" />
              <div className="h-8 w-64 bg-[#f2f3f9] rounded-xl animate-pulse" />
              <div className="h-4 w-80 bg-[#f2f3f9] rounded-md animate-pulse" />
            </div>
            <div className="h-12 w-36 bg-[#f2f3f9] rounded-2xl animate-pulse" />
          </div>
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8"><SkeletonLoader /></div>
            <div className="lg:col-span-4">
              <div className="h-80 bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-3xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* WebGL shader background */}
      <BgShader />

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/80 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-6 sm:p-8 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-[#006c49] uppercase tracking-widest bg-[#10B981]/10 px-2.5 py-0.5 rounded-md">
                Weekly Grocery List
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Shopping List
            </h1>
            <p className="text-sm text-[#565e74] font-medium mt-1">
              All ingredients from your 7-day meal plan — deduplicated, consolidated, and grouped by category.
            </p>
          </div>

          {/* ── Marketplace Selection Dropdown (Module 3 Feature 2 — Member 2) ── */}
          <div className="bg-white/95 border border-[#e1e2e8] rounded-2xl p-3 sm:p-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-[#565e74]">
              <Store size={16} className="text-[#10B981]" />
              <span>Preferred Marketplace:</span>
            </div>
            <div className="relative min-w-[140px]">
              <select
                id="marketplace-select"
                value={selectedPlatform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                aria-label="Select preferred online marketplace"
                className="w-full appearance-none bg-[#f8f9ff] hover:bg-[#f2f4ff] border border-[#e1e2e8] text-[#0F172A] font-bold text-xs sm:text-sm rounded-xl pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 transition-all"
              >
                {MARKETPLACE_PLATFORMS.map((platform) => (
                  <option key={platform.id} value={platform.name}>
                    {platform.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#565e74] pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ── Error / No Plan ── */}
        {error && (
          <div className="bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-2xl font-black text-[#0F172A] tracking-tight">No Shopping List Yet</h3>
              <p className="text-sm text-[#565e74] leading-relaxed">{error}</p>
            </div>
            <Link
              to="/diet-plan"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white font-bold px-8 py-3.5 rounded-2xl transition shadow-lg shadow-[#10B981]/25 hover:scale-[1.02] active:scale-95 text-sm"
            >
              <Sparkles size={16} />
              Generate a Diet Plan First
            </Link>
          </div>
        )}

        {/* ── Main Content ── */}
        {data && !error && (
          <>
            {/* ── Stale Warning Banner (shown when upToDate === false AND list exists) ── */}
            {!data.upToDate && data.categories?.length > 0 && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-900">Shopping list may be outdated</p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Your meal plan was updated since this list was last generated. The list below may not reflect the latest meals.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => fetchList(true)}
                  disabled={refreshing}
                  className="shrink-0 flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all disabled:opacity-60 active:scale-95"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Updating...' : 'Update Shopping List'}
                </button>
              </div>
            )}

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">

              {/* ── Left: Category Cards (8 cols) ── */}
              <div className="w-full order-2 lg:order-1 lg:col-span-8 flex flex-col gap-5">
                {/* ── Marketplace Active Banner & Quick Switcher ── */}
                <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-[#e1e2e8] p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 text-[#006c49] flex items-center justify-center shrink-0">
                      <ShoppingCart size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#0F172A]">Online Marketplace:</span>
                        <span className="text-xs font-extrabold text-[#006c49] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded-md">
                          {selectedPlatform}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#565e74] mt-0.5">
                        Click "Buy Online" on any item to open its direct search on {selectedPlatform} in a new tab.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
                    {MARKETPLACE_PLATFORMS.map((platform) => (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => handlePlatformChange(platform.name)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                          selectedPlatform === platform.name
                            ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                            : 'bg-white text-[#565e74] border-[#e1e2e8] hover:border-[#10B981]/50 hover:text-[#0F172A]'
                        }`}
                      >
                        {platform.name}
                      </button>
                    ))}
                  </div>
                </div>

                {data.categories?.map((category, catIdx) => {
                  const meta          = getCategoryMeta(category.name);
                  const IconComponent = meta.icon;
                  const isCollapsed   = collapsed[category.name];
                  const catItems      = category.items || [];
                  const catChecked    = catItems.filter((i) => localChecked.has(`${category.name}|${i.name}`)).length;

                  return (
                    <div
                      key={category.name}
                      className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-[#e1e2e8] overflow-hidden transition-all duration-300 animate-fade-in-up"
                      style={{ animationDelay: `${0.07 * (catIdx + 1)}s` }}
                    >
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCollapse(category.name)}
                        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-[#f8f9ff] transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105 ${meta.color}`}>
                            <IconComponent size={20} />
                          </div>
                          <div className="text-left">
                            <h2 className="text-base font-extrabold text-[#0F172A] tracking-tight">
                              {category.name}
                            </h2>
                            <p className="text-[11px] font-medium text-[#565e74]">
                              {catChecked} of {catItems.length} item{catItems.length !== 1 ? 's' : ''} checked
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${meta.badge}`}>
                            {catItems.length}
                          </span>
                          {isCollapsed
                            ? <ChevronDown size={18} className="text-[#565e74] group-hover:text-[#0F172A] transition-colors" />
                            : <ChevronUp   size={18} className="text-[#565e74] group-hover:text-[#0F172A] transition-colors" />
                          }
                        </div>
                      </button>

                      {/* Items List */}
                      {!isCollapsed && (
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-[#e1e2e8]/70 divide-y divide-[#e1e2e8]/50">
                          {catItems.map((item) => {
                            const key       = `${category.name}|${item.name}`;
                            const isChecked = localChecked.has(key);
                            const isBusy    = !!toggling[key];
                            const searchUrl = buildMarketplaceUrl(selectedPlatform, item.name);

                            return (
                              <div
                                key={key}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 px-2 rounded-xl transition-all duration-150 gap-2 sm:gap-4 ${
                                  isChecked ? 'bg-[#10B981]/5' : 'hover:bg-[#f8f9ff]'
                                }`}
                              >
                                {/* Checkbox + Item Name */}
                                <button
                                  type="button"
                                  onClick={() => handleToggle(key)}
                                  disabled={isBusy}
                                  className={`flex items-center gap-3 flex-1 text-left min-w-0 ${
                                    isBusy ? 'opacity-60 cursor-wait' : 'cursor-pointer'
                                  }`}
                                >
                                  <span className={`shrink-0 transition-colors ${isChecked ? 'text-[#10B981]' : 'text-[#c8cad4] hover:text-[#565e74]'}`}>
                                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                                  </span>
                                  <span className={`text-sm font-semibold truncate transition-all ${
                                    isChecked
                                      ? 'text-[#a0aab8] line-through decoration-[#10B981]/50'
                                      : 'text-[#0F172A]'
                                  }`}>
                                    {item.name}
                                  </span>
                                </button>

                                {/* Actions: Quantity Badge & Buy Online Button */}
                                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-8 sm:pl-0">
                                  {/* Quantity badge */}
                                  <span className={`text-xs font-bold px-3 py-1 rounded-xl border transition-all ${
                                    isChecked
                                      ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#006c49]'
                                      : 'bg-[#f8f9ff] border-[#e1e2e8] text-[#565e74]'
                                  }`}>
                                    {item.quantity}
                                  </span>

                                  {/* Buy Online Button (String interpolation constructed URL opened in new tab) */}
                                  <a
                                    href={searchUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Search for "${item.name}" on ${selectedPlatform} (opens in new tab)`}
                                    className="inline-flex items-center gap-1.5 bg-white hover:bg-[#006c49] text-[#006c49] hover:text-white border border-[#10B981]/35 hover:border-[#006c49] text-xs font-bold py-1.5 px-3 rounded-xl transition-all duration-150 shadow-2xs hover:shadow-xs hover:scale-[1.02] active:scale-95 group/btn"
                                  >
                                    <ShoppingCart size={13} className="shrink-0 text-[#10B981] group-hover/btn:text-white transition-colors" />
                                    <span>Buy Online</span>
                                    <ExternalLink size={11} className="shrink-0 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── Right: Sticky Summary Panel (4 cols) ── */}
              <div className="w-full order-1 lg:order-2 lg:col-span-4 animate-fade-in-up">
                <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-[#e1e2e8] p-6 sm:p-7 lg:sticky lg:top-8 transition-all hover:shadow-md space-y-7">

                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-lg text-[#0F172A] tracking-tight">
                      Shopping Progress
                    </h3>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      data.upToDate
                        ? 'bg-[#10B981]/10 text-[#006c49]'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {data.upToDate ? 'Latest' : 'Outdated'}
                    </span>
                  </div>

                  {/* Progress donut — mirrors DietPlan's calorie donut */}
                  <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" fill="none" r="45" stroke="#f2f3f9" strokeWidth="9" />
                      <circle
                        className="transition-all duration-700 ease-out"
                        cx="50" cy="50" fill="none" r="45"
                        stroke="#10B981"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * progressPct) / 100}
                        strokeLinecap="round"
                        strokeWidth="9"
                      />
                    </svg>
                    <div className="text-center bg-white/90 backdrop-blur-sm w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xs z-10 relative">
                      <span className="block text-2xl font-black text-[#0F172A] leading-none mb-1">
                        {checkedCount}
                      </span>
                      <span className="block text-[10px] font-bold text-[#565e74] uppercase tracking-widest">
                        of {totalItems} items
                      </span>
                      <span className="block text-[11px] font-bold text-[#10B981] mt-1">
                        {progressPct}% done
                      </span>
                    </div>
                  </div>

                  {/* Stats rows */}
                  <div className="space-y-3">
                    {[
                      { label: 'Checked',   value: checkedCount,             dot: '#10B981' },
                      { label: 'Remaining', value: totalItems - checkedCount, dot: '#c8cad4' },
                      { label: 'Total',     value: totalItems,                dot: '#005ac2' },
                    ].map(({ label, value, dot }) => (
                      <div key={label} className="flex items-center justify-between p-3.5 bg-[#f8f9ff] border border-[#e1e2e8]/60 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
                          <span className="text-xs font-bold text-[#565e74] uppercase tracking-wider">{label}</span>
                        </div>
                        <span className="text-sm font-black text-[#0F172A]">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* ── Marketplace Integration Card (Module 3 Feature 2 — Member 2) ── */}
                  <div className="p-4 bg-[#f8f9ff] border border-[#e1e2e8] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store size={16} className="text-[#10B981]" />
                        <span className="text-xs font-bold text-[#0F172A]">Marketplace</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/15 text-[#006c49] px-2 py-0.5 rounded-md">
                        {selectedPlatform}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#565e74] leading-relaxed">
                      Select delivery provider to search and order ingredients with 1 click:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {MARKETPLACE_PLATFORMS.map((platform) => (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => handlePlatformChange(platform.name)}
                          className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                            selectedPlatform === platform.name
                              ? 'bg-[#10B981] text-white border-[#10B981] shadow-xs'
                              : 'bg-white text-[#565e74] border-[#e1e2e8] hover:border-[#10B981]/50 hover:text-[#0F172A]'
                          }`}
                        >
                          {platform.name}
                        </button>
                      ))}
                    </div>
                    <a
                      href={selectedPlatform === 'Shopno' ? 'https://www.shwapno.com' : 'https://chaldal.com'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-white border border-[#e1e2e8] text-[#565e74] hover:text-[#006c49] hover:border-[#10B981]/40 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs group/store"
                    >
                      <span>Visit {selectedPlatform} Store</span>
                      <ExternalLink size={12} className="group-hover/store:translate-x-0.5 transition-transform" />
                    </a>
                  </div>

                  {/* Uncheck All */}
                  {checkedCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      disabled={clearingAll}
                      className="w-full py-3 px-4 rounded-2xl border border-[#e1e2e8] text-[#565e74] hover:text-[#0F172A] hover:bg-[#f8f9ff] font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      <Square size={14} />
                      {clearingAll ? 'Clearing...' : 'Uncheck All Items'}
                    </button>
                  )}

                  {/* Quick link back */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#e1e2e8]/70">
                    <Link
                      to="/diet-plan"
                      className="flex items-center gap-2 text-xs font-bold text-[#006c49] hover:text-[#10B981] transition-colors"
                    >
                      <Package size={14} />
                      View Diet Plan →
                    </Link>
                    <span className="text-[10px] font-medium text-[#565e74] flex items-center gap-1">
                      <Calendar size={11} />
                      {data.categories?.length || 0} categories
                    </span>
                  </div>

                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

