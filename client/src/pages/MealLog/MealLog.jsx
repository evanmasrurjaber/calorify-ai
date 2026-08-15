// AI Meal Log — Member 2 (Jarin Tasnim Dia)
// Supports: image upload (Gemini Vision) + text entry (Gemini text)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { logMealText, logMealImage, getDailyLog, deleteMealLog } from '../../services/mealLogService';
import { useAuth } from '../../context/AuthContext';

// ─── Helper: today as YYYY-MM-DD ─────────────────────────────────────────────
const todayString = () => new Date().toISOString().split('T')[0];

// ─── Confidence badge component ───────────────────────────────────────────────
function ConfidenceBadge({ level }) {
  const colours = {
    high:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    medium: 'bg-amber-500/15  text-amber-400  border-amber-500/30',
    low:    'bg-rose-500/15   text-rose-400   border-rose-500/30',
  };
  const icons = { high: '✓', medium: '~', low: '?' };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${colours[level] || colours.medium}`}>
      {icons[level] || '~'} {level ? level.charAt(0).toUpperCase() + level.slice(1) : 'Medium'} Confidence
    </span>
  );
}

// ─── Macro bar component ──────────────────────────────────────────────────────
function MacroBar({ label, value, unit, colour, max }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-semibold">{value}{unit}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${colour}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Results card shown after Gemini analysis ─────────────────────────────────
function ResultCard({ result, onSave, saving, saved }) {
  if (!result) return null;
  return (
    <div className="mt-6 bg-gray-900/70 border border-gray-700/60 rounded-2xl p-5 space-y-5 animate-[fadeIn_0.4s_ease]">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-gray-500 mb-0.5">Detected</p>
          <h3 className="text-base font-bold text-white leading-snug">{result.foodName}</h3>
        </div>
        <ConfidenceBadge level={result.confidence} />
      </div>

      {/* Big calorie number */}
      <div className="flex items-end gap-2">
        <span className="text-5xl font-black text-white tabular-nums">{result.calories}</span>
        <span className="text-gray-400 text-sm mb-2">kcal</span>
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
          <div className="rounded-xl overflow-hidden border border-gray-800/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800/40 text-gray-500">
                  <th className="text-left px-3 py-2 font-medium">Item</th>
                  <th className="text-left px-3 py-2 font-medium">Portion</th>
                  <th className="text-right px-3 py-2 font-medium">Kcal</th>
                </tr>
              </thead>
              <tbody>
                {result.breakdown.map((b, i) => (
                  <tr key={i} className="border-t border-gray-800/40 hover:bg-gray-800/20 transition-colors">
                    <td className="px-3 py-2 text-gray-300">{b.item}</td>
                    <td className="px-3 py-2 text-gray-500">{b.portionEstimate}</td>
                    <td className="px-3 py-2 text-right text-white font-semibold">{b.calories}</td>
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
          className="w-full py-3 rounded-xl font-semibold text-sm bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
        >
          {saving ? (
            <><span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />Saving…</>
          ) : 'Save to Log'}
        </button>
      ) : (
        <div className="w-full py-3 rounded-xl font-semibold text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-center">
          ✓ Saved to your meal log
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
  const fileInputRef = useRef(null);

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
  const [historyDate,   setHistoryDate]   = useState(todayString());
  const [historyLogs,   setHistoryLogs]   = useState([]);
  const [historyTotals, setHistoryTotals] = useState({ calories: 0, carbs: 0, protein: 0, fat: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);

  const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks'];
  const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snacks: '🍎' };

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (date) => {
    try {
      setHistoryLoading(true);
      const { data } = await getDailyLog(date);
      setHistoryLogs(data.logs   || []);
      setHistoryTotals(data.totals || { calories: 0, carbs: 0, protein: 0, fat: 0 });
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(historyDate); }, [historyDate, fetchHistory]);

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
      const { data } = await logMealImage(fd);
      // Backend saves automatically when image is sent; show result
      setImageResult(data.log);
      setImageSaved(true); // auto-saved on analysis
      fetchHistory(historyDate);
    } catch (err) {
      setImageError(err.response?.data?.message || 'Failed to analyse image. Please try again.');
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
      });
      setTextResult(data.log);
      setTextSaved(true); // auto-saved on analysis
      fetchHistory(historyDate);
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
      fetchHistory(historyDate);
    } catch {
      // silent fail — could add toast here
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-1">AI Meal Logger</h1>
        <p className="text-gray-400 text-sm">Upload a photo or type a food name — Gemini estimates the calories and macros instantly.</p>
      </div>

      {/* ── Log panel ── */}
      <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6">

        {/* Tab buttons */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'image', label: '📸 Scan Meal' },
            { id: 'text',  label: '✏️ Log by Text' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-gray-800/60 text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── IMAGE TAB ── */}
        {activeTab === 'image' && (
          <div className="space-y-5">
            {/* Meal type selector */}
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setImageMealType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                    imageMealType === t
                      ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                      : 'bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:text-white'
                  }`}
                >
                  {MEAL_ICONS[t]} {t}
                </button>
              ))}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setImageDragging(true); }}
              onDragLeave={() => setImageDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center min-h-[200px] ${
                imageDragging
                  ? 'border-purple-500 bg-purple-500/5'
                  : imagePreview
                  ? 'border-gray-700/40 bg-transparent'
                  : 'border-gray-700/60 hover:border-purple-500/60 bg-gray-800/20 hover:bg-gray-800/30'
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
                  <div className="text-4xl mb-3">🍽️</div>
                  <p className="text-sm font-semibold text-gray-300 mb-1">Drag & drop your meal photo</p>
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

            {/* Change photo button if preview is showing */}
            {imagePreview && (
              <button
                onClick={() => { setImageFile(null); setImagePreview(null); setImageResult(null); setImageSaved(false); setImageError(''); }}
                className="text-xs text-gray-500 hover:text-gray-300 underline transition"
              >
                ✕ Remove photo
              </button>
            )}

            {imageError && <p className="text-rose-400 text-sm">{imageError}</p>}

            {/* Analyse button */}
            <button
              onClick={handleAnalyseImage}
              disabled={!imageFile || imageAnalysing}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {imageAnalysing ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  Gemini is analysing your meal…
                </>
              ) : '✨ Analyse with Gemini AI'}
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
              {MEAL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setTextMealType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition ${
                    textMealType === t
                      ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                      : 'bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:text-white'
                  }`}
                >
                  {MEAL_ICONS[t]} {t}
                </button>
              ))}
            </div>

            {/* Food name */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Food Name</label>
              <input
                type="text"
                value={textFood}
                onChange={(e) => { setTextFood(e.target.value); setTextError(''); setTextResult(null); setTextSaved(false); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyseText()}
                placeholder="e.g. Dal Bhat, Biryani, Roti with Tarkari…"
                className="w-full bg-gray-800/60 border border-gray-700/60 focus:border-purple-500/60 outline-none text-white placeholder-gray-600 text-sm px-4 py-3 rounded-xl transition"
              />
            </div>

            {/* Portion (optional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Portion Size <span className="text-gray-600 normal-case font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={textPortion}
                onChange={(e) => setTextPortion(e.target.value)}
                placeholder="e.g. 1 large plate, 2 pieces, 300g…"
                className="w-full bg-gray-800/60 border border-gray-700/60 focus:border-purple-500/60 outline-none text-white placeholder-gray-600 text-sm px-4 py-3 rounded-xl transition"
              />
            </div>

            {textError && <p className="text-rose-400 text-sm">{textError}</p>}

            {/* Estimate button */}
            <button
              onClick={handleAnalyseText}
              disabled={!textFood.trim() || textAnalysing}
              className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {textAnalysing ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                  Gemini is estimating nutrition…
                </>
              ) : '✨ Estimate with Gemini AI'}
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

      {/* ── Daily History ── */}
      <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-white">Meal History</h2>
            <p className="text-xs text-gray-500 mt-0.5">All meals logged on the selected date</p>
          </div>
          <input
            type="date"
            value={historyDate}
            onChange={(e) => setHistoryDate(e.target.value)}
            className="bg-gray-800/60 border border-gray-700/50 text-gray-300 text-sm px-4 py-2 rounded-xl outline-none focus:border-purple-500/60 transition"
          />
        </div>

        {/* Daily totals banner */}
        {historyLogs.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Calories', val: historyTotals.calories, unit: 'kcal', colour: 'text-purple-400' },
              { label: 'Carbs',    val: historyTotals.carbs,    unit: 'g',    colour: 'text-amber-400'  },
              { label: 'Protein',  val: historyTotals.protein,  unit: 'g',    colour: 'text-emerald-400'},
              { label: 'Fat',      val: historyTotals.fat,      unit: 'g',    colour: 'text-rose-400'   },
            ].map(m => (
              <div key={m.label} className="bg-gray-950/60 border border-gray-800/50 rounded-2xl p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`text-xl font-black ${m.colour}`}>{m.val}<span className="text-xs font-normal text-gray-500 ml-0.5">{m.unit}</span></p>
              </div>
            ))}
          </div>
        )}

        {/* Log entries */}
        {historyLoading ? (
          <div className="flex items-center gap-3 py-10 justify-center">
            <span className="animate-spin h-5 w-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full" />
            <span className="text-gray-400 text-sm">Loading history…</span>
          </div>
        ) : historyLogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="text-gray-400 text-sm">No meals logged for this date.</p>
            <p className="text-gray-600 text-xs mt-1">Use the tabs above to log your first meal!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historyLogs.map((log) => (
              <div
                key={log._id}
                className="bg-gray-950/50 border border-gray-800/40 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 hover:border-gray-700/60 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{MEAL_ICONS[log.mealType] || '🍽️'}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{log.foodName}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[11px] text-gray-500">
                      <span className="capitalize">{log.mealType}</span>
                      <span>·</span>
                      <span>{log.loggedVia === 'image' ? '📸 Photo' : '✏️ Text'}</span>
                      {log.confidence && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{log.confidence} conf.</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {/* Macro pills */}
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg">{log.carbs}g C</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg">{log.protein}g P</span>
                    <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-lg">{log.fat}g F</span>
                  </div>
                  <span className="text-base font-black text-white tabular-nums">{log.calories}<span className="text-[10px] font-normal text-gray-500 ml-0.5">kcal</span></span>
                  <button
                    onClick={() => handleDelete(log._id)}
                    title="Delete this log"
                    className="text-gray-600 hover:text-rose-400 transition p-1 rounded-lg hover:bg-rose-500/10"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

