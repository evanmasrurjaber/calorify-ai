// Community Post Controller — Member 4 (Noorani Faiza Khan)
// Handles publishing, browsing, liking, and commenting on community diet posts

const CommunityPost = require('../models/CommunityPost');
const User = require('../models/User');

// @route   POST /api/community-posts
// @desc    Create a new community diet post (with optional image)
// @access  Private (Registered users)
const createPost = async (req, res) => {
  try {
    const { title, content, category, tags } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    let imageUrl = '';

    // If file was uploaded via Multer memory storage
    if (req.file) {
      const mimeType = req.file.mimetype || 'image/jpeg';
      const base64Data = req.file.buffer.toString('base64');
      imageUrl = `data:${mimeType};base64,${base64Data}`;
    } else if (req.body.imageUrl && typeof req.body.imageUrl === 'string') {
      imageUrl = req.body.imageUrl.trim();
    }

    // Process tags
    let parsedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        parsedTags = tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean);
      } else if (typeof tags === 'string') {
        parsedTags = tags
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
      }
    }

    const post = await CommunityPost.create({
      author: req.user.id,
      title: title.trim(),
      content: content.trim(),
      category: category || 'Diet Tip',
      imageUrl,
      tags: parsedTags,
      likes: [],
      comments: [],
    });

    const populatedPost = await CommunityPost.findById(post._id).populate(
      'author',
      'name email role unlockedBadges points'
    );

    res.status(201).json({
      success: true,
      message: 'Diet post published successfully!',
      post: populatedPost,
    });
  } catch (error) {
    console.error('[createCommunityPost Error]:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/community-posts
// @desc    Get all community diet posts with search, category filtering & sorting
// @access  Public / Authenticated
const getAllPosts = async (req, res) => {
  try {
    const { category, search, sort = 'latest' } = req.query;

    const query = {};

    // Filter by Category
    if (category && category !== 'All') {
      query.category = category;
    }

    // Search by title or content keyword
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: searchRegex }, { content: searchRegex }, { tags: searchRegex }];
    }

    // Sorting
    let sortOptions = { createdAt: -1 }; // Default: Latest first
    if (sort === 'top' || sort === 'likes') {
      sortOptions = { 'likes.length': -1, createdAt: -1 };
    }

    const posts = await CommunityPost.find(query)
      .populate('author', 'name email role unlockedBadges points')
      .populate('comments.user', 'name role')
      .sort(sortOptions);

    res.json({
      success: true,
      count: posts.length,
      posts,
    });
  } catch (error) {
    console.error('[getAllCommunityPosts Error]:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route   GET /api/community-posts/:id
// @desc    Get a single community post by ID
// @access  Public / Authenticated
const getPostById = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
      .populate('author', 'name email role unlockedBadges points')
      .populate('comments.user', 'name role');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json({ success: true, post });
  } catch (error) {
    console.error('[getCommunityPostById Error]:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/community-posts/:id/like
// @desc    Toggle like / unlike on a community diet post
// @access  Private
const toggleLikePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const userIdStr = req.user.id.toString();
    const alreadyLiked = post.likes.some((id) => id.toString() === userIdStr);

    if (alreadyLiked) {
      // Remove like
      post.likes = post.likes.filter((id) => id.toString() !== userIdStr);
    } else {
      // Add like
      post.likes.push(req.user.id);
    }

    await post.save();

    res.json({
      success: true,
      liked: !alreadyLiked,
      likesCount: post.likes.length,
      likes: post.likes,
    });
  } catch (error) {
    console.error('[toggleLikePost Error]:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route   POST /api/community-posts/:id/comments
// @desc    Add a comment/suggestion to a community diet post
// @access  Private
const addComment = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const post = await CommunityPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(req.user.id).select('name');
    const authorName = user?.name || req.user.name || 'Community Member';

    const newComment = {
      user: req.user.id,
      authorName,
      text: text.trim(),
      createdAt: new Date(),
    };

    post.comments.push(newComment);
    await post.save();

    const updatedPost = await CommunityPost.findById(req.params.id)
      .populate('author', 'name email role unlockedBadges points')
      .populate('comments.user', 'name role');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully!',
      comments: updatedPost.comments,
      post: updatedPost,
    });
  } catch (error) {
    console.error('[addComment Error]:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @route   DELETE /api/community-posts/:id
// @desc    Delete a post (Author or Admin only)
// @access  Private
const deletePost = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Authorization check: Must be post author or admin
    if (post.author.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('[deletePost Error]:', error.message);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createPost,
  getAllPosts,
  getPostById,
  toggleLikePost,
  addComment,
  deletePost,
};
