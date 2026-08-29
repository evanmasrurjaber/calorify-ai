import api from './api';

// Fetch (or generate+cache) the shopping list for the active diet plan
export const getShoppingList = () => api.get('/shopping-list');

// Force-clear the cache so next getShoppingList re-prompts Gemini
export const clearShoppingListCache = () => api.delete('/shopping-list/cache');

// Toggle a single item's checked state in the DB
// key format: "CategoryName|itemName"
export const toggleCheckedItem = (key) => api.patch('/shopping-list/check', { key });

// Uncheck all items
export const clearAllChecked = () => api.delete('/shopping-list/check');
