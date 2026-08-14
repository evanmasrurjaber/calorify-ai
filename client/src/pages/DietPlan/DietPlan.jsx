import React, { useState, useEffect } from 'react';
import { getActiveDietPlan, generateDietPlan, generateRecipe } from '../../services/dietPlanService';
import { addBookmark } from '../../services/bookmarkService';

export default function DietPlan() {
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeData, setRecipeData] = useState(null);
  const [recipeError, setRecipeError] = useState('');

  const fetchPlan = async () => {
    try {
      setLoading(true);
      const { data } = await getActivePlan();
      setActivePlan(data);
    } catch (err) {
      console.error(err);
      setActivePlan(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
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

  const handleMealClick = (meal) => {
    setSelectedMeal(meal);
    setRecipeData(null);
    setRecipeError('');
    setBookmarked(false);
    // Check if recipe is already cached/generated in the meal subdocument
    if (meal.recipe) {
      try {
        setRecipeData(JSON.parse(meal.recipe));
      } catch (e) {
        setRecipeData(null);
      }
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

  const [bookmarking, setBookmarking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  const handleBookmark = async () => {
    if (!recipeData) return;
    setBookmarking(true);
    try {
      // Include calories, macro values and names in the bookmarked object
      const recipeToSave = {
        mealName: selectedMeal.name,
        calories: selectedMeal.calories,
        carbs: selectedMeal.carbs,
        protein: selectedMeal.protein,
        fat: selectedMeal.fat,
        ...recipeData
      };
      await addBookmark(recipeToSave);
      setBookmarked(true);
      alert('Recipe bookmarked successfully! You can view it in the Recipe Library.');
    } catch (err) {
      console.error(err);
      alert('Failed to bookmark recipe.');
    } finally {
      setBookmarking(false);
    }
  };

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
        <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-12 text-center shadow-xl">
          <div className="text-5xl mb-4">📅</div>
          <h3 className="text-2xl font-bold text-white mb-2">No Active Diet Plan</h3>
          <p className="text-gray-400 max-w-md mx-auto mb-6">
            Generate a personalized 7-day Bangladeshi meal schedule powered by Gemini AI, custom to your age, weight, and health targets.
          </p>
          <button
            onClick={handleGeneratePlan}
            disabled={generatingPlan}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-8 py-4 rounded-2xl transition shadow-lg shadow-purple-500/20 active:scale-95"
          >
            {generatingPlan ? 'Generating with Gemini...' : 'Generate My 7-Day Plan 🚀'}
          </button>
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

      {/* Modal for Meal Details / Recipe Generator */}
      {selectedMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex justify-between items-start">
              <div>
                <span className="text-xs uppercase font-extrabold text-purple-400 tracking-wider">
                  {selectedMeal.meal} Recipe Generator
                </span>
                <h3 className="text-2xl font-black text-white mt-1">{selectedMeal.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {recipeData && (
                  <button
                    onClick={handleBookmark}
                    disabled={bookmarking || bookmarked}
                    className={`p-2 rounded-full border transition flex items-center justify-center ${
                      bookmarked
                        ? 'bg-rose-500/20 text-rose-500 border-rose-500/40'
                        : 'bg-gray-950/50 text-gray-400 hover:text-rose-400 border-gray-800 hover:border-rose-500/30'
                    }`}
                    title={bookmarked ? 'Recipe Bookmarked!' : 'Bookmark Recipe'}
                  >
                    ❤️
                  </button>
                )}
                <button
                  onClick={() => setSelectedMeal(null)}
                  className="text-gray-400 hover:text-white bg-gray-950/50 p-2 rounded-full border border-gray-800 transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Macro info */}
              <div className="grid grid-cols-4 gap-2 text-center bg-gray-950 p-4 rounded-2xl border border-gray-800/60">
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Calories</span>
                  <span className="text-base font-bold text-white">{selectedMeal.calories} kcal</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Carbs</span>
                  <span className="text-base font-bold text-purple-400">{selectedMeal.carbs}g</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Protein</span>
                  <span className="text-base font-bold text-purple-400">{selectedMeal.protein}g</span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Fat</span>
                  <span className="text-base font-bold text-purple-400">{selectedMeal.fat}g</span>
                </div>
              </div>

              {/* Recipe Generation Block */}
              {!recipeData && !recipeLoading && (
                <div className="text-center py-6">
                  <p className="text-gray-400 text-sm mb-4">
                    Generate the cooking recipe & nutritional trivia for this meal using Gemini AI.
                  </p>
                  <button
                    onClick={handleGenerateRecipe}
                    className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6 py-3 rounded-2xl transition shadow-lg shadow-purple-500/25 active:scale-95"
                  >
                    Generate AI Recipe & Trivia 🪄
                  </button>
                </div>
              )}

              {recipeLoading && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                  <p className="text-gray-400 text-sm">Consulting Gemini AI for recipe and nutritional trivia...</p>
                </div>
              )}

              {recipeError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm text-center">
                  {recipeError}
                </div>
              )}

              {recipeData && (
                <div className="space-y-6">
                  {/* Ingredients */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="text-purple-400">🥗</span> Ingredients List
                    </h4>
                    <ul className="list-disc list-inside text-sm text-gray-300 space-y-1.5 pl-2">
                      {recipeData.ingredients?.map((ing, idx) => (
                        <li key={idx}>{ing}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <span className="text-purple-400">🍳</span> Cooking Steps
                    </h4>
                    <ol className="list-decimal list-inside text-sm text-gray-300 space-y-2.5 pl-2">
                      {recipeData.instructions?.map((step, idx) => (
                        <li key={idx} className="leading-relaxed">{step}</li>
                      ))}
                    </ol>
                  </div>

                  {/* Trivia (Bangladeshi context) */}
                  <div className="bg-purple-950/20 border border-purple-500/20 p-5 rounded-2xl">
                    <h4 className="text-sm font-bold text-purple-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                      <span className="text-purple-400">🇧🇩</span> Local Health Trivia & Facts
                    </h4>
                    <ul className="space-y-2.5">
                      {recipeData.trivia?.map((fact, idx) => (
                        <li key={idx} className="text-xs text-purple-200/90 leading-relaxed flex items-start gap-2">
                          <span>💡</span>
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

