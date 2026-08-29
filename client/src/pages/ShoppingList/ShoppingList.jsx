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
  Clock,
  Check,
  X,
  SlidersHorizontal,
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
  const [data, setData]                           = useState(null);
  const [loading, setLoading]                     = useState(true);
  const [refreshing, setRefreshing]               = useState(false);
  const [error, setError]                         = useState('');
  const [toggling, setToggling]                   = useState({});
  const [collapsed, setCollapsed]                 = useState({});
  const [clearingAll, setClearingAll]             = useState(false);
  const [selectedPlatform, setSelectedPlatform]   = useState(getStoredMarketplace);
  const [openStoreMenuKey, setOpenStoreMenuKey]   = useState(null);
  const [menuDirection, setMenuDirection]         = useState({}); // { [key]: 'up' | 'down' }
  const [isStoreModalOpen, setIsStoreModalOpen]   = useState(false);
  const [activeMarketFilter, setActiveMarketFilter] = useState('All');

  // Local checked set — mirrors DB, updated optimistically
  const [localChecked, setLocalChecked] = useState(new Set());

  // Close dropdowns when clicking anywhere else on the screen or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      // If click is outside any open store menu dropdown container, close it
      if (!e.target.closest('[data-store-dropdown]')) {
        setOpenStoreMenuKey(null);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setOpenStoreMenuKey(null);
        setIsStoreModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync local set whenever API data changes
  useEffect(() => {
    if (data?.checkedItems) setLocalChecked(new Set(data.checkedItems));
  }, [data]);

  // ── Handle Marketplace Platform Dropdown change ──
  const handlePlatformChange = (platform) => {
    setSelectedPlatform(platform);
    setStoredMarketplace(platform);
    setOpenStoreMenuKey(null);
    setIsStoreModalOpen(false);
  };

  // ── Handle Toggle Per-Item Store Menu with Dynamic Viewport Calculation ──
  const handleToggleStoreMenu = (key, event, itemIdx, totalItemsInCat) => {
    event.stopPropagation();
    if (openStoreMenuKey === key) {
      setOpenStoreMenuKey(null);
      return;
    }

    // Dynamic viewport measurement based on current screen size & window height
    const btnRect = event.currentTarget.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - btnRect.bottom;
    const spaceAbove = btnRect.top;

    // Dropdown height is ~240px. Open in above portion if space below < 260px OR for the last 4-5 items
    const isLast4To5 = (totalItemsInCat - itemIdx) <= 5;
    const shouldOpenUpward = spaceBelow < 260 || (isLast4To5 && spaceAbove > 200);

    setMenuDirection((prev) => ({
      ...prev,
      [key]: shouldOpenUpward ? 'up' : 'down',
    }));
    setOpenStoreMenuKey(key);
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

  const currentStoreInfo = MARKETPLACE_PLATFORMS.find(
    (p) => p.name === selectedPlatform || p.id === selectedPlatform
  ) || MARKETPLACE_PLATFORMS[0];

  const filteredStores = MARKETPLACE_PLATFORMS.filter((p) => {
    if (activeMarketFilter === 'All') return true;
    if (activeMarketFilter === 'Instant') return p.deliveryTime.includes('Mins') || p.deliveryTime.includes('Hours');
    if (activeMarketFilter === 'Supermarkets') return p.category.includes('Superstore') || p.category.includes('Hypermarket');
    if (activeMarketFilter === 'Organic') return p.category.includes('Organic');
    return true;
  });

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
    <div className="relative min-h-screen pb-40">
      {/* WebGL shader background */}
      <BgShader />

      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/80 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-6 sm:p-8 shadow-xs relative z-30">
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

          {/* ── Marketplace Selection Dropdown & Store Directory Button (Module 3 Feature 2) ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 bg-white/95 border border-[#e1e2e8] rounded-2xl p-2.5 sm:p-3 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#565e74] px-1">
              <Store size={17} className="text-[#10B981]" />
              <span className="whitespace-nowrap">Shop:</span>
            </div>
            
            {/* Standard Dropdown with all BD stores */}
            <div className="relative min-w-[170px] sm:min-w-[190px]">
              <select
                id="header-marketplace-select"
                value={selectedPlatform}
                onChange={(e) => handlePlatformChange(e.target.value)}
                aria-label="Select online grocery shop"
                className="w-full appearance-none bg-[#f8f9ff] hover:bg-[#f2f4ff] border border-[#e1e2e8] text-[#0F172A] font-bold text-xs sm:text-sm rounded-xl pl-3 pr-8 py-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 transition-all"
              >
                <optgroup label="Express / 1-Hour Delivery">
                  <option value="Chaldal">Chaldal (1-2 Hours)</option>
                  <option value="Pandamart">Pandamart (20-30 Mins)</option>
                </optgroup>
                <optgroup label="Superstore & Hypermarket Chains">
                  <option value="Shopno">Shopno / Shwapno</option>
                  <option value="Meena Click">Meena Click (Bazaar)</option>
                  <option value="Agora BD">Agora Superstore</option>
                  <option value="Unimart">Unimart Hypermarket</option>
                </optgroup>
                <optgroup label="Marketplaces & Organic Specialty">
                  <option value="Daraz Mart">Daraz Mart</option>
                  <option value="Khaas Food">Khaas Food (Organic)</option>
                </optgroup>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#565e74] pointer-events-none" />
            </div>

            {/* Quick Button to open full store cards modal */}
            <button
              type="button"
              onClick={() => setIsStoreModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-[#f2f4ff] border border-[#10B981]/30 hover:border-[#10B981] text-[#006c49] rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <SlidersHorizontal size={13} />
              <span>All (8)</span>
            </button>
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
            {/* ── Stale Warning Banner ── */}
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
                  className="shrink-0 flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all disabled:opacity-60 active:scale-95 cursor-pointer"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  {refreshing ? 'Updating...' : 'Update Shopping List'}
                </button>
              </div>
            )}

            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">

              {/* ── Left: Category Cards (8 cols) ── */}
              <div className="w-full order-2 lg:order-1 lg:col-span-8 flex flex-col gap-5">

                {/* ── Versatile Marketplace Hub & Multi-Store Switcher ── */}
                <div className="bg-white/95 backdrop-blur-md rounded-3xl border border-[#e1e2e8] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#10B981]/20 to-[#006c49]/10 border border-[#10B981]/30 text-[#006c49] flex items-center justify-center shrink-0 shadow-2xs">
                        <Store size={20} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-black text-[#0F172A]">Active Marketplace:</span>
                          <span className="text-xs font-black text-[#006c49] bg-[#10B981]/15 border border-[#10B981]/25 px-2.5 py-0.5 rounded-lg">
                            {currentStoreInfo.displayName || currentStoreInfo.name}
                          </span>
                          <span className="text-[11px] font-bold text-[#565e74] bg-[#f2f3f9] px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Clock size={11} className="text-[#10B981]" />
                            {currentStoreInfo.deliveryTime}
                          </span>
                        </div>
                        <p className="text-xs text-[#565e74] mt-0.5 font-medium">
                          {currentStoreInfo.tagline}
                        </p>
                      </div>
                    </div>

                    {/* Filter tabs & Directory button */}
                    <div className="flex items-center gap-1.5 self-start sm:self-center flex-wrap">
                      <div className="flex items-center gap-1 bg-[#f8f9ff] p-1 rounded-xl border border-[#e1e2e8]">
                        {['All', 'Instant', 'Supermarkets', 'Organic'].map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setActiveMarketFilter(f)}
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              activeMarketFilter === f
                                ? 'bg-white text-[#0F172A] shadow-xs'
                                : 'text-[#565e74] hover:text-[#0F172A]'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsStoreModalOpen(true)}
                        className="text-[11px] font-bold text-[#006c49] hover:bg-[#10B981]/10 border border-[#10B981]/30 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <SlidersHorizontal size={12} />
                        <span>All (8)</span>
                      </button>
                    </div>
                  </div>

                  {/* Store selector pill grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-[#e1e2e8]/70">
                    {filteredStores.map((platform) => {
                      const isSelected = selectedPlatform === platform.name || selectedPlatform === platform.id;
                      return (
                        <button
                          key={platform.id}
                          type="button"
                          onClick={() => handlePlatformChange(platform.name)}
                          className={`flex flex-col items-start p-2.5 rounded-xl border transition-all text-left cursor-pointer group ${
                            isSelected
                              ? 'bg-gradient-to-r from-[#10B981] to-[#006c49] text-white border-[#006c49] shadow-sm scale-[1.01]'
                              : 'bg-[#f8f9ff] text-[#0F172A] border-[#e1e2e8] hover:border-[#10B981]/50 hover:bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-[#0F172A]'}`}>
                              {platform.name}
                            </span>
                            {isSelected && <Check size={13} className="text-white shrink-0" />}
                          </div>
                          <span className={`text-[10px] font-medium mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-[#565e74]'}`}>
                            {platform.deliveryTime}
                          </span>
                        </button>
                      );
                    })}
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
                      className={`bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-[#e1e2e8] transition-all duration-300 animate-fade-in-up ${
                        isCollapsed ? 'overflow-hidden' : 'overflow-visible relative z-20'
                      }`}
                      style={{ animationDelay: `${0.07 * (catIdx + 1)}s` }}
                    >
                      {/* Category Header */}
                      <button
                        onClick={() => toggleCollapse(category.name)}
                        className="w-full flex items-center justify-between p-5 sm:p-6 hover:bg-[#f8f9ff] transition-colors group cursor-pointer rounded-2xl"
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
                        <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-[#e1e2e8]/70 divide-y divide-[#e1e2e8]/50 overflow-visible">
                          {catItems.map((item, itemIdx) => {
                            const key        = `${category.name}|${item.name}`;
                            const isChecked  = localChecked.has(key);
                            const isBusy     = !!toggling[key];
                            const searchUrl  = buildMarketplaceUrl(selectedPlatform, item.name);
                            const isMenuOpen = openStoreMenuKey === key;

                            return (
                              <div
                                key={key}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 px-2 rounded-xl transition-all duration-150 gap-2 sm:gap-4 relative ${
                                  isMenuOpen
                                    ? 'z-40 bg-[#f8f9ff] ring-1 ring-[#10B981]/40 shadow-xs'
                                    : isChecked
                                    ? 'bg-[#10B981]/5'
                                    : 'hover:bg-[#f8f9ff]'
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

                                {/* Actions: Quantity Badge & Pixel-Perfect Buy Online Button */}
                                <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pl-8 sm:pl-0">
                                  {/* Quantity badge */}
                                  <span className={`text-xs font-bold px-3 py-1 rounded-xl border transition-all ${
                                    isChecked
                                      ? 'bg-[#10B981]/10 border-[#10B981]/20 text-[#006c49]'
                                      : 'bg-[#f8f9ff] border-[#e1e2e8] text-[#565e74]'
                                  }`}>
                                    {item.quantity}
                                  </span>

                                  {/* Pixel-Perfect Unified Split Button */}
                                  <div
                                    data-store-dropdown
                                    className="relative inline-flex items-stretch h-8 rounded-xl border border-[#10B981]/40 bg-white shadow-2xs overflow-visible group"
                                  >
                                    {/* Primary Buy Button */}
                                    <a
                                      href={searchUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title={`Search "${item.name}" on ${selectedPlatform} (opens in new tab)`}
                                      className="inline-flex items-center gap-1.5 px-3 bg-white hover:bg-[#006c49] text-[#006c49] hover:text-white rounded-l-[11px] text-xs font-bold transition-colors group/btn cursor-pointer whitespace-nowrap"
                                    >
                                      <ShoppingCart size={13} className="shrink-0 text-[#10B981] group-hover/btn:text-white transition-colors" />
                                      <span>Buy Online</span>
                                      <ExternalLink size={10} className="shrink-0 opacity-70 group-hover/btn:opacity-100 transition-opacity" />
                                    </a>

                                    {/* Divider */}
                                    <div className="w-[1px] bg-[#10B981]/30 self-stretch my-1" />

                                    {/* Multi-store Dropdown Trigger */}
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleStoreMenu(key, e, itemIdx, catItems.length)}
                                      title="Choose another Bangladeshi grocery store"
                                      className={`inline-flex items-center justify-center px-2 bg-white hover:bg-[#f2f4ff] text-[#565e74] hover:text-[#006c49] rounded-r-[11px] transition-colors cursor-pointer ${
                                        isMenuOpen ? 'bg-[#f2f4ff] text-[#006c49]' : ''
                                      }`}
                                    >
                                      <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-[#10B981]' : ''}`} />
                                    </button>

                                    {/* Dynamic Positioned Menu (Opens in above portion for last 4-5 items or when near screen bottom) */}
                                    {isMenuOpen && (
                                      <div
                                        onClick={(e) => e.stopPropagation()}
                                        className={`absolute right-0 ${
                                          (menuDirection[key] || (catItems.length - itemIdx <= 5 ? 'up' : 'down')) === 'up'
                                            ? 'bottom-full mb-2'
                                            : 'top-full mt-2'
                                        } w-64 sm:w-72 bg-white rounded-2xl shadow-2xl border border-[#e1e2e8] p-3 z-50 animate-fade-in-up space-y-1.5`}
                                      >
                                        <div className="flex items-center justify-between pb-2 border-b border-[#e1e2e8]/80">
                                          <div className="min-w-0">
                                            <span className="block text-xs font-black text-[#0F172A]">
                                              Search on BD Store:
                                            </span>
                                            <span className="block text-[10px] text-[#565e74] truncate max-w-[170px]">
                                              Item: <span className="font-bold text-[#0F172A]">{item.name}</span>
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-bold text-[#006c49] bg-[#10B981]/10 px-2 py-0.5 rounded-full shrink-0">
                                            8 Stores
                                          </span>
                                        </div>

                                        <div className="space-y-1 max-h-56 overflow-y-auto pr-0.5">
                                          {MARKETPLACE_PLATFORMS.map((platform) => {
                                            const storeItemUrl = platform.buildSearchUrl(item.name);
                                            const isCurrent = selectedPlatform === platform.name || selectedPlatform === platform.id;
                                            return (
                                              <a
                                                key={platform.id}
                                                href={storeItemUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={() => setOpenStoreMenuKey(null)}
                                                className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all ${
                                                  isCurrent
                                                    ? 'bg-[#10B981]/15 text-[#006c49] font-black'
                                                    : 'hover:bg-[#f8f9ff] text-[#0F172A]'
                                                }`}
                                              >
                                                <div className="flex items-center gap-2 min-w-0">
                                                  <Store size={14} className={`shrink-0 ${isCurrent ? 'text-[#10B981]' : 'text-[#565e74]'}`} />
                                                  <span className="truncate">{platform.name}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-[10px] text-[#565e74] shrink-0 ml-1">
                                                  <span>{platform.deliveryTime}</span>
                                                  <ExternalLink size={10} className="text-[#10B981]" />
                                                </div>
                                              </a>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
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

                  {/* Progress donut */}
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

                  {/* ── Versatile Marketplace Summary Widget ── */}
                  <div className="p-4 bg-[#f8f9ff] border border-[#e1e2e8] rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store size={16} className="text-[#10B981]" />
                        <span className="text-xs font-bold text-[#0F172A]">Active Store</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#10B981]/15 text-[#006c49] px-2 py-0.5 rounded-md">
                        {currentStoreInfo.displayName || currentStoreInfo.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#565e74] bg-white p-2.5 rounded-xl border border-[#e1e2e8] flex items-center justify-between">
                      <span className="font-semibold">{currentStoreInfo.category}</span>
                      <span className="font-bold text-[#006c49] flex items-center gap-1">
                        <Clock size={11} />
                        {currentStoreInfo.deliveryTime}
                      </span>
                    </div>

                    {/* Quick Store Directory Button */}
                    <button
                      type="button"
                      onClick={() => setIsStoreModalOpen(true)}
                      className="w-full py-2.5 px-3 bg-white hover:bg-[#f2f4ff] border border-[#10B981]/30 hover:border-[#10B981] text-[#006c49] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <SlidersHorizontal size={13} />
                      <span>Browse All 8 BD Stores</span>
                    </button>

                    {/* Visit Store Homepage Link */}
                    <a
                      href={currentStoreInfo.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 bg-white border border-[#e1e2e8] text-[#565e74] hover:text-[#006c49] hover:border-[#10B981]/40 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs group/store cursor-pointer"
                    >
                      <span>Visit {currentStoreInfo.name} Homepage</span>
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

      {/* ── Full Bangladeshi Grocery Store Directory Modal ── */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl border border-[#e1e2e8] max-w-2xl w-full p-6 sm:p-7 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#e1e2e8]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#10B981]/10 text-[#006c49] flex items-center justify-center">
                  <Store size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#0F172A] tracking-tight">
                    Bangladeshi Online Grocery Shops
                  </h3>
                  <p className="text-xs text-[#565e74]">
                    Select your default store to search and buy ingredients
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStoreModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f8f9ff] hover:bg-[#e1e2e8] text-[#565e74] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Grid of all 8 Stores */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {MARKETPLACE_PLATFORMS.map((platform) => {
                const isSelected = selectedPlatform === platform.name || selectedPlatform === platform.id;
                return (
                  <div
                    key={platform.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/50 border-[#10B981] ring-2 ring-[#10B981]/20 shadow-xs'
                        : 'bg-[#f8f9ff] border-[#e1e2e8] hover:border-[#10B981]/50 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Store size={18} className={isSelected ? 'text-[#10B981]' : 'text-[#565e74]'} />
                          <h4 className="font-extrabold text-sm text-[#0F172A]">{platform.name}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-[#006c49] bg-white border border-[#10B981]/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Clock size={10} />
                          {platform.deliveryTime}
                        </span>
                      </div>
                      <p className="text-xs text-[#565e74] mt-1.5 leading-relaxed font-medium">
                        {platform.tagline}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#e1e2e8]/60">
                      <button
                        type="button"
                        onClick={() => handlePlatformChange(platform.name)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#10B981] text-white shadow-xs'
                            : 'bg-white border border-[#e1e2e8] text-[#0F172A] hover:bg-[#10B981] hover:text-white hover:border-[#10B981]'
                        }`}
                      >
                        {isSelected && <Check size={14} />}
                        <span>{isSelected ? 'Active Default' : 'Select Store'}</span>
                      </button>
                      <a
                        href={platform.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-2.5 bg-white border border-[#e1e2e8] text-[#565e74] hover:text-[#006c49] hover:border-[#10B981]/50 rounded-xl text-xs transition-colors cursor-pointer"
                        title={`Visit ${platform.name} website`}
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



