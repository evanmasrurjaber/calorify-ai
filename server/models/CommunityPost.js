// Community Post Model — Member 4 (Noorani Faiza Khan)
// Stores user-published diet blogs, nutrition tips, and meal suggestions

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    authorName: {
      type: String,
      required: true,
      default: 'Community Member',
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const communityPostSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Diet Tip', 'Meal Suggestion', 'Recipe Idea', 'Success Story', 'Nutrition Q&A'],
      default: 'Diet Tip',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    comments: [commentSchema],
  },
  {
    timestamps: true,
  }
);

// Virtual for total likes count
communityPostSchema.virtual('likesCount').get(function () {
  return this.likes ? this.likes.length : 0;
});

// Virtual for total comments count
communityPostSchema.virtual('commentsCount').get(function () {
  return this.comments ? this.comments.length : 0;
});

communityPostSchema.set('toJSON', { virtuals: true });
communityPostSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('CommunityPost', communityPostSchema);
