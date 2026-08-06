// TODO: Implement recipe bookmark toggle
// Member responsibility: Noorani Faiza Khan

const User = require('../models/User');

// @route POST /api/bookmarks
const addBookmark = async (req, res) => {
  try {
    const { recipe } = req.body; // Full recipe JSON object
    await User.findByIdAndUpdate(req.user.id, { $push: { bookmarks: recipe } });
    res.status(201).json({ message: 'Recipe bookmarked' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route GET /api/bookmarks
const getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('bookmarks');
    res.json(user.bookmarks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route DELETE /api/bookmarks/:index
const removeBookmark = async (req, res) => {
  try {
    // TODO: Remove bookmark by ID or index from the bookmarks array
    res.status(501).json({ message: 'removeBookmark not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addBookmark, getBookmarks, removeBookmark };
