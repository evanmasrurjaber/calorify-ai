// AI Meal Log — Member 2 (Jarin Tasnim Dia)
// Supports: image upload (Gemini Vision) + text entry (Gemini text)

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { logMealText, logMealImage, getDailyLog, deleteMealLog } from '../../services/mealLogService';
import { useAuth } from '../../context/AuthContext';
import {
  Camera,
  PencilLine,
  Sunrise,
  Sun,
  Moon,
  Apple,
  Utensils,
  Crown,
  Sparkles,
  X,
  CheckCircle,
  CheckCircle2,
  Minus,
  HelpCircle,
  RefreshCw,
  ImageUp,
  AlertTriangle,
  ListChecks,
  Images,
  CalendarDays,
  CalendarRange,
  ChevronDown,
} from 'lucide-react';

// ─── Helper: today as YYYY-MM-DD (local timezone) ─────────────────────────────
const todayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Confidence badge component ───────────────────────────────────────────────
function ConfidenceBadge({ level }) {
  const colours = {
    high:   'bg-emerald-50 text-emerald-700 border-emerald-200',
    medium: 'bg-amber-50   text-amber-700   border-amber-200',
    low:    'bg-rose-50    text-rose-700    border-rose-200',
  };
  const IconMap = { high: CheckCircle2, medium: Minus, low: HelpCircle };
  const Icon = IconMap[level] || Minus;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${colours[level] || colours.medium}`}>
      <Icon size={11} />
      {level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Medium'} Confidence
    </span>
  );
}

// ─── Macro bar component ──────────────────────────────────────────────────────
function MacroBar({ label, value, unit, colour, max }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900 font-semibold">{value}{unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Results card shown after Gemini analysis ─────────────────────────────────
function ResultCard({ result, onSave, saving, saved }) {
  if (!result) return null;
  return (
    <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-5 animate-[fadeIn_0.4s_ease]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-0.5">Detected</p>
          <h3 className="text-base font-bold text-gray-900 leading-snug">{result.foodName}</h3>
        </div>
        <ConfidenceBadge level={result.confidence} />
      </div>

      {/* Big calorie number */}
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black text-gray-900 tabular-nums">{result.calories}</span>
        <span className="text-gray-500 text-sm mb-2">kcal</span>
      </div>

      {/* Macro bars */}
      <div className="space-y-3">
        <MacroBar label="Carbohydrates" value={result.carbs}   unit="g" colour="bg-amber-400"    max={150} />
        <MacroBar label="Protein"       value={result.protein} unit="g" colour="bg-emerald-400"  max={80}  />
        <MacroBar label="Fat"           value={result.fat}     unit="g" colour="bg-rose-400"     max={80}  />
      </div>

      {/* Per-item breakdown */}
      {result.breakdown && result.breakdown.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">Breakdown</p>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium">Portion</th>
                  <th className="text-right px-3 py-2 font-medium">Kcal</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((b, i) => (
                  <tr key={i} className="border-t border-gray-200 hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 text-gray-700">{b.item}</td>
                    <td className="px-3 py-2 text-gray-500">{b.portionEstimate}</td>
                    <td className="px-3 py-2 text-right text-gray-900 font-semibold">{b.calories}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Save button */}
      {!saved ? (
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
        >
          {saving ? (
            <><span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
          ) : 'Save to Log'}
        </button>
      ) : (
        <div className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 text-center flex items-center justify-center gap-2">
          <CheckCircle size={16} /> Saved to your meal log
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function MealLog() {
  const { user } = useAuth();

  // ── Tab state ───
  const [activeTab, setActiveTab] = useState('image'); // 'image' | 'text'
  const [selectedMealDate, setSelectedMealDate] = useState(() => {
    try {
      return new URLSearchParams(window.location.search).get('date') || todayString();
    } catch {
      return todayString();
    }
  });

  // ── Image upload state ───
  const [imageFile,    setImageFile]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageMealType, setImageMealType] = useState('lunch');
  const [imageDragging, setImageDragging] = useState(false);
  const [imageAnalysing, setImageAnalysing] = useState(false);
  const [imageResult,  setImageResult]  = useState(null);
  const [imageError,   setImageError]   = useState('');
  const [imageSaving,  setImageSaving]  = useState(false);
  const [imageSaved,   setImageSaved]   = useState(false);
  const fileInputRef        = useRef(null); // desktop: generic file browse
  const mobileCameraRef     = useRef(null); // mobile: take photo with camera
  const mobileGalleryRef    = useRef(null); // mobile: pick from photo library

  // ── Mobile detection ─────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () =>
      setIsMobile(window.matchMedia('(max-width: 767px) and (pointer: coarse)').matches
        || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── Text log state ───
  const [textFood,      setTextFood]      = useState('');
  const [textPortion,   setTextPortion]   = useState('');
  const [textMealType,  setTextMealType]  = useState('lunch');
  const [textAnalysing, setTextAnalysing] = useState(false);
  const [textResult,    setTextResult]    = useState(null);
  const [textError,     setTextError]     = useState('');
  const [textSaving,    setTextSaving]    = useState(false);
  const [textSaved,     setTextSaved]     = useState(false);

  // ── History state ───
  const [historyPeriod,  setHistoryPeriod]  = useState('daily');   // 'daily' | 'weekly' | 'monthly'
  const [historyDate,    setHistoryDate]    = useState(todayString());  // for daily
  const [historyWeek,    setHistoryWeek]    = useState(todayString());  // any day in the desired week
  const [historyMonth,   setHistoryMonth]   = useState(todayString().slice(0, 7)); // 'YYYY-MM'
  const [historyLogs,    setHistoryLogs]    = useState([]);
  const [historyTotals,  setHistoryTotals]  = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  // derive the anchor date sent to the API for each period
  const historyAnchor =
    historyPeriod === 'daily'   ? historyDate :
    historyPeriod === 'weekly'  ? historyWeek :
    /* monthly */                 `${historyMonth}-01`;

  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const MEAL_ICON_MAP = {
    breakfast: Sunrise,
    lunch:     Sun,
    dinner:    Moon,
    snacks:    Apple,
  };

  // Live current date to keep dropdown options fresh across day/month boundaries
  const [currentDate, setCurrentDate] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  // Build list of "week" options: last 12 Mondays as { label, value (YYYY-MM-DD) }
  const weekOptions = useMemo(() => {
    const opts = [];
    const now = currentDate;
    const dayOfWeek = now.getUTCDay();
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMon = new Date(now);
    thisMon.setUTCDate(now.getUTCDate() + diffToMon);
    for (let i = 0; i < 12; i++) {
      const mon = new Date(thisMon);
      mon.setUTCDate(thisMon.getUTCDate() - i * 7);
      const sun = new Date(mon);
      sun.setUTCDate(mon.getUTCDate() + 6);
      const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      opts.push({ label: `${fmt(mon)} – ${fmt(sun)}`, value: mon.toISOString().split('T')[0] });
    }
    return opts;
  }, [currentDate]);

  // Build list of month options: last 12 months as { label, value 'YYYY-MM' }
  const monthOptions = useMemo(() => {
    const opts = [];
    const now = currentDate;
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      opts.push({
        label: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
        value: d.toISOString().slice(0, 7),
      });
    }
    return opts;
  }, [currentDate]);

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (anchor, period) => {
    try {
      setHistoryLoading(true);
      const { data } = await getDailyLog(anchor, period);
      setHistoryLogs(data.logs   || []);
      setHistoryTotals(data.totals || { calories: 0, carbs: 0, protein: 0, fat: 0 });
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(historyAnchor, historyPeriod);
  }, [historyAnchor, historyPeriod, fetchHistory]);

  // Group logs by date string for weekly/monthly display
  const logsByDate = historyLogs.reduce((acc, log) => {
    const key = (log.date || log.createdAt || '').slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(log);
    return acc;
  }, {});
  const groupedDates = Object.keys(logsByDate).sort();

  // ── Image handlers ─────────────────────────────────────────────────────────
  const handleImageSelect = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      setImageError('Please select a valid image file (JPEG or PNG).');
      return;
    }
    setImageFile(file);
    setImageError('');
    setImageResult(null);
    setImageSaved(false);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setImageDragging(false);
    const file = e.dataTransfer.files[0];
    handleImageSelect(file);
  };

  const handleAnalyseImage = async () => {
    if (!imageFile) { setImageError('Please select a meal image first.'); return; }
    setImageAnalysing(true);
    setImageError('');
    setImageResult(null);
    setImageSaved(false);
    try {
      const fd = new FormData();
      fd.append('meal_image', imageFile);
      fd.append('mealType', imageMealType);
      fd.append('date', selectedMealDate);
      const { data } = await logMealImage(fd);
      // Backend saves automatically when image is sent; show result
      setImageResult(data.log);
      setImageSaved(true); // auto-saved on analysis
      fetchHistory(historyAnchor, historyPeriod);
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.limitReached) {
        setImageError('LIMIT_REACHED');
      } else {
        setImageError(err.response?.data?.message || 'Failed to analyse image. Please try again.');
      }
    } finally {
      setImageAnalysing(false);
    }
  };

  // ── Text handlers ──────────────────────────────────────────────────────────
  const handleAnalyseText = async () => {
    if (!textFood.trim()) { setTextError('Please enter a food name.'); return; }
    setTextAnalysing(true);
    setTextError('');
    setTextResult(null);
    setTextSaved(false);
    try {
      const { data } = await logMealText({
        foodName: textFood.trim(),
        portionDescription: textPortion.trim(),
        mealType: textMealType,
        date: selectedMealDate,
      });
      setTextResult(data.log);
      setTextSaved(true); // auto-saved on analysis
      fetchHistory(historyAnchor, historyPeriod);
    } catch (err) {
      setTextError(err.response?.data?.message || 'Failed to estimate nutrition. Please try again.');
    } finally {
      setTextAnalysing(false);
    }
  };

  // ── Delete handler ─────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      await deleteMealLog(id);
      fetchHistory(historyAnchor, historyPeriod);
    } catch {
      // silent fail — could add toast here
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ── Page header ── */}
      <div className="flex items-center gap-4 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
          <Utensils size={28} />
        </span>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">AI Food Scanner</h1>
          <p className="text-gray-500 text-sm mt-0.5">Upload a photo or type a food name — Gemini estimates the calories and macros instantly.</p>
        </div>
      </div>

      {/* ── Log panel ── */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6">

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'image', label: 'Scan Meal',   Icon: Camera     },
            { id: 'text',  label: 'Log by Text', Icon: PencilLine },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <tab.Icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── IMAGE TAB ── */}
        {activeTab === 'image' && (
          <div className="space-y-5">
            {/* Meal type selector */}
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(t => {
                const MealIcon = MEAL_ICON_MAP[t] || Utensils;
                return (
                  <button
                    key={t}
                    onClick={() => setImageMealType(t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                      imageMealType === t
                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-700'
                        : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <MealIcon size={13} />
                    {t}
                  </button>
                );
              })}
            </div>

            {/* ── Upload area: desktop drag-drop OR mobile picker buttons ── */}
            {isMobile ? (
              /* ── MOBILE: three action buttons ── */
              <div className="space-y-3">
                {/* Preview (shown after any selection) */}
                {imagePreview && (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                    <img
                      src={imagePreview}
                      alt="Meal preview"
                      className="w-full max-h-64 object-contain bg-gray-50"
                    />
                    <button
                      onClick={() => { setImageFile(null); setImagePreview(null); setImageResult(null); setImageSaved(false); setImageError(''); }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-gray-500 hover:text-rose-500 rounded-xl border border-gray-200 shadow-sm transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Two picker buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Take Photo — opens device camera */}
                  <button
                    onClick={() => mobileCameraRef.current?.click()}
                    className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition active:scale-95"
                  >
                    <Camera size={24} />
                    <span className="text-[11px] font-semibold text-center leading-tight">Take<br/>Photo</span>
                  </button>

                  {/* Photo Library — opens gallery */}
                  <button
                    onClick={() => mobileGalleryRef.current?.click()}
                    className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-dashed border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-700 transition active:scale-95"
                  >
                    <Images size={24} />
                    <span className="text-[11px] font-semibold text-center leading-tight">Photo<br/>Library</span>
                  </button>
                </div>

                {/* Hidden inputs for each mobile source */}
                {/* Camera capture */}
                <input
                  ref={mobileCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files[0])}
                />
                {/* Photo library */}
                <input
                  ref={mobileGalleryRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageSelect(e.target.files[0])}
                />
              </div>
            ) : (
              /* ── DESKTOP: drag & drop zone ── */
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setImageDragging(true); }}
                  onDragLeave={() => setImageDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center min-h-[200px] ${
                    imageDragging
                      ? 'border-emerald-500 bg-emerald-50'
                      : imagePreview
                      ? 'border-gray-200 bg-transparent'
                      : 'border-gray-200 hover:border-emerald-500 bg-gray-50 hover:bg-gray-100/30'
                  }`}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Meal preview"
                      className="w-full max-h-72 object-contain rounded-xl"
                    />
                  ) : (
                    <div className="text-center p-8">
                      <div className="flex justify-center mb-3">
                        <span className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                          <ImageUp size={32} />
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 mb-1">Drag &amp; drop your meal photo</p>
                      <p className="text-xs text-gray-500">or click to browse — JPG, PNG up to 10 MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => handleImageSelect(e.target.files[0])}
                  />
                </div>

                {/* Remove photo button — desktop only */}
                {imagePreview && (
                  <button
                    onClick={() => { setImageFile(null); setImagePreview(null); setImageResult(null); setImageSaved(false); setImageError(''); }}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-rose-500 transition"
                  >
                    <X size={13} /> Remove photo
                  </button>
                )}
              </>
            )}

            {imageError === 'LIMIT_REACHED' ? (
              <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start gap-3 mt-4">
                <span className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0">
                  <Crown size={18} />
                </span>
                <div>
                  <h4 className="text-rose-700 font-bold text-sm mb-1">Free Tier Limit Reached</h4>
                  <p className="text-gray-500 text-xs mb-3">You've used all 3 AI food scans for today. Upgrade to Pro for unlimited AI scans and advanced nutrition insights.</p>
                  <Link to="/subscription" className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
                    Upgrade to Pro
                  </Link>
                </div>
              </div>
            ) : imageError && (
              <div className="flex items-center gap-2 text-rose-600 text-sm mt-2 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                <AlertTriangle size={15} className="shrink-0" />
                {imageError}
              </div>
            )}

            {/* Analyse button */}
            <button
              onClick={handleAnalyseImage}
              disabled={!imageFile || imageAnalysing}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {imageAnalysing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Gemini is analysing your meal…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Analyse with Gemini AI
                </>
              )}
            </button>

            {/* Results */}
            <ResultCard
              result={imageResult}
              saved={imageSaved}
              saving={imageSaving}
              onSave={() => {}} // auto-saved on analysis
            />
          </div>
        )}

        {/* ── TEXT TAB ── */}
        {activeTab === 'text' && (
          <div className="space-y-5">
            {/* Meal type selector */}
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(t => {
                const MealIcon = MEAL_ICON_MAP[t] || Utensils;
                return (
                  <button
                    key={t}
                    onClick={() => setTextMealType(t)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                      textMealType === t
                        ? 'bg-emerald-100 border border-emerald-300 text-emerald-700'
                        : 'bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <MealIcon size={13} />
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Food name */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Food Name</label>
              <input
                type="text"
                value={textFood}
                onChange={(e) => { setTextFood(e.target.value); setTextError(''); setTextResult(null); setTextSaved(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyseText()}
                placeholder="e.g. Dal Bhat, Biryani, Roti with Tarkari…"
                className="w-full bg-white border border-gray-200 focus:border-emerald-500 outline-none text-gray-900 placeholder-gray-400 text-sm px-4 py-3 rounded-xl transition"
              />
            </div>

            {/* Portion (optional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Portion Size <span className="text-gray-400 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={textPortion}
                onChange={(e) => setTextPortion(e.target.value)}
                placeholder="e.g. 1 large plate, 2 pieces, 300g…"
                className="w-full bg-white border border-gray-200 focus:border-emerald-500 outline-none text-gray-900 placeholder-gray-400 text-sm px-4 py-3 rounded-xl transition"
              />
            </div>

            {textError && (
              <div className="flex items-center gap-2 text-rose-600 text-sm bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
                <AlertTriangle size={15} className="shrink-0" />
                {textError}
              </div>
            )}

            {/* Estimate button */}
            <button
              onClick={handleAnalyseText}
              disabled={!textFood.trim() || textAnalysing}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
            >
              {textAnalysing ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Gemini is estimating nutrition…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Estimate with Gemini AI
                </>
              )}
            </button>

            {/* Results */}
            <ResultCard
              result={textResult}
              saved={textSaved}
              saving={textSaving}
              onSave={() => {}} // auto-saved on analysis
            />
          </div>
        )}
      </div>

      {/* ── Meal History ── */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-3xl p-6">

        {/* ── Header row: title + period dropdown ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
              <ListChecks size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Meal History</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {historyPeriod === 'daily'   && 'All meals logged on the selected date'}
                {historyPeriod === 'weekly'  && 'All meals logged during the selected week'}
                {historyPeriod === 'monthly' && 'All meals logged during the selected month'}
              </p>
            </div>
          </div>

          {/* Period + date selector side-by-side */}
          <div className="flex flex-wrap items-center gap-2 sm:self-start">
            {/* Period dropdown */}
            <div className="relative">
              <select
                value={historyPeriod}
                onChange={(e) => setHistoryPeriod(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm font-medium pl-3 pr-8 py-2 rounded-xl outline-none focus:border-emerald-500 transition cursor-pointer"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>

            {/* Daily: calendar date picker */}
            {historyPeriod === 'daily' && (
              <div className="relative flex items-center gap-1.5">
                <CalendarDays size={15} className="text-emerald-600 shrink-0" />
                <input
                  type="date"
                  value={historyDate}
                  onChange={(e) => setHistoryDate(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-700 text-sm px-3 py-2 rounded-xl outline-none focus:border-emerald-500 transition"
                />
              </div>
            )}

            {/* Weekly: dropdown of last 12 weeks */}
            {historyPeriod === 'weekly' && (
              <div className="relative flex items-center gap-1.5">
                <CalendarRange size={15} className="text-emerald-600 shrink-0" />
                <div className="relative">
                  <select
                    value={historyWeek}
                    onChange={(e) => setHistoryWeek(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm font-medium pl-3 pr-8 py-2 rounded-xl outline-none focus:border-emerald-500 transition cursor-pointer max-w-[200px] sm:max-w-none"
                  >
                    {weekOptions.map(w => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            )}

            {/* Monthly: dropdown of last 12 months */}
            {historyPeriod === 'monthly' && (
              <div className="relative flex items-center gap-1.5">
                <CalendarRange size={15} className="text-emerald-600 shrink-0" />
                <div className="relative">
                  <select
                    value={historyMonth}
                    onChange={(e) => setHistoryMonth(e.target.value)}
                    className="appearance-none bg-white border border-gray-200 text-gray-700 text-sm font-medium pl-3 pr-8 py-2 rounded-xl outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {monthOptions.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Period totals banner ── */}
        {historyLogs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: historyPeriod === 'daily' ? 'Calories' : 'Total Calories', val: historyTotals.calories, unit: 'kcal', colour: 'text-emerald-600' },
              { label: 'Carbs',   val: historyTotals.carbs,   unit: 'g', colour: 'text-amber-500'   },
              { label: 'Protein', val: historyTotals.protein, unit: 'g', colour: 'text-emerald-500' },
              { label: 'Fat',     val: historyTotals.fat,     unit: 'g', colour: 'text-rose-500'    },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`text-xl font-black ${m.colour}`}>{m.val}<span className="text-xs font-normal text-gray-500 ml-0.5">{m.unit}</span></p>
              </div>
            ))}
          </div>
        )}

        {/* ── Log entries ── */}
        {historyLoading ? (
          <div className="flex items-center gap-3 py-10 justify-center">
            <RefreshCw size={20} className="animate-spin text-emerald-600" />
            <span className="text-gray-500 text-sm">Loading history…</span>
          </div>

        ) : historyLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="flex justify-center mb-3">
              <span className="p-4 bg-gray-100 text-gray-400 rounded-2xl">
                <Utensils size={32} />
              </span>
            </div>
            <p className="text-gray-500 text-sm">
              No meals logged for this {historyPeriod === 'daily' ? 'date' : historyPeriod === 'weekly' ? 'week' : 'month'}.
            </p>
            <p className="text-gray-400 text-xs mt-1">Use the tabs above to log your first meal!</p>
          </div>

        ) : historyPeriod === 'daily' ? (
          /* ── DAILY: flat list ── */
          <div className="space-y-3">
            {historyLogs.map((log) => <LogRow key={log._id} log={log} MEAL_ICON_MAP={MEAL_ICON_MAP} onDelete={handleDelete} />)}
          </div>

        ) : (
          /* ── WEEKLY / MONTHLY: grouped by date ── */
          <div className="space-y-6">
            {groupedDates.map((dateKey) => {
              const dayLogs  = logsByDate[dateKey];
              const dayLabel = new Date(dateKey + 'T00:00:00Z').toLocaleDateString('en-GB', {
                weekday: historyPeriod === 'weekly' ? 'long' : 'short',
                day: 'numeric',
                month: 'short',
                year: historyPeriod === 'monthly' ? 'numeric' : undefined,
                timeZone: 'UTC',
              });
              const dayTotal = dayLogs.reduce((s, l) => s + (l.calories || 0), 0);
              return (
                <div key={dateKey}>
                  {/* Day header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-gray-700">{dayLabel}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg">
                      {dayTotal} kcal
                    </span>
                  </div>
                  {/* Divider */}
                  <div className="border-t border-gray-100 mb-3" />
                  {/* Log rows for this day */}
                  <div className="space-y-2">
                    {dayLogs.map((log) => <LogRow key={log._id} log={log} MEAL_ICON_MAP={MEAL_ICON_MAP} onDelete={handleDelete} />)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Shared log row component ─────────────────────────────────────────────────
function LogRow({ log, MEAL_ICON_MAP, onDelete }) {
  const MealIcon = MEAL_ICON_MAP[log.mealType] || Utensils;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 hover:border-emerald-300 hover:bg-white transition">
      <div className="flex items-center gap-3 min-w-0">
        <span className="p-2 bg-white border border-gray-200 text-emerald-600 rounded-xl flex-shrink-0">
          <MealIcon size={16} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{log.foodName}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
            <span className="capitalize">{log.mealType}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              {log.loggedVia === 'image'
                ? <><Camera size={11} /> Photo</>
                : <><PencilLine size={11} /> Text</>
              }
            </span>
            {log.confidence && (
              <>
                <span>·</span>
                <span className="capitalize">{log.confidence} conf.</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Macro pills */}
        <div className="hidden sm:flex items-center gap-2 text-xs">
          <span className="bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-lg">{log.carbs}g C</span>
          <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-lg">{log.protein}g P</span>
          <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-lg">{log.fat}g F</span>
        </div>
        <span className="text-base font-black text-gray-900 tabular-nums">
          {log.calories}<span className="text-[10px] font-normal text-gray-500 ml-0.5">kcal</span>
        </span>
        <button
          onClick={() => onDelete(log._id)}
          title="Delete this log"
          className="p-1.5 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}



