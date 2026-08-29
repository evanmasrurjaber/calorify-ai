// Community Diet Post & Suggestion Feed — Member 4 (Noorani Faiza Khan)
// Allows users to write, publish, and browse community diet blogs, nutrition tips, and meal suggestions

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getCommunityPosts,
  createCommunityPost,
  toggleLikeCommunityPost,
  addCommunityComment,
  deleteCommunityPost,
} from '../../services/communityService';
import {
  MessageSquare,
  Heart,
  Share2,
  ImagePlus,
  X,
  Search,
  Filter,
  Sparkles,
  Send,
  Trash2,
  Lightbulb,
  Utensils,
  BookOpen,
  Award,
  HelpCircle,
  Clock,
  User as UserIcon,
  CheckCircle2,
  Flame,
  PlusCircle,
  Tag,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'All', label: 'All Insights', icon: Sparkles },
  { id: 'Diet Tip', label: 'Diet Tips', icon: Lightbulb },
  { id: 'Meal Suggestion', label: 'Meal Suggestions', icon: Utensils },
  { id: 'Recipe Idea', label: 'Recipe Ideas', icon: BookOpen },
  { id: 'Success Story', label: 'Success Stories', icon: Award },
  { id: 'Nutrition Q&A', label: 'Nutrition Q&A', icon: HelpCircle },
];

const CATEGORY_COLORS = {
  'Diet Tip': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Meal Suggestion': 'bg-teal-50 text-teal-700 border-teal-200',
  'Recipe Idea': 'bg-amber-50 text-amber-700 border-amber-200',
  'Success Story': 'bg-purple-50 text-purple-700 border-purple-200',
  'Nutrition Q&A': 'bg-rose-50 text-rose-700 border-rose-200',
};

