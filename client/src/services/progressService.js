import api from './api';

export const logProgress = (data) => api.post('/progress', data);
export const getProgress = () => api.get('/progress');
