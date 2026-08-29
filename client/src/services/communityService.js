import api from './api';

// Get community feed with optional category, search, and sort params
export const getCommunityPosts = (params = {}) => api.get('/community-posts', { params });

// Get single post by ID
export const getCommunityPostById = (id) => api.get(`/community-posts/${id}`);

// Create new post (supports multipart form data with image file or JSON)
export const createCommunityPost = (formData) =>
  api.post('/community-posts', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Toggle like / unlike on post
export const toggleLikeCommunityPost = (id) => api.post(`/community-posts/${id}/like`);

// Add a comment to a post
export const addCommunityComment = (id, text) => api.post(`/community-posts/${id}/comments`, { text });

// Delete post
export const deleteCommunityPost = (id) => api.delete(`/community-posts/${id}`);
