// Community Post Controller — Member 4 (Noorani Faiza Khan)
// Handles publishing, browsing, liking, commenting, notifications, first-post email, and challenge badge unlocks

const CommunityPost = require('../models/CommunityPost');
const User = require('../models/User');
const Challenge = require('../models/Challenge');
const { sendEmail } = require('../services/gmailService');
const { sendBadgeUnlockEmail, getStartAndEndOfToday } = require('./challengeController');

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

    // ─── 1. First Blog Post Automated Email Notification ─────────────────────────
    const userPostCount = await CommunityPost.countDocuments({ author: req.user.id });
    if (userPostCount === 1) {
      const user = await User.findById(req.user.id);
      if (user && user.email && user.notifications?.communityAlerts !== false) {
        const subject = '🎉 Congratulations on publishing your first Community Diet Post!';
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">🌱 First Diet Post Published!</h2>
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.6;">Congratulations! You have successfully published your first diet post on <strong>Calorify</strong>.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 16px; margin: 25px 0; border-left: 4px solid #10b981;">
              <h4 style="margin: 0 0 6px 0; color: #0f172a; font-size: 16px;">${post.title}</h4>
              <p style="margin: 0; color: #64748b; font-size: 13px;">Topic: ${post.category}</p>
            </div>
            <p style="font-size: 14px; color: #334155; line-height: 1.6;">Posting daily meal tips and dietary reflections helps our community discover healthier Bangladeshi meal choices and builds long-term wellness habits. Post daily to help the community!</p>
            <p style="font-size: 14px; color: #10b981; font-weight: bold; margin-top: 15px;">Keep sharing and inspiring others on Calorify!</p>
            <p style="font-size: 16px; color: #334155; line-height: 1.6; margin-top: 30px;">Best regards,<br/><strong>The Calorify Team</strong></p>
          </div>
        `;
        sendEmail(user.email, subject, html).catch((err) =>
          console.error('[FirstPostEmail Failed]:', err.message)
        );
      }
    }

    // ─── 2. Auto-Complete Daily Challenge & Unlock Badge ─────────────────────────
    try {
      const { start, end } = getStartAndEndOfToday();
      const challenge = await Challenge.findOne({
        user: req.user.id,
        badgeKey: 'community_diet_pioneer',
        date: { $gte: start, $lte: end },
      });

      if (challenge && !challenge.completed) {
        challenge.current = 1;
        challenge.completed = true;
        challenge.completedAt = new Date();
        await challenge.save();

        const userDoc = await User.findById(req.user.id);
        if (userDoc) {
          userDoc.points = (userDoc.points || 0) + challenge.pointsReward;
          if (!userDoc.unlockedBadges) userDoc.unlockedBadges = [];
          if (!userDoc.unlockedBadges.includes('community_diet_pioneer')) {
            userDoc.unlockedBadges.push('community_diet_pioneer');
            userDoc.badge = 'community_diet_pioneer';
            await userDoc.save();
            sendBadgeUnlockEmail(userDoc.email, userDoc.name, 'Community Diet Pioneer', userDoc._id).catch((e) =>
              console.error(e.message)
            );
          } else {
            await userDoc.save();
          }
        }
      }
    } catch (challengeErr) {
      console.error('[Community Challenge AutoComplete]:', challengeErr.message);
    }

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

// @route   GET /api/community-posts/notifications
// @desc    Get likes & comments notifications on the authenticated user's posts
// @access  Private
const getCommunityNotifications = async (req, res) => {
  try {
    const userPosts = await CommunityPost.find({ author: req.user.id })
      .populate('likes', 'name email role')
      .populate('comments.user', 'name role')
      .lean();

    const notifications = [];

    for (const post of userPosts) {
      // 1. Likes activity
      if (post.likes && Array.isArray(post.likes)) {
        for (const liker of post.likes) {
          const likerId = (liker._id || liker).toString();
          if (likerId !== req.user.id.toString()) {
            // Find specific timestamp when this like was created; never use post.updatedAt
            const meta = (post.likesTimestamps || []).find(
              (lt) => (lt.user?._id || lt.user || '').toString() === likerId
            );
            const likeDate = meta?.createdAt || post.createdAt;

            notifications.push({
              id: `like_${post._id}_${likerId}`,
              type: 'like',
              user: liker,
              post: { _id: post._id, title: post.title, category: post.category },
              message: `${liker.name || 'A community member'} liked your post`,
              createdAt: likeDate,
            });
          }
        }
      }

      // 2. Comments activity
      if (post.comments && Array.isArray(post.comments)) {
        for (const comment of post.comments) {
          const commenterId = (comment.user?._id || comment.user || '').toString();
          if (commenterId !== req.user.id.toString()) {
            notifications.push({
              id: `comment_${post._id}_${comment._id || Math.random()}`,
              type: 'comment',
              user: comment.user || { name: comment.authorName },
              authorName: comment.authorName,
              commentText: comment.text,
              post: { _id: post._id, title: post.title, category: post.category },
              message: `${comment.authorName || 'A community member'} commented: "${comment.text.slice(0, 45)}${comment.text.length > 45 ? '…' : ''}"`,
              createdAt: comment.createdAt,
            });
          }
        }
      }
    }

    // Helper to safely parse timestamp
    const getTime = (dateVal) => {
      if (!dateVal) return 0;
      const t = new Date(dateVal).getTime();
      return isNaN(t) ? 0 : t;
    };

    // Sort strictly newest notification first, then oldest
    notifications.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('[getCommunityNotifications Error]:', error.message);
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
      post.likesTimestamps = (post.likesTimestamps || []).filter(
        (item) => (item.user?._id || item.user || '').toString() !== userIdStr
      );
    } else {
      // Add like
      post.likes.push(req.user.id);
      if (!post.likesTimestamps) post.likesTimestamps = [];
      post.likesTimestamps.push({ user: req.user.id, createdAt: new Date() });
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
  getCommunityNotifications,
  getPostById,
  toggleLikePost,
  addComment,
  deletePost,
};
