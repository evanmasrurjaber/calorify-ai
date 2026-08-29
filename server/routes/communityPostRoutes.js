// Community Post Routes — Member 4 (Noorani Faiza Khan)

const express = require('express');
const router = express.Router();
const {
  createPost,
  getAllPosts,
  getCommunityNotifications,
  getPostById,
  toggleLikePost,
  addComment,
  deletePost,
} = require('../controllers/communityPostController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

// Public / Protected Feed Queries
router.get('/', getAllPosts);
router.get('/notifications', protect, getCommunityNotifications);
router.get('/:id', getPostById);

// Protected Operations
router.post('/', protect, upload.single('post_image'), createPost);
router.post('/:id/like', protect, toggleLikePost);
router.post('/:id/comments', protect, addComment);
router.delete('/:id', protect, deletePost);

module.exports = router;
