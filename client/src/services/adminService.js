import api from './api';

export const getPlatformStats = () => api.get('/admin/stats');
export const getAllUsers = () => api.get('/admin/users');
