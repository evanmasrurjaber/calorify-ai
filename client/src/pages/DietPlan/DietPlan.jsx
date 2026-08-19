import React, { useState, useEffect } from 'react';
import { getActiveDietPlan, generateDietPlan, generateRecipe, getGenerationContext } from '../../services/dietPlanService';
import { addBookmark, getBookmarks } from '../../services/bookmarkService';
import { Heart, Flame, Utensils, Info } from 'lucide-react';

export default function DietPlan() {
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeData, setRecipeData] = useState(null);
  const [recipeError, setRecipeError] = useState('');

  // Bookmark state — declared here (above all handlers that reference it)
  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  // Data Sources Panel state
  const [genContext, setGenContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);

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

  useEffect(() => {
    fetchPlan();
    fetchContext();
  }, []);

  const handleGeneratePlan = async () => {
    try {
      setGeneratingPlan(true);
      const { data } = await generateDietPlan();
      setActivePlan(data);
    } catch (err) {
      console.error(err);
      alert('Failed to generate diet plan. Please check backend connection.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const handleMealClick = async (meal) => {
    setSelectedMeal(meal);
    setRecipeData(null);
    setRecipeError('');
    setBookmarked(false);
    
    // Check if recipe is already cached/generated in the meal subdocument
    let currentRecipeData = null;
    if (meal.recipe) {
      try {
        currentRecipeData = JSON.parse(meal.recipe);
        setRecipeData(currentRecipeData);
      } catch (e) {
        setRecipeData(null);
      }
    }

    // Check if this meal is already bookmarked
    try {
      const res = await getBookmarks();
      const bookmarks = res.data || [];
      const isBookmarked = bookmarks.some(b => b.mealName === meal.name);
      setBookmarked(isBookmarked);
    } catch (e) {
      console.error("Failed to fetch bookmarks:", e);
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
      setRecipeError('Failed to fetch or generate recipe from Gemini API.');
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (!recipeData) return;
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
      // alert('Recipe bookmarked successfully! You can view it in the Recipe Library.');
    } catch (err) {
      console.error(err);
      alert('Failed to bookmark recipe.');
    } finally {
      setBookmarking(false);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Render a single Data Source tile for the pre-generation panel */
  const DataSourceTile = ({ icon, label, available, lines = [] }) => (
    <div
      className={`flex flex-col gap-2 p-4 rounded-2xl border transition ${
        available
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-gray-950/60 border-gray-800/50'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${available ? 'text-emerald-400' : 'text-gray-500'}`}>
          {available ? '✓' : '○'} {label}
        </span>
      </div>
      {available ? (
        <ul className="space-y-0.5">
          {lines.map((l, i) => (
            <li key={i} className="text-xs text-gray-300 leading-relaxed">{l}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-gray-600 italic">Not available — will be skipped</p>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-white">7-Day Diet Plan</h2>
          <p className="text-gray-400 text-sm mt-1">Bangladeshi diet optimized for your health goal.</p>
        </div>
        {activePlan && (
          <button
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            className="bg-gray-900 hover:bg-gray-800 text-purple-400 hover:text-purple-300 border border-purple-500/20 px-6 py-3 rounded-2xl font-semibold transition"
          >
            {generatingPlan ? 'Regenerating...' : 'Regenerate Plan 🔄'}
          </button>
        )}
      </div>

      {!activePlan ? (
        /* ── No Plan: show Data Sources Panel + Generate CTA ── */
        <div className="space-y-6">
          {/* Data Sources Panel */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 shadow-xl">
            <div className="mb-5">
              <h3 className="text-lg font-bold text-white">Your Plan Will Be Generated Using:</h3>
              <p className="text-gray-400 text-sm mt-1">
                The AI uses all available data sources below to create the most personalized diet plan possible.
                Missing sources are automatically skipped.
              </p>
            </div>

            {contextLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-gray-800/50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Source 1: Health Profile */}
                <DataSourceTile
                  icon="📋"
                  label="Health Profile"
                  available={genContext?.profile?.isComplete}
                  lines={genContext?.profile ? [
                    `Goal: ${genContext.profile.goalLabel}`,
                    `Age: ${genContext.profile.age ?? '?'} · Weight: ${genContext.profile.weight ?? '?'} kg`,
                    `Activity: ${genContext.profile.activityLabel}`,
                    `Calorie Target: ${genContext.profile.calculatedTarget} kcal/day`,
                  ] : []}
                />

                {/* Source 2: Medical Report */}
                <DataSourceTile
                  icon="🩺"
                  label="Medical Reports"
                  available={genContext?.medicalReport?.available}
                  lines={genContext?.medicalReport?.available ? [
                    genContext.medicalReport.diagnoses?.length
                      ? `Diagnoses: ${genContext.medicalReport.diagnoses.slice(0, 2).join(', ')}`
                      : 'No diagnoses on record',
                    genContext.medicalReport.hba1c
                      ? `HbA1c: ${genContext.medicalReport.hba1c}%`
                      : 'HbA1c: Not recorded',
                    genContext.medicalReport.allergies?.length
                      ? `Allergies: ${genContext.medicalReport.allergies.slice(0, 2).join(', ')}`
                      : 'No medical allergies on record',
                  ] : []}
                />

                {/* Source 3: Wearable / Activity Data */}
                <DataSourceTile
                  icon="⌚"
                  label="Wearable / Activity Data"
                  available={genContext?.wearable?.available}
                  lines={genContext?.wearable?.available ? [
                    `Steps: ${genContext.wearable.steps?.toLocaleString() ?? '—'}`,
                    `Calories Burned: ${genContext.wearable.caloriesBurned ?? '—'} kcal`,
                    `Recorded: ${genContext.wearable.date ? new Date(genContext.wearable.date).toLocaleDateString() : '—'}`,
                  ] : []}
                />
              </div>
            )}

            {/* Profile incomplete warning */}
            {genContext && !genContext.profile?.isComplete && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm p-4 rounded-xl flex items-start gap-2">
                <span>⚠️</span>
                <span>
                  Your health profile is incomplete. Please fill in your age, weight, height, and fitness goal in{' '}
                  <a href="/profile" className="underline font-semibold hover:text-amber-200 transition">Profile Settings</a>{' '}
                  before generating for the best results.
                </span>
              </div>
            )}
          </div>

          {/* Generate CTA */}
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-12 text-center shadow-xl">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-2xl font-bold text-white mb-2">Ready to Generate Your Plan</h3>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              A personalized 7-day Bangladeshi meal schedule powered by Gemini AI — built from your health data above.
            </p>
            <button
              onClick={handleGeneratePlan}
              disabled={generatingPlan}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-8 py-4 rounded-2xl transition shadow-lg shadow-purple-500/20 active:scale-95"
            >
              {generatingPlan ? 'Generating with Gemini AI...' : 'Generate My 7-Day Plan 🚀'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
          {activePlan.plan.map((dayData, idx) => (
            <div key={idx} className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="border-b border-gray-800 pb-2 mb-3">
                  <h4 className="text-lg font-bold text-white">{dayData.day}</h4>
                  <span className="text-xs text-purple-400 font-semibold">{dayData.totalCalories || 0} kcal</span>
                </div>

                <div className="space-y-3">
                  {dayData.meals.map((meal, mealIdx) => (
                    <div
                      key={mealIdx}
                      onClick={() => handleMealClick(meal)}
                      className="bg-gray-950/80 border border-gray-800 hover:border-purple-500/40 p-2.5 rounded-xl cursor-pointer transition flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-1">
                          {meal.meal}
                        </span>
                        <h5 className="text-xs font-semibold text-white line-clamp-2 mb-1">
                          {meal.name}
                        </h5>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-2 border-t border-gray-800/50 pt-1.5">
                        <span>🔥 {meal.calories} cal</span>
                        <span>🥩 {meal.protein}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Meal Detail / Recipe Modal ── */}
      {selectedMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <div className="bg-white border border-emerald-300 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-emerald-100 to-emerald-200 border-b border-emerald-300 flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-extrabold text-emerald-700 tracking-wider">
                  {selectedMeal.meal} Recipe Generator
                </span>
                <h3 className="text-2xl font-black text-gray-900 mt-1">{selectedMeal.name}</h3>
              </div>
              <div className="flex items-center gap-3">
                {recipeData && (
                  <button
                    onClick={handleBookmark}
                    disabled={bookmarking || bookmarked}
                    className={`p-3 rounded-full border shadow-sm transition flex items-center justify-center ${
                      bookmarked
                        ? 'bg-rose-100 text-rose-500 border-rose-300 scale-110'
                        : 'bg-white text-gray-400 hover:text-rose-500 border-gray-200 hover:border-rose-300 hover:scale-105 hover:bg-rose-50'
                    }`}
                    title={bookmarked ? 'Recipe Bookmarked!' : 'Bookmark Recipe'}
                  >
                    <Heart size={24} className={bookmarked ? 'fill-rose-500' : ''} />
                  </button>
                )}
                <button
                  onClick={() => setSelectedMeal(null)}
                  className="text-gray-500 hover:text-gray-800 bg-white p-2 rounded-full border border-gray-300 shadow-sm transition hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-gray-50/50">
              {/* Macro info */}
              <div className="grid grid-cols-4 gap-2 text-center bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Calories</span>
                  <span className="text-base font-bold text-orange-500">{selectedMeal.calories} kcal</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Carbs</span>
                  <span className="text-base font-bold text-emerald-500">{selectedMeal.carbs}g</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Protein</span>
                  <span className="text-base font-bold text-rose-500">{selectedMeal.protein}g</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fat</span>
                  <span className="text-base font-bold text-amber-500">{selectedMeal.fat}g</span>
                </div>
              </div>

              {/* Recipe Generation Block */}
              {!recipeData && !recipeLoading && (
                <div className="text-center py-8">
                  <Flame size={48} className="mx-auto text-orange-400 mb-4 animate-bounce" />
                  <p className="text-gray-600 font-medium mb-6">
                    Generate the cooking recipe & nutritional trivia for this meal using Gemini AI.
                  </p>
                  <button
                    onClick={handleGenerateRecipe}
                    className="bg-gradient-to-r from-orange-400 to-rose-400 hover:from-orange-500 hover:to-rose-500 text-white font-bold px-8 py-4 rounded-full transition shadow-lg shadow-orange-500/30 transform hover:-translate-y-1"
                  >
                    Generate AI Recipe & Trivia 🪄
                  </button>
                </div>
              )}

              {recipeLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-orange-500 mb-4"></div>
                  <p className="text-gray-600 font-medium">Consulting Gemini AI for recipe and nutritional trivia...</p>
                </div>
              )}

              {recipeError && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm text-center font-medium shadow-inner">
                  {recipeError}
                </div>
              )}

              {recipeData && (
                <div className="space-y-6">
                  {/* Ingredients */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-emerald-500"><Utensils size={20} /></span> Ingredients List
                    </h4>
                    <ul className="list-none text-sm text-gray-600 space-y-2 pl-2">
                      {recipeData.ingredients?.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-emerald-400 mt-0.5">•</span>
                          <span>{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-orange-500"><Flame size={20} /></span> Cooking Steps
                    </h4>
                    <ol className="list-decimal list-outside ml-5 text-sm text-gray-600 space-y-3 font-medium">
                      {recipeData.instructions?.map((step, idx) => (
                        <li key={idx} className="leading-relaxed pl-1">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Trivia */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 p-5 rounded-2xl shadow-sm">
                    <h4 className="text-sm font-bold text-orange-800 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <span className="text-amber-500"><Info size={18} /></span> Local Health Trivia & Facts
                    </h4>
                    <ul className="space-y-3">
                      {recipeData.trivia?.map((fact, idx) => (
                        <li key={idx} className="text-sm text-orange-900/80 leading-relaxed flex items-start gap-2 font-medium">
                          <span className="text-orange-400 mt-0.5">💡</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
