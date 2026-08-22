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
    const { index } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0 || idx >= user.bookmarks.length) {
      return res.status(400).json({ message: 'Invalid bookmark index' });
    }

    user.bookmarks.splice(idx, 1);
    user.markModified('bookmarks');
    await user.save();

    res.json({ message: 'Recipe removed from bookmarks', bookmarks: user.bookmarks });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { addBookmark, getBookmarks, removeBookmark };
