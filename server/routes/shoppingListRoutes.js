const express = require('express');
const router = express.Router();
const { getShoppingList } = require('../controllers/shoppingListController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getShoppingList);

module.exports = router;
