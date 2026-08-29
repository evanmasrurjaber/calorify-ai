const express = require('express');
const router = express.Router();
const {
  getShoppingList,
  clearShoppingListCache,
  toggleCheckedItem,
  clearAllChecked,
} = require('../controllers/shoppingListController');
const { protect } = require('../middleware/authMiddleware');

// GET  /api/shopping-list         — fetch (or generate+cache) the shopping list
router.get('/', protect, getShoppingList);

// DELETE /api/shopping-list/cache — force-clear cache so next GET re-prompts Gemini
router.delete('/cache', protect, clearShoppingListCache);

// PATCH  /api/shopping-list/check — toggle a single item's checked state in DB
router.patch('/check', protect, toggleCheckedItem);

// DELETE /api/shopping-list/check — uncheck all items
router.delete('/check', protect, clearAllChecked);

module.exports = router;
