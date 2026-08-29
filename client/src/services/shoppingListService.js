import api from './api';

// ─── Online Marketplace Integration (Module 3 Feature 2 — Member 2) ─────────
export const MARKETPLACE_PLATFORMS = [
  {
    id: 'Chaldal',
    name: 'Chaldal',
    displayName: 'Chaldal',
    domain: 'chaldal.com',
    homepage: 'https://chaldal.com',
    tagline: 'Online Grocery Delivery in Bangladesh',
    themeColor: 'amber',
    buildSearchUrl: (ingredientName) =>
      `https://chaldal.com/search/${encodeURIComponent((ingredientName || '').trim())}`,
  },
  {
    id: 'Shopno',
    name: 'Shopno',
    displayName: 'Shopno (Shwapno)',
    domain: 'shwapno.com',
    homepage: 'https://www.shwapno.com',
    tagline: 'Leading Retail Chain Superstore in Bangladesh',
    themeColor: 'rose',
    buildSearchUrl: (ingredientName) =>
      `https://www.shwapno.com/search?q=${encodeURIComponent((ingredientName || '').trim())}`,
  },
];

/**
 * Constructs a platform-specific search URL using string interpolation.
 * @param {string} platform - 'Chaldal' or 'Shopno'
 * @param {string} ingredientName - The raw ingredient name to search for
 * @returns {string} The full search URL for the given marketplace
 */
export const buildMarketplaceUrl = (platform, ingredientName) => {
  if (!ingredientName) return '#';
  const query = encodeURIComponent(ingredientName.trim());
  const normalized = (platform || '').toLowerCase();
  
  if (normalized.includes('shopno') || normalized.includes('shwapno')) {
    return `https://www.shwapno.com/search?q=${query}`;
  }
  
  // Default to Chaldal
  return `https://chaldal.com/search/${query}`;
};

const STORAGE_KEY = 'calorify_preferred_marketplace';

export const getStoredMarketplace = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && (saved === 'Chaldal' || saved === 'Shopno')) {
      return saved;
    }
  } catch (e) {
    console.warn('Unable to access localStorage for marketplace preference:', e);
  }
  return 'Chaldal';
};

export const setStoredMarketplace = (platform) => {
  try {
    localStorage.setItem(STORAGE_KEY, platform);
  } catch (e) {
    console.warn('Unable to save marketplace preference to localStorage:', e);
  }
};

// Fetch (or generate+cache) the shopping list for the active diet plan
export const getShoppingList = () => api.get('/shopping-list');

// Force-clear the cache so next getShoppingList re-prompts Gemini
export const clearShoppingListCache = () => api.delete('/shopping-list/cache');

// Toggle a single item's checked state in the DB
// key format: "CategoryName|itemName"
export const toggleCheckedItem = (key) => api.patch('/shopping-list/check', { key });

// Uncheck all items
export const clearAllChecked = () => api.delete('/shopping-list/check');

