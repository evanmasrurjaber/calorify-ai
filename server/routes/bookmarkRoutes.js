const express = require('express');
const router = express.Router();
const { addBookmark, getBookmarks, removeBookmark } = require('../controllers/bookmarkController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, addBookmark);
router.get('/', protect, getBookmarks);
router.delete('/:index', protect, removeBookmark);

module.exports = router;