// Helper: Relative time formatter
const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const seconds = Math.floor((new Date() - new Date(dateStr)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function Community() {
  const { user } = useAuth();

  // Feed states
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // 'latest' | 'top'

  // Modal / Create Post states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('Diet Tip');
  const [newTags, setNewTags] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef(null);

  // Active comments drawer per post
  const [activeCommentPostId, setActiveCommentPostId] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [commentingMap, setCommentingMap] = useState({});

  // Fetch feed
  const fetchFeed = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'All') params.category = selectedCategory;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (sortBy) params.sort = sortBy;

      const { data } = await getCommunityPosts(params);
      setPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching community posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [selectedCategory, sortBy]);

  // Handle Search on Enter or debounce
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFeed();
  };

  // Image select handler
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('Please select an image file (JPEG, PNG).');
        return;
      }
      setImageFile(file);
      setErrorMsg('');
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Create post handler
  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMsg('Please enter a post title.');
      return;
    }
    if (!newContent.trim()) {
      setErrorMsg('Please write your post content.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const formData = new FormData();
      formData.append('title', newTitle.trim());
      formData.append('content', newContent.trim());
      formData.append('category', newCategory);
      if (newTags.trim()) formData.append('tags', newTags.trim());
      if (imageFile) formData.append('post_image', imageFile);

      const { data } = await createCommunityPost(formData);

      setSuccessMsg('Diet post published to community!');
      setTimeout(() => {
        setSuccessMsg('');
        setShowCreateModal(false);
        setNewTitle('');
        setNewContent('');
        setNewCategory('Diet Tip');
        setNewTags('');
        removeImage();
      }, 1000);

      // Prepend new post to feed
      if (data?.post) {
        setPosts((prev) => [data.post, ...prev]);
      } else {
        fetchFeed();
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to publish post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Like / Unlike handler
  const handleLike = async (postId) => {
    try {
      const { data } = await toggleLikeCommunityPost(postId);
      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === postId) {
            const currentUserId = user?._id || user?.id;
            const updatedLikes = data.liked
              ? [...(p.likes || []), currentUserId]
              : (p.likes || []).filter((id) => (id._id || id).toString() !== currentUserId.toString());
            return {
              ...p,
              likes: updatedLikes,
              likesCount: data.likesCount,
            };
          }
          return p;
        })
      );
    } catch (err) {
      console.error('Error toggling like:', err);
    }
  };

  // Add comment handler
  const handleAddComment = async (postId) => {
    const text = commentInputs[postId] || '';
    if (!text.trim()) return;

    try {
      setCommentingMap((prev) => ({ ...prev, [postId]: true }));
      const { data } = await addCommunityComment(postId, text.trim());

      setPosts((prev) =>
        prev.map((p) => {
          if (p._id === postId) {
            return {
              ...p,
              comments: data.comments || p.comments,
            };
          }
          return p;
        })
      );

      // Clear input
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setCommentingMap((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Delete post handler
  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this community post?')) return;

    try {
      await deleteCommunityPost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const isLikedByMe = (post) => {
    const myId = (user?._id || user?.id || '').toString();
    return (post.likes || []).some((id) => (id._id || id).toString() === myId);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ── Header Banner ── */}
      <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl">
              <Sparkles size={24} />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Community Diet & Nutrition Hub
              </h1>
              <p className="text-sm text-gray-500 font-medium mt-0.5">
                Share your personal meal suggestions, healthy lifestyle hacks, and dietary insights.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
        >
          <PlusCircle size={18} />
          Publish Diet Post
        </button>
      </div>

      {/* ── Filter Bar & Search ── */}
      <div className="bg-white border border-gray-150 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search tips, recipes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </form>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <Filter size={13} /> Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="latest">Newest First</option>
              <option value="top">Most Popular ❤️</option>
            </select>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={14} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Feed Section ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-bold text-gray-400">Loading community insights...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white border border-gray-150 rounded-3xl p-12 text-center shadow-sm space-y-4">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <Utensils size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">No community posts yet</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
              Be the first nutrition champion to share a meal recommendation or dietary tip with the Calorify community!
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition"
          >
            <PlusCircle size={15} /> Publish First Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {posts.map((post) => {
            const liked = isLikedByMe(post);
            const isAuthor = (user?._id || user?.id || '').toString() === (post.author?._id || post.author || '').toString();
            const showComments = activeCommentPostId === post._id;

            return (
              <div
                key={post._id}
                className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col space-y-5 self-start w-full"
              >
                {/* Author Header & Category */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm shadow-inner uppercase">
                      {(post.author?.name || 'U').charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900 leading-tight">
                          {post.author?.name || 'Community Member'}
                        </span>
                        {post.author?.role === 'admin' && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {formatTimeAgo(post.createdAt)}
                        </span>
                        {post.author?.points > 0 && (
                          <span className="font-bold text-emerald-600">
                            ★ {post.author.points} pts
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${
                        CATEGORY_COLORS[post.category] || CATEGORY_COLORS['Diet Tip']
                      }`}
                    >
                      {post.category}
                    </span>

                    {isAuthor && (
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        className="text-gray-400 hover:text-rose-500 p-1 rounded-lg transition"
                        title="Delete post"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Title & Content */}
                <div className="space-y-2">
                  <h3 className="text-base font-extrabold text-gray-900 leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">
                    {post.content}
                  </p>
                </div>

                {/* Accompanying Image (if uploaded) */}
                {post.imageUrl && (
                  <div className="rounded-2xl overflow-hidden border border-gray-100 max-h-72 bg-gray-50">
                    <img
                      src={post.imageUrl}
                      alt={post.title}
                      className="w-full h-full object-cover hover:scale-102 transition duration-300"
                    />
                  </div>
                )}

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-150"
                      >
                        <Tag size={10} className="text-emerald-500" /> #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Bar (Likes, Comments Count, Share) */}
                <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Like Button */}
                    <button
                      onClick={() => handleLike(post._id)}
                      className={`flex items-center gap-1.5 text-xs font-bold transition px-3 py-1.5 rounded-xl ${
                        liked
                          ? 'bg-rose-50 text-rose-600'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <Heart
                        size={16}
                        className={`${liked ? 'fill-rose-500 text-rose-500' : ''}`}
                      />
                      <span>{post.likes?.length || 0}</span>
                    </button>

                    {/* Comments Toggle */}
                    <button
                      onClick={() =>
                        setActiveCommentPostId((prev) => (prev === post._id ? null : post._id))
                      }
                      className={`flex items-center gap-1.5 text-xs font-bold transition px-3 py-1.5 rounded-xl ${
                        showComments
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                      }`}
                    >
                      <MessageSquare size={16} />
                      <span>{post.comments?.length || 0}</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-bold text-gray-400">
                    {post.category}
                  </span>
                </div>

                {/* ── Expandable Comments Drawer ── */}
                {showComments && (
                  <div className="pt-3 border-t border-gray-100 space-y-3 animate-[fadeIn_0.2s_ease]">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((c, i) => (
                          <div
                            key={c._id || i}
                            className="bg-gray-50/80 p-2.5 rounded-xl border border-gray-150 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-gray-900">
                                {c.authorName || 'Member'}
                              </span>
                              <span className="text-gray-400">{formatTimeAgo(c.createdAt)}</span>
                            </div>
                            <p className="text-gray-700 leading-snug">{c.text}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-400 italic text-center py-2">
                          No suggestions yet. Share your thoughts below!
                        </p>
                      )}
                    </div>

                    {/* Comment Input */}
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Add a suggestion or reply..."
                        value={commentInputs[post._id] || ''}
                        onChange={(e) =>
                          setCommentInputs((prev) => ({ ...prev, [post._id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddComment(post._id);
                        }}
                        className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={() => handleAddComment(post._id)}
                        disabled={commentingMap[post._id] || !commentInputs[post._id]?.trim()}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition shadow-sm"
                      >
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE POST MODAL ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6 animate-[fadeIn_0.2s_ease]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <PlusCircle size={20} />
                </span>
                <h3 className="text-lg font-bold text-gray-900">Publish Community Diet Post</h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  removeImage();
                  setErrorMsg('');
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error / Success alerts */}
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Category selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Category / Topic
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = newCategory === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setNewCategory(cat.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={14} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Post Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Favorite Low-Carb Bangladeshi Breakfast Idea"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Content textarea */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Dietary Content & Insights *
                </label>
                <textarea
                  rows={5}
                  placeholder="Write your meal preparation tips, portion adjustments, healthy substitutions, or nutrition reflections..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  required
                />
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Accompanying Photo (Optional)
                </label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                    <img src={imagePreview} alt="Preview" className="w-full max-h-56 object-cover" />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 hover:bg-white text-gray-600 hover:text-rose-600 rounded-xl shadow-sm transition"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer border-2 border-dashed border-gray-200 hover:border-emerald-500 rounded-2xl p-6 bg-gray-50 hover:bg-gray-100/50 flex flex-col items-center justify-center gap-2 transition"
                  >
                    <ImagePlus className="text-gray-400" size={24} />
                    <span className="text-xs font-bold text-gray-600">
                      Upload meal photo or infographic
                    </span>
                    <span className="text-[10px] text-gray-400">JPEG, PNG up to 10MB</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {/* Tags input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Tags (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. lowcarb, dalbhat, mealprep, healthy"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    removeImage();
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full" />
                      Publishing…
                    </>
                  ) : (
                    'Publish Post'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
