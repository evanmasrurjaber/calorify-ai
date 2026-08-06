import api from './api';

export const addBookmark = (recipe) => api.post('/bookmarks', { recipe });
export const getBookmarks = () => api.get('/bookmarks');
export const removeBookmark = (index) => api.delete(`/bookmarks/${index}`);
