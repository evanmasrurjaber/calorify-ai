import api from './api';

// ─── Online Marketplace Integration (Module 3 Feature 2 — Member 2) ─────────
export const MARKETPLACE_PLATFORMS = [
  {
    id: 'Chaldal',
    name: 'Chaldal',
    displayName: 'Chaldal',
    category: 'Express Grocery',
    deliveryTime: '1-2 Hours',
    domain: 'chaldal.com',
    homepage: 'https://chaldal.com',
    tagline: 'Instant grocery delivery across major BD cities',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
    buildSearchUrl: (ingredientName) =>
      `https://chaldal.com/search/${encodeURIComponent((ingredientName || '').trim())}`,
  },
  {
    id: 'Shopno',
    name: 'Shopno',
    displayName: 'Shopno (Shwapno)',
    category: 'Superstore Chain',
    deliveryTime: 'Same Day',
    domain: 'shwapno.com',
    homepage: 'https://www.shwapno.com',
    tagline: 'Largest superstore retail chain in Bangladesh',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    buildSearchUrl: (ingredientName) =>
      `https://www.shwapno.com/search?q=${encodeURIComponent((ingredientName || '').trim())}`,
  },
  {
    id: 'DarazMart',
    name: 'Daraz Mart',
    displayName: 'Daraz Mart',
    category: 'Mega Marketplace',
    deliveryTime: 'Next Day',
    domain: 'daraz.com.bd',
    homepage: 'https://www.daraz.com.bd/groceries/',
    tagline: 'Leading online marketplace with full grocery mart',
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-200',
    buildSearchUrl: (ingredientName) =>
      `https://www.daraz.com.bd/catalog/?q=${encodeURIComponent((ingredientName || '').trim())}`,
  },
  {
    id: 'MeenaClick',
    name: 'Meena Click',
    displayName: 'Meena Click (Bazaar)',
    category: 'Superstore Chain',
    deliveryTime: 'Same Day',
    domain: 'meenaclick.com',
    homepage: 'https://meenaclick.com',
    tagline: 'Fresh grocery & high quality food products',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    buildSearchUrl: (ingredientName) =>
      `https://meenaclick.com/search?q=${encodeURIComponent((ingredientName || '').trim())}`,
  },
  {
    id: 'Agora',
    name: 'Agora BD',
    displayName: 'Agora Superstore',
    category: 'Superstore Chain',
    deliveryTime: 'Same Day',
    domain: 'agorabd.com',
    homepage: 'https://agorabd.com',
    tagline: 'Pioneer retail superstore chain in Bangladesh',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    buildSearchUrl: (ingredientName) =>
      `https://agorabd.com/search?q=${encodeURIComponent((ingredientName || '').trim())}`,
  },
  {
    id: 'Pandamart',
    name: 'Pandamart',
    displayName: 'Pandamart (Foodpanda)',
    category: 'Instant Dark Store',
    deliveryTime: '20-30 Mins',
    domain: 'foodpanda.com.bd',
    homepage: 'https://www.foodpanda.com.bd/darkstore',
    tagline: 'On-demand grocery delivery in 30 minutes',
    badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
    buildSearchUrl: (ingredientName) =>
      `https://www.foodpanda.com.bd/darkstore?q=${encodeURIComponent((ingredientName || '').trim())}`,
  },
  {
    id: 'KhaasFood',
    name: 'Khaas Food',
    displayName: 'Khaas Food (Organic)',
    category: 'Organic & Pure',
    deliveryTime: '1-2 Days',
    domain: 'khaasfood.com',
    homepage: 'https://khaasfood.com',
    tagline: 'Pure, chemical-free and organic food specialist',
    badgeColor: 'bg-green-100 text-green-800 border-green-200',
    buildSearchUrl: (ingredientName) =>
      `https://khaasfood.com/?s=${encodeURIComponent((ingredientName || '').trim())}&post_type=product`,
  },
  {
    id: 'Unimart',
    name: 'Unimart',
    displayName: 'Unimart Hypermarket',
    category: 'Hypermarket',
    deliveryTime: 'Same Day',
    domain: 'unimart.online',
    homepage: 'https://unimart.online',
    tagline: 'Premium lifestyle hypermarket & gourmet grocery',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    buildSearchUrl: (ingredientName) =>
      `https://unimart.online/search?q=${encodeURIComponent((ingredientName || '').trim())}`,
  },
];

/**
 * Constructs a platform-specific search URL using string interpolation.
 * @param {string} platform - Store name or ID
 * @param {string} ingredientName - The raw ingredient name to search for
 * @returns {string} The full search URL for the given marketplace
 */
export const buildMarketplaceUrl = (platform, ingredientName) => {
  if (!ingredientName) return '#';
  const query = encodeURIComponent(ingredientName.trim());
  const normalized = (platform || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  if (normalized.includes('shopno') || normalized.includes('shwapno')) {
    return `https://www.shwapno.com/search?q=${query}`;
  }
  if (normalized.includes('daraz')) {
    return `https://www.daraz.com.bd/catalog/?q=${query}`;
  }
  if (normalized.includes('meena')) {
    return `https://meenaclick.com/search?q=${query}`;
  }
  if (normalized.includes('agora')) {
    return `https://agorabd.com/search?q=${query}`;
  }
  if (normalized.includes('panda')) {
    return `https://www.foodpanda.com.bd/darkstore?q=${query}`;
  }
  if (normalized.includes('khaas')) {
    return `https://khaasfood.com/?s=${query}&post_type=product`;
  }
  if (normalized.includes('unimart')) {
    return `https://unimart.online/search?q=${query}`;
  }

  // Default to Chaldal
  return `https://chaldal.com/search/${query}`;
};

const STORAGE_KEY = 'calorify_preferred_marketplace';

export const getStoredMarketplace = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && MARKETPLACE_PLATFORMS.some((p) => p.name === saved || p.id === saved)) {
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

