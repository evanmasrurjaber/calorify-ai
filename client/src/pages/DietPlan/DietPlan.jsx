import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  getActiveDietPlan,
  generateDietPlan,
  regenerateDay,
  regenerateMeal,
  generateRecipe,
  getGenerationContext,
  deleteActiveDietPlan,
} from '../../services/dietPlanService';
import { addBookmark, getBookmarks } from '../../services/bookmarkService';
import {
  Sparkles,
  RefreshCw,
  Calendar,
  Flame,
  Utensils,
  Info,
  Heart,
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  X,
  ChefHat,
  Globe,
  Salad,
  MessageSquare,
  Check,
  Trash2,
} from 'lucide-react';
import BgShader from '../../components/BgShader';

const CUISINE_PRESETS = [
  { id: 'bangladeshi', name: 'Bangladeshi / Bengali', emoji: '🇧🇩', desc: 'Authentic local home dishes (Shak, Ilish, Daal, Bhorta)' },
  { id: 'pan_asian', name: 'Pan-Asian', emoji: '🥢', desc: 'Thai, Japanese, Chinese stir-fries, steamed fish, soups' },
  { id: 'continental', name: 'Continental / Western', emoji: '🥩', desc: 'Grilled proteins, baked fish, roasted veggies, salads' },
  { id: 'italian', name: 'Italian', emoji: '🍝', desc: 'Whole-wheat pasta, marinara, grilled chicken, minestrone' },
  { id: 'mediterranean', name: 'Mediterranean', emoji: '🫒', desc: 'Greek salads, hummus, grilled seafood, olive oil dressings' },
  { id: 'middle_eastern', name: 'Middle Eastern', emoji: '🥙', desc: 'Shish tawook, lentil shorba, baked kababs, spiced bowls' },
  { id: 'mexican', name: 'Mexican / Latin', emoji: '🌮', desc: 'Burrito bowls, fajitas, black beans, guacamole, tacos' },
  { id: 'indian', name: 'Pan-Indian', emoji: '🍛', desc: 'Tandoori proteins, dal tadka, palak, idli, aromatic curries' },
];

const DIET_PREFERENCE_PRESETS = [
  { id: 'diabetic_friendly', name: 'Diabetic-Friendly (Low GI)', emoji: '🩸', desc: 'Complex carbs, high fiber, zero refined sugars' },
  { id: 'low_carb_keto', name: 'Low-Carb / Keto', emoji: '🥑', desc: 'Minimized rice/flour; focuses on lean proteins & greens' },
  { id: 'high_protein', name: 'High-Protein', emoji: '🥩', desc: 'Maximized protein density for muscle repair & satiety' },
  { id: 'low_oil', name: 'Low-Oil / Heart-Healthy', emoji: '🫒', desc: 'Steamed, boiled, air-fried with minimal cooking fats' },
  { id: 'vegetarian_vegan', name: 'Vegetarian / Plant-Based', emoji: '🥬', desc: '100% plant proteins: paneer, lentils, seasonal veggies' },
  { id: 'gluten_free', name: 'Gluten-Free', emoji: '🌾', desc: 'Naturally gluten-free grains, vegetables, and proteins' },
  { id: 'quick_prep', name: 'Quick & Easy (<20 mins)', emoji: '⚡', desc: 'Fast preparation times with accessible ingredients' },
  { id: 'balanced_macro', name: 'Balanced Macro', emoji: '⚖️', desc: 'Balanced carbs, protein, and healthy fats' },
];

