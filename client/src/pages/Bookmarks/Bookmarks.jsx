import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getBookmarks, removeBookmark, addBookmark } from '../../services/bookmarkService';
import { generateRecipeDirectly } from '../../services/dietPlanService';
import { Info, Heart, Flame, Utensils, Crown } from 'lucide-react';

const getDishImage = (name, recipe) => {
  if (recipe?.image_url) return recipe.image_url;
  // Final fallback if old recipe has no image
  return 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600';
};

export default function Bookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [servings, setServings] = useState(2);
  const [checkedIngredients, setCheckedIngredients] = useState({});
  const [loading, setLoading] = useState(true);

  // Direct test generator states
  const [directName, setDirectName] = useState('');
  const [directLoading, setDirectLoading] = useState(false);

  // Fetch bookmarks on load
  const [recipeImage, setRecipeImage] = useState('');
  const [bookmarkError, setBookmarkError] = useState('');

  useEffect(() => {
    if (!selectedRecipe) {
      setRecipeImage('');
      return;
    }
    
    const dishName = selectedRecipe.mealName || selectedRecipe.name;
    if (!dishName) return;

    setRecipeImage(getDishImage(dishName, selectedRecipe));
  }, [selectedRecipe]);

  // Fetch bookmarks on load
  const fetchBookmarks = async () => {
    try {
      setLoading(true);
      const { data } = await getBookmarks();
      setBookmarks(data || []);
      // If there are bookmarks, select the first one by default
      if (data && data.length > 0) {
        setSelectedRecipe(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch bookmarks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  // Handle direct recipe generation for testing
  const handleDirectGenerate = async (e) => {
    e.preventDefault();
    if (!directName.trim()) return;
    setDirectLoading(true);
    try {
      const { data } = await generateRecipeDirectly(directName.trim(), 'Lunch', 500);
      setSelectedRecipe(data);
      setDirectName('');
    } catch (err) {
      console.error(err);
      alert('Failed to generate recipe from Gemini API.');
    } finally {
      setDirectLoading(false);
    }
  };

  // Add selected recipe to bookmarks
  const handleAddBookmark = async () => {
    if (!selectedRecipe) return;
    setBookmarkError('');
    try {
      const recipeToSave = {
        ...selectedRecipe,
        image_url: recipeImage || selectedRecipe.image_url || getDishImage(selectedRecipe.mealName || selectedRecipe.name, selectedRecipe)
      };
      await addBookmark(recipeToSave);
      
      // Refresh bookmarks list
      const { data } = await getBookmarks();
      setBookmarks(data || []);
    } catch (err) {
      console.error(err);
      setBookmarkError(err.response?.data?.message || err.message);
    }
  };

  // Handle bookmark toggle (remove from bookmarks)
  const handleRemoveBookmark = async (e, index) => {
    e.stopPropagation();
    try {
      await removeBookmark(index);
      const updated = [...bookmarks];
      const removed = updated.splice(index, 1)[0];
      setBookmarks(updated);

      // If the removed recipe was selected, select another one or null
      if (selectedRecipe && (selectedRecipe.mealName === removed.mealName || selectedRecipe.name === removed.mealName)) {
        setSelectedRecipe(updated[0] || null);
      }
    } catch (err) {
      console.error('Failed to remove bookmark', err);
    }
  };

  // Helper to parse & scale numbers in ingredients
  const scaleIngredient = (ingredientStr, factor) => {
    const numRegex = /^(\d+(?:\.\d+)?)\s*(.*)$/;
    const match = ingredientStr.match(numRegex);
    if (!match) return ingredientStr;

    const num = parseFloat(match[1]);
    const scaledNum = (num * factor).toFixed(1).replace(/\.0$/, ''); // avoid .0
    return `${scaledNum} ${match[2]}`;
  };

  // Calculate scaling factor (base servings is 2)
  const scaleFactor = servings / 2;

  // Toggle ingredient checklist
  const toggleIngredient = (idx) => {
    setCheckedIngredients((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Reset servings and checklist when recipe changes
  useEffect(() => {
    setServings(2);
    setCheckedIngredients({});
    setBookmarkError('');
  }, [selectedRecipe]);

  // Check if selected recipe is already in bookmarks list
  const isCurrentlyBookmarked = selectedRecipe && bookmarks.some(
    b => b.mealName === selectedRecipe.mealName || b.name === selectedRecipe.mealName
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-gray-800">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Bangladeshi Recipe Library
            </h1>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {user?.isPro ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Healthy traditional culinary instructions adjusted to your target calorie limits.
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Info & Bookmarks List */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* No Generated Recipe Yet / Testing Box */}
          <div className="bg-[#fcfdfc] border border-green-200 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-center mb-4">
              <span className="text-3xl text-green-500">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
              Generate Direct Recipe
            </h3>
            <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
              Use this tool to generate any traditional recipe immediately, complete with tailored macros.
            </p>
            {/* Quick AI Recipe Generator Box (Testing) */}
            <div>
              <form onSubmit={handleDirectGenerate} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Shorshe Ilish..."
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-500 text-sm bg-white shadow-sm"
                  required
                />
                <button
                  type="submit"
                  disabled={directLoading}
                  className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition shadow-sm"
                >
                  {directLoading ? '...' : 'Go'}
                </button>
              </form>
            </div>
          </div>

          {/* Bookmarked Recipes Section */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-red-500 text-xl">❤</span> Bookmarked Recipes
              {!user?.isPro && (
                <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  {Math.max(0, 5 - bookmarks.length)}/5 Bookmarks Left
                </span>
              )}
            </h3>
            
            {bookmarks.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 rounded-3xl bg-gray-50/50">
                <span className="text-3xl">🍲</span>
                <p className="text-sm text-gray-400 mt-2">No bookmarked recipes yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[1500px] overflow-y-auto pr-2 pb-4">
                {bookmarks.map((recipe, index) => {
                  const isSelected = selectedRecipe && (selectedRecipe.mealName === recipe.mealName || selectedRecipe.name === recipe.mealName);
                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedRecipe(recipe)}
                      className={`group border rounded-3xl p-4 flex flex-col cursor-pointer transition-all duration-300 relative w-full ${
                        isSelected
                          ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 shadow-md transform scale-[1.02]'
                          : 'border-gray-200 bg-white hover:border-orange-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex justify-between items-center mb-4">
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${isSelected ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                          {recipe.mealType || 'Lunch'}
                        </span>
                        <button
                          onClick={(e) => handleRemoveBookmark(e, index)}
                          className="text-rose-400 hover:text-rose-600 transition hover:scale-110"
                          title="Remove Bookmark"
                        >
                          <Heart size={18} className="fill-rose-500" />
                        </button>
                      </div>
                      
                      {/* Dish Thumbnail */}
                      <div className="w-full h-28 rounded-xl overflow-hidden mb-4 shadow-sm border border-gray-100 relative">
                         <img
                          src={recipe.image_url || getDishImage(recipe.mealName || recipe.name, recipe)}
                          alt={recipe.mealName || recipe.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      </div>
                      
                      {/* Dish Details */}
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                           <span className="text-[10px] text-gray-500 font-bold flex items-center gap-1"><Utensils size={10} /> {recipe.servings || 2} Servings</span>
                           <span className="text-[10px] font-extrabold text-orange-500 flex items-center gap-1">
                             <Flame size={12} /> {recipe.calories_per_serving ? Math.round(Number(recipe.calories_per_serving) * (recipe.servings || 2)) : (recipe.calories || 500)} kcal
                           </span>
                        </div>
                        <h4 className={`text-sm font-bold line-clamp-1 transition ${isSelected ? 'text-orange-700' : 'text-gray-900 group-hover:text-orange-600'}`}>
                          {recipe.mealName || recipe.name}
                        </h4>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Recipe Detail Pane */}
        <div className="lg:col-span-7 bg-[#fbfdfb] border border-gray-200 rounded-[2rem] p-6 lg:p-10 shadow-sm min-h-[500px] relative overflow-hidden">
          
          {selectedRecipe ? (() => {
            const origServings = Number(selectedRecipe.servings) || 2;
            const displayCalories = selectedRecipe.calories_per_serving !== undefined && selectedRecipe.calories_per_serving !== null
              ? Math.round(Number(selectedRecipe.calories_per_serving) * servings)
              : (selectedRecipe.calories ? Math.round(Number(selectedRecipe.calories) * (servings / origServings)) : '--');
            const displayCarbs = selectedRecipe.carbs_per_serving !== undefined && selectedRecipe.carbs_per_serving !== null
              ? Math.round(Number(selectedRecipe.carbs_per_serving) * servings)
              : (selectedRecipe.carbs ? Math.round(Number(selectedRecipe.carbs) * (servings / origServings)) : '--');
            const displayProtein = selectedRecipe.protein_per_serving !== undefined && selectedRecipe.protein_per_serving !== null
              ? Math.round(Number(selectedRecipe.protein_per_serving) * servings)
              : (selectedRecipe.protein ? Math.round(Number(selectedRecipe.protein) * (servings / origServings)) : '--');
            const displayFat = selectedRecipe.fat_per_serving !== undefined && selectedRecipe.fat_per_serving !== null
              ? Math.round(Number(selectedRecipe.fat_per_serving) * servings)
              : (selectedRecipe.fat ? Math.round(Number(selectedRecipe.fat) * (servings / origServings)) : '--');

            return (
              <div className="space-y-8 relative z-10">
                
                {/* Save Bookmark Action */}
                {!isCurrentlyBookmarked && (
                  <div className="absolute -top-4 -right-4 md:-top-2 md:-right-2 z-20">
                    <button
                      onClick={handleAddBookmark}
                      className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs px-4 py-2 rounded-full border border-emerald-200 shadow-sm transition"
                    >
                      <span className="text-red-500">❤</span> Bookmark Recipe
                    </button>
                  </div>
                )}

                {/* Centered Image with Glow */}
                <div className="flex justify-center pt-4">
                  <div className="relative w-36 h-36">
                    <div className="absolute inset-0 bg-green-400 opacity-20 blur-2xl rounded-full"></div>
                    <img
                      src={recipeImage || selectedRecipe.image_url || getDishImage(selectedRecipe.mealName || selectedRecipe.name, selectedRecipe)}
                      alt={selectedRecipe.mealName || selectedRecipe.name}
                      className="relative z-10 w-full h-full object-cover rounded-[1.5rem] shadow-xl border-4 border-white"
                    />
                  </div>
                </div>

                {/* Recipe Title & Description */}
                <div className="text-center max-w-md mx-auto">
                  <h2 className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                    {selectedRecipe.mealName || selectedRecipe.name}
                  </h2>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">
                    Rich, fragrant national dish cooked in traditional spices. Naturally high in good nutrients and carefully portioned.
                  </p>
                </div>

                {/* Nutritional Macros Breakdown (Clean Light Green Box) */}
                <div className="bg-[#f0f8f2] rounded-[1.5rem] p-6 flex justify-between items-center text-center border border-green-100/50">
                  <div className="flex-1">
                    <span className="block text-xl font-black text-gray-900">{displayCalories}</span>
                    <span className="block text-[10px] font-extrabold text-gray-400 mt-1 uppercase tracking-wider">Kcal</span>
                  </div>
                  <div className="w-[1px] h-10 bg-gray-300/60"></div>
                  <div className="flex-1">
                    <span className="block text-xl font-black text-gray-900">{displayCarbs}g</span>
                    <span className="block text-[10px] font-extrabold text-gray-400 mt-1 uppercase tracking-wider">Carbs</span>
                  </div>
                  <div className="w-[1px] h-10 bg-gray-300/60"></div>
                  <div className="flex-1">
                    <span className="block text-xl font-black text-gray-900">{displayProtein}g</span>
                    <span className="block text-[10px] font-extrabold text-gray-400 mt-1 uppercase tracking-wider">Prot</span>
                  </div>
                  <div className="w-[1px] h-10 bg-gray-300/60"></div>
                  <div className="flex-1">
                    <span className="block text-xl font-black text-gray-900">{displayFat}g</span>
                    <span className="block text-[10px] font-extrabold text-gray-400 mt-1 uppercase tracking-wider">Fat</span>
                  </div>
                </div>

                {/* Servings Adjuster */}
                <div className="flex items-center justify-between border border-gray-200 rounded-3xl p-3 bg-white shadow-sm">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-widest ml-4">Servings</span>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-1 border border-gray-100">
                    <button
                      onClick={() => setServings(Math.max(1, servings - 1))}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center shadow-sm border border-gray-100"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-gray-900 w-6 text-center">{servings}</span>
                    <button
                      onClick={() => setServings(servings + 1)}
                      className="w-8 h-8 rounded-xl bg-white hover:bg-gray-100 text-gray-600 font-bold transition flex items-center justify-center shadow-sm border border-gray-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Ingredients List */}
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-4 ml-1 tracking-wide">INGREDIENTS</h3>
                  <div className="space-y-4 ml-1">
                    {selectedRecipe.ingredients?.map((ing, idx) => {
                      const scaledIng = scaleIngredient(ing, scaleFactor);
                      const isChecked = checkedIngredients[idx] || false;
                      
                      // Highlight numbers/units with green color similar to screenshot
                      const formattedIng = scaledIng.replace(/^([\d.]+\s*[a-zA-Z]*)\s+(.*)$/, (match, amount, item) => {
                        return `<span class="text-emerald-600 font-bold">${amount}</span> <span class="font-bold text-gray-700">${item}</span>`;
                      });

                      return (
                        <label
                          key={idx}
                          className="flex items-start gap-4 cursor-pointer group"
                        >
                          <input 
                            type="checkbox" 
                            className="hidden" 
                            checked={isChecked}
                            onChange={() => toggleIngredient(idx)}
                          />
                          <div className="mt-0.5">
                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white group-hover:border-emerald-400'}`}>
                              {isChecked && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span 
                            className={`text-sm leading-relaxed transition ${isChecked ? 'line-through text-gray-400 opacity-60' : 'text-gray-800'}`}
                            dangerouslySetInnerHTML={{ __html: formattedIng !== scaledIng && !isChecked ? formattedIng : scaledIng }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Cooking Steps */}
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900 mb-4 ml-1 tracking-wide">INSTRUCTIONS</h3>
                  <div className="space-y-5 ml-1">
                    {selectedRecipe.instructions?.map((step, idx) => (
                      <div key={idx} className="flex gap-4 items-start">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-600 shadow-sm relative top-0.5">
                          {idx + 1}
                        </span>
                        <p className="text-sm text-gray-700 leading-relaxed pt-1 font-medium">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Local Health Trivia & Facts */}
                {selectedRecipe.trivia && selectedRecipe.trivia.length > 0 && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-orange-100 p-6 rounded-3xl shadow-sm mt-8">
                    <h3 className="text-sm font-extrabold text-orange-800 mb-4 uppercase tracking-wider flex items-center gap-2">
                      <span className="text-amber-500"><Info size={20} /></span> Local Health Trivia & Facts
                    </h3>
                    <ul className="space-y-3">
                      {selectedRecipe.trivia.map((fact, idx) => (
                        <li key={idx} className="text-sm text-orange-900/80 leading-relaxed flex items-start gap-2 font-medium">
                          <span className="text-orange-400 mt-0.5">💡</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              </div>
            );
          })() : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
              <span className="text-6xl mb-4 opacity-50">🍛</span>
              <h3 className="text-xl font-extrabold text-gray-700 mb-2 tracking-tight">Select a Recipe</h3>
              <p className="text-sm text-gray-400 max-w-sm font-medium leading-relaxed">
                Use the AI Recipe Tester on the left to generate a custom traditional recipe, or click an existing bookmark.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Premium Upgrade Modal / Error Toast */}
      {bookmarkError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-gray-100">
            <button 
              onClick={() => setBookmarkError('')}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition"
            >
              ✕
            </button>
            <h3 className="text-xl font-extrabold text-gray-900 mb-2 tracking-tight">
              {bookmarkError.includes('Pro') ? 'Premium Upgrade Required' : 'Action Failed'}
            </h3>
            <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
              {bookmarkError.includes('Pro') 
                ? 'You have reached the maximum limit of 5 bookmarks for free accounts. Upgrade to Pro to unlock unlimited recipe bookmarks and AI superpowers.'
                : bookmarkError}
            </p>
            {bookmarkError.includes('Pro') ? (
              <Link
                to="/subscription"
                className="w-full bg-gradient-to-r from-[#10B981] to-[#006c49] hover:from-[#059669] hover:to-[#004d34] text-white text-sm font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm shadow-[#10B981]/25 group hover:scale-[1.02]"
              >
                <Crown size={18} className="text-yellow-300 group-hover:rotate-12 transition-transform" />
                <span>Upgrade to Pro</span>
              </Link>
            ) : (
              <button
                onClick={() => setBookmarkError('')}
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3.5 rounded-xl transition-all"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
