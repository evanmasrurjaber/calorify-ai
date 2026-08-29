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
} from 'lucide-react';
import BgShader from '../../components/BgShader';
import {
  getShoppingList,
  clearShoppingListCache,
  toggleCheckedItem,
  clearAllChecked,
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
  const [data, setData]               = useState(null);   // { upToDate, planId, checkedItems, categories }
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [error, setError]             = useState('');
  const [toggling, setToggling]       = useState({});     // optimistic lock per item key
  const [collapsed, setCollapsed]     = useState({});
  const [clearingAll, setClearingAll] = useState(false);

  // Local checked set — mirrors DB, updated optimistically
  const [localChecked, setLocalChecked] = useState(new Set());

  // Sync local set whenever API data changes
  useEffect(() => {
    if (data?.checkedItems) setLocalChecked(new Set(data.checkedItems));
  }, [data]);

  // ── Fetch (or auto-generate) the shopping list ──
  const fetchList = useCallback(async (bustCache = false) => {
    try {
      bustCache ? setRefreshing(true) : setLoading(true);
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
      next.has(key) ? next.delete(key) : next.add(key);
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
        next.has(key) ? next.delete(key) : next.add(key);
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
      {/* Same WebGL shader as Diet Plan page */}
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
                        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-[#f8f9ff] transition-colors group"
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

                            return (
                              <button
                                key={key}
                                onClick={() => handleToggle(key)}
                                disabled={isBusy}
                                className={`w-full flex items-center justify-between py-3.5 px-1 group/item transition-all duration-150 text-left ${
                                  isBusy ? 'opacity-60 cursor-wait' : 'hover:opacity-90 cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`shrink-0 transition-colors ${isChecked ? 'text-[#10B981]' : 'text-[#c8cad4] group-hover/item:text-[#565e74]'}`}>
                                    {isChecked ? <CheckSquare size={20} /> : <Square size={20} />}
                                  </span>
                                  <span className={`text-sm font-semibold transition-all ${
                                    isChecked
                                      ? 'text-[#a0aab8] line-through decoration-[#10B981]/50'
                                      : 'text-[#0F172A]'
                                  }`}>
                                    {item.name}
                                  </span>
                                </div>

                                {/* Quantity badge */}
                                <span className={`text-xs font-bold px-3 py-1 rounded-xl border transition-all ${
                                  isChecked
                                    ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#006c49]'
                                    : 'bg-[#f8f9ff] border-[#e1e2e8] text-[#565e74]'
                                }`}>
                                  {item.quantity}
                                </span>
                              </button>
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

                  {/* Uncheck All */}
                  {checkedCount > 0 && (
                    <button
                      onClick={handleClearAll}
                      disabled={clearingAll}
                      className="w-full py-3 px-4 rounded-2xl border border-[#e1e2e8] text-[#565e74] hover:text-[#0F172A] hover:bg-[#f8f9ff] font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