export default function DietPlan() {
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Selected Day tab (0 to 6)
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  // Cuisine & Preferences Modal State
  const [prefModal, setPrefModal] = useState({
    isOpen: false,
    scope: 'week', // 'week' | 'day' | 'meal'
    targetDayIndex: 0,
    targetDayName: '',
    targetMeal: null,
    cuisines: ['bangladeshi'],
    customCuisine: '',
    dietPreferences: [],
    customDietPreference: '',
    customNotes: '',
  });

  // Recipe Modal states
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeData, setRecipeData] = useState(null);
  const [recipeError, setRecipeError] = useState('');
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Pre-generation context state
  const [genContext, setGenContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);

  // Delete Plan Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    fetchPlan();
    fetchContext();
  }, []);

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const { data } = await getActiveDietPlan();
      setActivePlan(data);
    } catch (err) {
      console.error(err);
      setActivePlan(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchContext = async () => {
    try {
      setContextLoading(true);
      const { data } = await getGenerationContext();
      setGenContext(data);
    } catch (err) {
      console.error('Could not load generation context:', err);
      setGenContext(null);
    } finally {
      setContextLoading(false);
    }
  };

  // ── Delete Plan Handler ──
  const handleDeletePlan = async () => {
    try {
      setDeletingPlan(true);
      setDeleteError('');
      await deleteActiveDietPlan();
      setActivePlan(null);
      setShowDeleteConfirm(false);
      fetchContext();
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Failed to delete diet plan.');
    } finally {
      setDeletingPlan(false);
    }
  };

  // ── Open Preferences Modal ──
  const handleOpenPrefModal = (scope, extra = {}) => {
    setPrefModal((prev) => ({
      ...prev,
      isOpen: true,
      scope,
      targetDayIndex: extra.dayIndex ?? selectedDayIndex,
      targetDayName: extra.dayName ?? (activePlan?.plan?.[selectedDayIndex]?.day || 'Day'),
      targetMeal: extra.meal ?? null,
    }));
  };

  const handleToggleCuisine = (id) => {
    setPrefModal((prev) => {
      const exists = prev.cuisines.includes(id);
      const updated = exists
        ? prev.cuisines.filter((c) => c !== id)
        : [...prev.cuisines, id];
      return { ...prev, cuisines: updated };
    });
  };

  const handleToggleDietPreference = (id) => {
    setPrefModal((prev) => {
      const exists = prev.dietPreferences.includes(id);
      const updated = exists
        ? prev.dietPreferences.filter((d) => d !== id)
        : [...prev.dietPreferences, id];
      return { ...prev, dietPreferences: updated };
    });
  };

  // ── Execute Generation / Regeneration based on scope ──
  const handleExecuteGeneration = async () => {
    const {
      scope,
      targetDayIndex,
      targetMeal,
      cuisines,
      customCuisine,
      dietPreferences,
      customDietPreference,
      customNotes,
    } = prefModal;

    setGenerating(true);

    try {
      if (scope === 'week') {
        const { data } = await generateDietPlan({
          cuisines,
          customCuisine,
          dietPreferences,
          customDietPreference,
          customNotes,
        });
        setActivePlan(data);
        setSelectedDayIndex(0);
      } else if (scope === 'day') {
        const { data } = await regenerateDay({
          dayIndex: targetDayIndex,
          cuisines,
          customCuisine,
          dietPreferences,
          customDietPreference,
          customNotes,
        });
        setActivePlan(data);
      } else if (scope === 'meal' && targetMeal) {
        const { data } = await regenerateMeal({
          mealId: targetMeal._id,
          cuisines,
          customCuisine,
          dietPreferences,
          customDietPreference,
          customNotes,
        });
        setActivePlan(data);
      }

      setPrefModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      console.error('Generation error:', err);
      alert(err.response?.data?.message || 'Failed to generate diet plan. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMealClick = async (meal) => {
    setSelectedMeal(meal);
    setRecipeData(null);
    setRecipeError('');
    setBookmarked(false);

    if (meal.recipe) {
      try {
        const currentRecipeData = JSON.parse(meal.recipe);
        setRecipeData(currentRecipeData);
      } catch (e) {
        setRecipeData(null);
      }
    }

    try {
      const res = await getBookmarks();
      const bookmarks = res.data || [];
      const isBookmarked = bookmarks.some((b) => b.mealName === meal.name);
      setBookmarked(isBookmarked);
    } catch (e) {
      console.error('Failed to fetch bookmarks:', e);
    }
  };

  const handleGenerateRecipe = async () => {
    if (!selectedMeal) return;
    setRecipeLoading(true);
    setRecipeError('');
    try {
      const { data } = await generateRecipe(selectedMeal._id);
      setRecipeData(data);
    } catch (err) {
      console.error(err);
      setRecipeError('Failed to fetch or generate recipe from Gemini AI.');
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (!recipeData || !selectedMeal) return;
    setBookmarking(true);
    try {
      const recipeToSave = {
        mealName: selectedMeal.name,
        calories: selectedMeal.calories,
        carbs: selectedMeal.carbs,
        protein: selectedMeal.protein,
        fat: selectedMeal.fat,
        ...recipeData,
      };
      await addBookmark(recipeToSave);
      setBookmarked(true);
    } catch (err) {
      console.error(err);
      alert('Failed to bookmark recipe.');
    } finally {
      setBookmarking(false);
    }
  };

  const currentDayData = useMemo(() => {
    if (!activePlan?.plan || activePlan.plan.length === 0) return null;
    return activePlan.plan[selectedDayIndex] || activePlan.plan[0];
  }, [activePlan, selectedDayIndex]);

  const currentDayMacros = useMemo(() => {
    if (!currentDayData?.meals) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 };
    }
    return currentDayData.meals.reduce(
      (acc, m) => ({
        calories: acc.calories + (m.calories || 0),
        protein: acc.protein + (m.protein || 0),
        carbs: acc.carbs + (m.carbs || 0),
        fat: acc.fat + (m.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [currentDayData]);

  const targetCalories = genContext?.profile?.calculatedTarget || 2000;
  const targetProtein = Math.round((targetCalories * 0.25) / 4);
  const targetCarbs = Math.round((targetCalories * 0.5) / 4);
  const targetFat = Math.round((targetCalories * 0.25) / 9);

  const caloriePercent = Math.min(
    Math.round((currentDayMacros.calories / targetCalories) * 100),
    100
  );
  const strokeDashoffset = 283 - (283 * caloriePercent) / 100;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-12 h-12 rounded-2xl bg-[#10B981]/10 flex items-center justify-center text-[#10B981] animate-spin">
          <RefreshCw size={24} />
        </div>
        <p className="text-sm font-semibold text-[#565e74] animate-pulse">Loading personalized nutrition plan...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Interactive WebGL Shader Background */}
      <BgShader />

      <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
        {/* ── Top Header Section ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white/80 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-6 sm:p-8 shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-[#006c49] uppercase tracking-widest bg-[#10B981]/10 px-2.5 py-0.5 rounded-md">
                Clinical Nutrition AI
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              Weekly Meal Plan
            </h1>
            <p className="text-sm text-[#565e74] font-medium mt-1">
              Your personalized clinical nutrition strategy for the week, calibrated with your health metrics.
            </p>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => handleOpenPrefModal('week')}
              disabled={generating || deletingPlan}
              className="flex-1 md:flex-initial bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white font-bold py-3.5 px-6 rounded-2xl transition-all shadow-md shadow-[#10B981]/20 flex items-center justify-center gap-2 group hover:scale-[1.02] disabled:opacity-60 active:scale-95 text-sm cursor-pointer"
            >
              <RefreshCw
                size={18}
                className={`group-hover:rotate-180 transition-transform duration-500 ${
                  generating && prefModal.scope === 'week' ? 'animate-spin' : ''
                }`}
              />
              <span>
                {generating && prefModal.scope === 'week'
                  ? 'Synthesizing Plan...'
                  : activePlan
                  ? 'Regenerate Entire Week'
                  : 'Generate 7-Day Plan'}
              </span>
            </button>
              {activePlan && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={generating || deletingPlan}
                className="flex-1 md:flex-initial border border-red-200 bg-red-50 hover:bg-red-100/80 text-red-700 font-bold py-3.5 px-5 rounded-2xl transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 active:scale-95 cursor-pointer shadow-xs"
                title="Delete active meal plan"
              >
                <Trash2 size={17} className="text-red-600" />
                <span>Delete Plan</span>
              </button>
            )}

          </div>
        </div>

        {!activePlan ? (
          /* ── When No Active Plan: Clinical Data Sources & Generate CTA ── */
          <div className="space-y-6 animate-fade-in-up">
            {/* Data Sources Ingestion Panel */}
            <div className="bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#0F172A] tracking-tight flex items-center gap-2">
                  <Sparkles className="text-[#10B981]" size={22} />
                  Multi-Source Clinical Ingestion
                </h3>
                <p className="text-xs sm:text-sm text-[#565e74] mt-1 leading-relaxed">
                  Calorify AI merges your personal health profile, uploaded lab reports, and wearable activity data to construct a safe, authentic diet.
                </p>
              </div>

              {contextLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-32 bg-[#f8f9ff] border border-[#e1e2e8] rounded-2xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Source 1: Health Profile */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    genContext?.profile?.isComplete
                      ? 'bg-emerald-50/50 border-emerald-200/70'
                      : 'bg-gray-50 border-gray-200/60'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                        📋 Health Profile
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        genContext?.profile?.isComplete
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {genContext?.profile?.isComplete ? 'Active' : 'Incomplete'}
                      </span>
                    </div>
                    {genContext?.profile ? (
                      <ul className="text-xs text-[#565e74] space-y-1">
                        <li>• Goal: <strong className="text-[#0F172A]">{genContext.profile.goalLabel}</strong></li>
                        <li>• Target: <strong className="text-[#0F172A]">{genContext.profile.calculatedTarget} kcal/day</strong></li>
                        <li>• Age: {genContext.profile.age ?? '?'} · Weight: {genContext.profile.weight ?? '?'} kg</li>
                      </ul>
                    ) : (
                      <p className="text-xs text-[#565e74] italic">Profile data not specified</p>
                    )}
                  </div>

                  {/* Source 2: Medical Reports */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    genContext?.medicalReport?.available
                      ? 'bg-blue-50/50 border-blue-200/70'
                      : 'bg-gray-50 border-gray-200/60'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                        🩺 Lab Reports
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        genContext?.medicalReport?.available
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {genContext?.medicalReport?.available ? 'Synced' : 'None'}
                      </span>
                    </div>
                    {genContext?.medicalReport?.available ? (
                      <ul className="text-xs text-[#565e74] space-y-1">
                        <li>• Diagnoses: {genContext.medicalReport.diagnoses?.join(', ') || 'None'}</li>
                        <li>• HbA1c: {genContext.medicalReport.hba1c ? `${genContext.medicalReport.hba1c}%` : 'Normal'}</li>
                        <li>• Allergies: {genContext.medicalReport.allergies?.join(', ') || 'None'}</li>
                      </ul>
                    ) : (
                      <p className="text-xs text-[#565e74] italic">No medical reports uploaded</p>
                    )}
                  </div>

                  {/* Source 3: Wearable Activity */}
                  <div className={`p-5 rounded-2xl border transition-all ${
                    genContext?.wearable?.available
                      ? 'bg-orange-50/50 border-orange-200/70'
                      : 'bg-gray-50 border-gray-200/60'
                  }`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-[#0F172A] flex items-center gap-2">
                        ⌚ Wearable Sync
                      </span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        genContext?.wearable?.available
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {genContext?.wearable?.available ? 'Live' : 'Not Linked'}
                      </span>
                    </div>
                    {genContext?.wearable?.available ? (
                      <ul className="text-xs text-[#565e74] space-y-1">
                        <li>• Daily Steps: <strong className="text-[#0F172A]">{genContext.wearable.steps?.toLocaleString()}</strong></li>
                        <li>• Active Burn: <strong className="text-[#0F172A]">{genContext.wearable.caloriesBurned} kcal</strong></li>
                      </ul>
                    ) : (
                      <p className="text-xs text-[#565e74] italic">Link Google Health on Wearable page</p>
                    )}
                  </div>
                </div>
              )}

              {/* Incomplete profile warning */}
              {genContext && !genContext.profile?.isComplete && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs">
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Profile incomplete:</strong> Please fill in your age, weight, and fitness goal in{' '}
                    <a href="/profile" className="underline font-bold hover:text-amber-700">Profile Settings</a>{' '}
                    for optimal TDEE & macro calculations.
                  </div>
                </div>
              )}
            </div>

            {/* Main Generate CTA Card */}
            <div className="bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-3xl p-8 sm:p-12 text-center shadow-xs space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center mx-auto shadow-sm shadow-[#10B981]/15">
                <Calendar size={32} />
              </div>
              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-2xl font-black text-[#0F172A] tracking-tight">
                  Generate Your 7-Day Clinical Meal Plan
                </h3>
                <p className="text-xs sm:text-sm text-[#565e74] leading-relaxed">
                  Our Gemini-powered clinical engine will construct 28 customized meals structured around your TDEE target of <strong>{targetCalories} kcal/day</strong>.
                </p>
              </div>

              <button
                onClick={() => handleOpenPrefModal('week')}
                disabled={generating}
                className="bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white font-bold px-10 py-4 rounded-2xl transition shadow-lg shadow-[#10B981]/25 hover:scale-[1.02] active:scale-95 disabled:opacity-60 text-sm flex items-center justify-center gap-2 mx-auto"
              >
                <Sparkles size={18} />
                <span>Customize & Generate 7-Day Plan 🚀</span>
              </button>
            </div>
          </div>
        ) : (
          /* ── Main Layout: 7-Day Meal Plan Grid + Sticky Nutrition Summary ── */
          <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">
            {/* ── Left Column: 7-Day Tabs & Meal Cards (8 cols) ── */}
            <div className="w-full order-2 lg:order-1 lg:col-span-8 flex flex-col gap-6">
              {/* 7-Day Tabs Strip */}
              <div className="bg-white/90 backdrop-blur-md border border-[#e1e2e8] rounded-2xl p-2 shadow-xs overflow-x-auto scrollbar-hide">
                <ul className="flex items-center gap-1.5 whitespace-nowrap min-w-max">
                  {activePlan.plan.map((dayData, idx) => {
                    const isSelected = selectedDayIndex === idx;
                    return (
                      <li key={idx}>
                        <button
                          onClick={() => setSelectedDayIndex(idx)}
                          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 flex flex-col items-center gap-0.5 ${
                            isSelected
                              ? 'bg-[#10B981] text-white shadow-sm shadow-[#10B981]/30 scale-[1.02]'
                              : 'text-[#565e74] hover:bg-[#f8f9ff] hover:text-[#0F172A]'
                          }`}
                        >
                          <span className="tracking-wide">DAY {idx + 1}</span>
                          <span className="text-[10px] font-medium opacity-85">
                            {dayData.day}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Day Controls Bar */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white/90 backdrop-blur-sm shadow-xs rounded-2xl p-4 sm:px-6 border border-[#e1e2e8]">
                <div className="flex items-center gap-3 text-[#0F172A] font-bold text-xs">
                  <span className="p-2 bg-[#10B981]/10 text-[#10B981] rounded-xl">
                    <Calendar size={18} />
                  </span>
                  <div>
                    <span className="text-[#565e74] font-medium block text-[10px] uppercase tracking-wider">
                      Selected Strategy
                    </span>
                    <span className="text-sm font-extrabold text-[#0F172A]">
                      {currentDayData?.day} · TARGET: {targetCalories.toLocaleString()} KCAL
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <span className="text-xs font-bold text-[#006c49] bg-[#10B981]/10 px-3 py-1 rounded-full border border-[#10B981]/20">
                    Day Total: {currentDayMacros.calories} kcal
                  </span>
                  <button
                    onClick={() =>
                      handleOpenPrefModal('day', {
                        dayIndex: selectedDayIndex,
                        dayName: currentDayData?.day,
                      })
                    }
                    disabled={generating}
                    className="p-2 bg-[#f8f9ff] hover:bg-[#10B981]/10 text-[#565e74] hover:text-[#006c49] rounded-xl border border-[#e1e2e8] transition flex items-center gap-1 text-xs font-bold"
                    title={`Regenerate ${currentDayData?.day}`}
                  >
                    <RefreshCw
                      size={14}
                      className={
                        generating && prefModal.scope === 'day' && prefModal.targetDayIndex === selectedDayIndex
                          ? 'animate-spin'
                          : ''
                      }
                    />
                    <span>Regenerate Day</span>
                  </button>
                </div>
              </div>

              {/* Meal Cards Grid */}
              <div className="grid grid-cols-1 gap-5">
                {currentDayData?.meals?.map((meal, mealIdx) => (
                  <div
                    key={meal._id || mealIdx}
                    className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xs border border-[#e1e2e8] p-5 sm:p-6 transition-all duration-300 relative group hover:-translate-y-1 hover:shadow-md animate-fade-in-up"
                    style={{ animationDelay: `${0.1 * (mealIdx + 1)}s` }}
                  >
                    {/* Meal Header */}
                    <div className="flex justify-between items-start mb-5">
                      <div>
                        <span className="inline-block px-3 py-1 bg-[#10B981]/10 text-[#006c49] text-[10px] font-extrabold rounded-md mb-2 tracking-widest uppercase">
                          {meal.meal}
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-[#0F172A] leading-snug">
                          {meal.name}
                        </h3>
                      </div>
                      
                      {/* Top Right Actions: ONLY Swap/Refresh button (removed redundant ChefHat) */}
                      <button
                        onClick={() =>
                          handleOpenPrefModal('meal', {
                            meal,
                            dayIndex: selectedDayIndex,
                            dayName: currentDayData?.day,
                          })
                        }
                        disabled={generating}
                        className="text-[#565e74] hover:text-[#10B981] p-2 transition-colors rounded-xl hover:bg-[#f8f9ff] shrink-0 border border-transparent hover:border-[#e1e2e8]"
                        title="Swap this meal with an alternative"
                      >
                        <RefreshCw
                          size={17}
                          className={
                            generating && prefModal.scope === 'meal' && prefModal.targetMeal?._id === meal._id
                              ? 'animate-spin'
                              : ''
                          }
                        />
                      </button>
                    </div>

                    {/* Calorie & Macro Info */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 mb-5">
                      {/* Calories */}
                      <div className="flex items-center justify-center sm:justify-start gap-2 bg-[#f8f9ff] border border-[#e1e2e8]/60 px-4 py-2.5 rounded-xl w-full md:w-auto">
                        <Flame className="text-orange-500" size={18} />
                        <span className="text-lg font-black text-[#0F172A]">{meal.calories}</span>
                        <span className="text-xs font-semibold text-[#565e74]">kcal</span>
                      </div>

                      {/* 3 Macro Cards */}
                      <div className="flex gap-2 sm:gap-3 flex-1">
                        {/* Protein */}
                        <div className="flex-1 bg-[#f8f9ff] p-2.5 rounded-xl border border-[#e1e2e8]/60 flex flex-col justify-center items-center sm:items-start text-center sm:text-left transition-colors hover:bg-white">
                          <span className="text-[10px] font-bold text-[#565e74] uppercase tracking-wider mb-0.5">
                            Protein
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                            <span className="text-xs sm:text-sm text-[#0F172A] font-bold">
                              {meal.protein || 0}g
                            </span>
                          </div>
                        </div>

                        {/* Carbs */}
                        <div className="flex-1 bg-[#f8f9ff] p-2.5 rounded-xl border border-[#e1e2e8]/60 flex flex-col justify-center items-center sm:items-start text-center sm:text-left transition-colors hover:bg-white">
                          <span className="text-[10px] font-bold text-[#565e74] uppercase tracking-wider mb-0.5">
                            Carbs
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#005ac2]" />
                            <span className="text-xs sm:text-sm text-[#0F172A] font-bold">
                              {meal.carbs || 0}g
                            </span>
                          </div>
                        </div>

                        {/* Fat */}
                        <div className="flex-1 bg-[#f8f9ff] p-2.5 rounded-xl border border-[#e1e2e8]/60 flex flex-col justify-center items-center sm:items-start text-center sm:text-left transition-colors hover:bg-white">
                          <span className="text-[10px] font-bold text-[#565e74] uppercase tracking-wider mb-0.5">
                            Fat
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                            <span className="text-xs sm:text-sm text-[#0F172A] font-bold">
                              {meal.fat || 0}g
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer: View Recipe Trigger */}
                    <div className="pt-3 border-t border-[#e1e2e8]/70 flex justify-end items-center text-xs">
                      <button
                        onClick={() => handleMealClick(meal)}
                        className="font-bold text-[#006c49] hover:text-[#10B981] flex items-center gap-1 transition-all group-hover:translate-x-0.5"
                      >
                        <span>View Recipe & AI Steps</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right Column: Sticky Nutritional Summary Panel (4 cols) ── */}
            <div className="w-full order-1 lg:order-2 lg:col-span-4 animate-fade-in-up">
              <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-[#e1e2e8] p-6 sm:p-7 lg:sticky lg:top-8 transition-all hover:shadow-md space-y-7">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-lg text-[#0F172A] tracking-tight">
                    Daily Nutrition Summary
                  </h3>
                  <span className="text-[11px] font-bold bg-[#10B981]/10 text-[#006c49] px-2.5 py-0.5 rounded-full">
                    {currentDayData?.day}
                  </span>
                </div>

                {/* Calorie Donut Chart */}
                <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                  <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" fill="none" r="45" stroke="#f2f3f9" strokeWidth="9" />
                    <circle
                      className="transition-all duration-1000 ease-out"
                      cx="50"
                      cy="50"
                      fill="none"
                      r="45"
                      stroke="#10B981"
                      strokeDasharray="283"
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      strokeWidth="9"
                    />
                  </svg>
                  <div className="text-center bg-white/90 backdrop-blur-sm w-32 h-32 rounded-full flex flex-col items-center justify-center shadow-xs z-10 relative">
                    <span className="block text-2xl font-black text-[#0F172A] leading-none mb-1">
                      {currentDayMacros.calories.toLocaleString()}
                    </span>
                    <span className="block text-[10px] font-bold text-[#565e74] uppercase tracking-widest">
                      of {targetCalories.toLocaleString()} kcal
                    </span>
                  </div>
                </div>

                {/* Macro Progress Bars */}
                <div className="space-y-5">
                  {/* Protein */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end text-xs">
                      <span className="font-bold text-[#0F172A] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                        PROTEIN
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {currentDayMacros.protein}g{' '}
                        <span className="text-[#565e74] font-normal text-[11px]">/ {targetProtein}g</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#f2f3f9] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#F59E0B] h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((currentDayMacros.protein / (targetProtein || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end text-xs">
                      <span className="font-bold text-[#0F172A] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#005ac2]" />
                        CARBS
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {currentDayMacros.carbs}g{' '}
                        <span className="text-[#565e74] font-normal text-[11px]">/ {targetCarbs}g</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#f2f3f9] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#005ac2] h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((currentDayMacros.carbs / (targetCarbs || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-end text-xs">
                      <span className="font-bold text-[#0F172A] flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                        FAT
                      </span>
                      <span className="font-bold text-[#0F172A]">
                        {currentDayMacros.fat}g{' '}
                        <span className="text-[#565e74] font-normal text-[11px]">/ {targetFat}g</span>
                      </span>
                    </div>
                    <div className="w-full bg-[#f2f3f9] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#EF4444] h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min((currentDayMacros.fat / (targetFat || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* On Track Status Banner */}
                <div className="pt-4 border-t border-[#e1e2e8] flex items-center justify-center gap-2 text-xs font-bold text-[#006c49] bg-[#10B981]/10 py-3 rounded-xl border border-[#10B981]/20">
                  <CheckCircle size={17} className="text-[#10B981]" />
                  <span>ON TRACK FOR CLINICAL GOALS</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CUISINE & PREFERENCES POPUP MODAL (PORTAL) ── */}
        {prefModal.isOpen &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
              <div className="bg-white border border-[#e1e2e8] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] my-auto animate-fade-in-up">
                {/* Header */}
                <div className="p-6 bg-[#fafbff] border-b border-[#e1e2e8] flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-[#006c49] bg-[#10B981]/10 px-2.5 py-0.5 rounded-md tracking-wider">
                      {prefModal.scope === 'week'
                        ? 'Full Week Generation'
                        : prefModal.scope === 'day'
                        ? `Single Day · ${prefModal.targetDayName}`
                        : `Meal Replacement · ${prefModal.targetMeal?.meal}`}
                    </span>
                    <h3 className="text-xl font-extrabold text-[#0F172A]">
                      {prefModal.scope === 'week'
                        ? 'Customize Your 7-Day Meal Plan'
                        : prefModal.scope === 'day'
                        ? `Regenerate ${prefModal.targetDayName}'s Meal Plan`
                        : `Replace "${prefModal.targetMeal?.name}" with a New Dish`}
                    </h3>
                    <p className="text-xs text-[#565e74]">
                      {prefModal.scope === 'meal'
                        ? 'Choose cuisine styles and dietary goals to generate a fresh alternative for this meal slot.'
                        : 'Select cuisine styles and dietary preferences to guide Gemini AI in generating your schedule.'}
                    </p>
                  </div>
                  <button
                    onClick={() => setPrefModal((prev) => ({ ...prev, isOpen: false }))}
                    disabled={generating}
                    className="text-[#565e74] hover:text-[#0F172A] p-2 rounded-xl hover:bg-gray-100 transition cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
                  {/* 1. CUISINE STYLES SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                        <Globe size={15} className="text-[#10B981]" />
                        1. Select Cuisine Style(s)
                      </label>
                      <span className="text-[11px] text-[#565e74] font-medium">Multiple choice</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {CUISINE_PRESETS.map((opt) => {
                        const isSelected = prefModal.cuisines.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleToggleCuisine(opt.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                              isSelected
                                ? 'bg-[#10B981]/10 border-[#10B981] shadow-xs'
                                : 'bg-[#f8f9ff] border-[#e1e2e8] hover:border-gray-300'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isSelected
                                  ? 'bg-[#10B981] border-[#10B981] text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                                <span>{opt.emoji}</span>
                                <span className="truncate">{opt.name}</span>
                              </div>
                              <p className="text-[10px] text-[#565e74] leading-snug mt-0.5 line-clamp-2">
                                {opt.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Cuisine Input Field */}
                    <div className="pt-1">
                      <input
                        type="text"
                        value={prefModal.customCuisine}
                        onChange={(e) =>
                          setPrefModal((prev) => ({ ...prev, customCuisine: e.target.value }))
                        }
                        placeholder="Or specify custom cuisine (e.g. Japanese, Greek, Fusion, Turkish...)"
                        className="w-full text-xs p-2.5 rounded-xl border border-[#e1e2e8] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none transition bg-[#f8f9ff]"
                      />
                    </div>
                  </div>

                  <hr className="border-[#e1e2e8]" />

                  {/* 2. DIETARY PREFERENCES SECTION */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                        <Salad size={15} className="text-emerald-600" />
                        2. Dietary Preferences & Health Constraints
                      </label>
                      <span className="text-[11px] text-[#565e74] font-medium">Multiple choice</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {DIET_PREFERENCE_PRESETS.map((opt) => {
                        const isSelected = prefModal.dietPreferences.includes(opt.id);
                        return (
                          <div
                            key={opt.id}
                            onClick={() => handleToggleDietPreference(opt.id)}
                            className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                                : 'bg-[#f8f9ff] border-[#e1e2e8] hover:border-gray-300'
                            }`}
                          >
                            <div
                              className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={12} strokeWidth={3} />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                                <span>{opt.emoji}</span>
                                <span className="truncate">{opt.name}</span>
                              </div>
                              <p className="text-[10px] text-[#565e74] leading-snug mt-0.5 line-clamp-2">
                                {opt.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Diet Preference Input Field */}
                    <div className="pt-1">
                      <input
                        type="text"
                        value={prefModal.customDietPreference}
                        onChange={(e) =>
                          setPrefModal((prev) => ({
                            ...prev,
                            customDietPreference: e.target.value,
                          }))
                        }
                        placeholder="Or specify custom dietary goal (e.g. Dairy-Free, Low-Sodium, Intermittent Fasting...)"
                        className="w-full text-xs p-2.5 rounded-xl border border-[#e1e2e8] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none transition bg-[#f8f9ff]"
                      />
                    </div>
                  </div>

                  <hr className="border-[#e1e2e8]" />

                  {/* 3. CUSTOM NOTES / REQUESTS SECTION */}
                  <div className="space-y-2">
                    <label className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                      <MessageSquare size={15} className="text-blue-500" />
                      Custom Dietary Notes / Requests (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={prefModal.customNotes}
                      onChange={(e) =>
                        setPrefModal((prev) => ({ ...prev, customNotes: e.target.value }))
                      }
                      placeholder="e.g., more fish curries, avoid mustard oil, include fresh seasonal fruits, less spicy dinner..."
                      className="w-full text-xs p-3 rounded-xl border border-[#e1e2e8] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981] outline-none transition bg-[#f8f9ff]"
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-[#fafbff] border-t border-[#e1e2e8] flex justify-end gap-3">
                  <button
                    onClick={() => setPrefModal((prev) => ({ ...prev, isOpen: false }))}
                    disabled={generating}
                    className="px-5 py-2.5 text-xs font-bold text-[#565e74] hover:text-[#0F172A] hover:bg-gray-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExecuteGeneration}
                    disabled={generating}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white text-xs font-bold rounded-xl transition shadow-md shadow-[#10B981]/25 flex items-center gap-2 disabled:opacity-60 active:scale-95 cursor-pointer"
                  >
                    {generating ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Synthesizing with Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>
                          {prefModal.scope === 'week'
                            ? 'Generate 7-Day Plan'
                            : prefModal.scope === 'day'
                            ? `Regenerate ${prefModal.targetDayName}`
                            : 'Regenerate Dish 🪄'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── Meal Detail / Recipe Modal (PORTAL) ── */}
        {selectedMeal &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
              <div className="bg-white border border-[#e1e2e8] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] my-auto animate-fade-in-up">
                {/* Modal Header */}
                <div className="p-6 bg-[#fafbff] border-b border-[#e1e2e8] flex justify-between items-start">
                  <div>
                    <span className="text-[11px] uppercase font-extrabold text-[#006c49] bg-[#10B981]/10 px-2.5 py-0.5 rounded-md tracking-wider">
                      {selectedMeal.meal} Recipe & Nutrition
                    </span>
                    <h3 className="text-2xl font-black text-[#0F172A] mt-2">{selectedMeal.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {recipeData && (
                      <button
                        onClick={handleBookmark}
                        disabled={bookmarking || bookmarked}
                        className={`p-2.5 rounded-xl border transition flex items-center justify-center cursor-pointer ${
                          bookmarked
                            ? 'bg-rose-50 text-rose-500 border-rose-200 shadow-xs'
                            : 'bg-white text-[#565e74] hover:text-rose-500 border-[#e1e2e8] hover:bg-rose-50'
                        }`}
                        title={bookmarked ? 'Recipe Bookmarked!' : 'Bookmark Recipe'}
                      >
                        <Heart size={20} className={bookmarked ? 'fill-rose-500' : ''} />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedMeal(null)}
                      className="text-[#565e74] hover:text-[#0F172A] bg-white p-2 rounded-xl border border-[#e1e2e8] hover:bg-gray-100 transition cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Modal Content Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white">
                  {/* Macro Pills */}
                  <div className="grid grid-cols-4 gap-2 text-center bg-[#f8f9ff] p-3.5 rounded-2xl border border-[#e1e2e8]">
                    <div>
                      <span className="block text-[10px] font-bold text-[#565e74] uppercase">Calories</span>
                      <span className="text-sm font-black text-orange-600">{selectedMeal.calories} kcal</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-[#565e74] uppercase">Carbs</span>
                      <span className="text-sm font-black text-[#005ac2]">{selectedMeal.carbs}g</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-[#565e74] uppercase">Protein</span>
                      <span className="text-sm font-black text-[#F59E0B]">{selectedMeal.protein}g</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-[#565e74] uppercase">Fat</span>
                      <span className="text-sm font-black text-[#EF4444]">{selectedMeal.fat}g</span>
                    </div>
                  </div>

                  {/* Generate Action if uncached */}
                  {!recipeData && !recipeLoading && (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto shadow-xs">
                        <Flame size={28} className="animate-bounce" />
                      </div>
                      <div className="space-y-1 max-w-sm mx-auto">
                        <h4 className="font-bold text-[#0F172A] text-sm">Generate AI Recipe & Cooking Steps</h4>
                        <p className="text-xs text-[#565e74]">
                          Get exact ingredient measurements, cooking directions, and local food trivia.
                        </p>
                      </div>
                      <button
                        onClick={handleGenerateRecipe}
                        className="bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold px-8 py-3.5 rounded-xl transition shadow-md shadow-orange-500/20 active:scale-95 text-xs inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Sparkles size={16} />
                        <span>Generate AI Recipe & Trivia 🪄</span>
                      </button>
                    </div>
                  )}

                  {recipeLoading && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#10B981] border-t-transparent" />
                      <p className="text-xs font-semibold text-[#565e74]">Consulting Gemini AI for authentic recipe & trivia...</p>
                    </div>
                  )}

                  {recipeError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-medium">
                      {recipeError}
                    </div>
                  )}

                  {recipeData && (
                    <div className="space-y-6 animate-fade-in-up">
                      {/* Ingredients List */}
                      <div className="bg-[#f8f9ff] p-5 rounded-2xl border border-[#e1e2e8] space-y-3">
                        <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                          <Utensils size={16} className="text-[#10B981]" />
                          Ingredients List
                        </h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#565e74]">
                          {recipeData.ingredients?.map((ing, idx) => (
                            <li key={idx} className="flex items-start gap-2 bg-white p-2 rounded-lg border border-[#e1e2e8]/70">
                              <span className="text-[#10B981] font-bold">•</span>
                              <span>{ing}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Cooking Steps */}
                      <div className="bg-[#f8f9ff] p-5 rounded-2xl border border-[#e1e2e8] space-y-3">
                        <h4 className="text-sm font-bold text-[#0F172A] flex items-center gap-2">
                          <Flame size={16} className="text-orange-500" />
                          Cooking Directions
                        </h4>
                        <ol className="list-decimal list-outside ml-4 text-xs text-[#565e74] space-y-2.5">
                          {recipeData.instructions?.map((step, idx) => (
                            <li key={idx} className="leading-relaxed pl-1">
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>

                      {/* Local Health Trivia */}
                      {recipeData.trivia?.length > 0 && (
                        <div className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-2xl space-y-2.5">
                          <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
                            <Info size={16} className="text-amber-600" />
                            Nutrition & Cultural Trivia
                          </h4>
                          <ul className="space-y-2">
                            {recipeData.trivia.map((fact, idx) => (
                              <li key={idx} className="text-xs text-amber-900/90 leading-relaxed flex items-start gap-2">
                                <span>💡</span>
                                <span>{fact}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ── DELETE PLAN CONFIRMATION MODAL (PORTAL) ── */}
        {showDeleteConfirm &&
          createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md overflow-y-auto">
              <div className="bg-white border border-red-150 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative flex flex-col p-6 sm:p-7 space-y-5 my-auto animate-fade-in-up">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900">Delete Diet Plan?</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      This will permanently remove your active 7-day meal schedule.
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-200/70">
                  Are you sure you want to delete your active diet plan? Your health profile and lab reports will remain intact, and you can synthesize a new personalized schedule anytime.
                </p>

                {deleteError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3.5 rounded-xl font-medium">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deletingPlan}
                    className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeletePlan}
                    disabled={deletingPlan}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-red-500/25 flex items-center gap-2 disabled:opacity-60 active:scale-95 cursor-pointer"
                  >
                    {deletingPlan ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Deleting Plan...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={14} />
                        <span>Yes, Delete Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
}
