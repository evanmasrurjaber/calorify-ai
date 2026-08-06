import api from './api';

export const logMealText = (data) => api.post('/meal-logs', data);
export const logMealImage = (formData) => api.post('/meal-logs/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getDailyLog = (date) => api.get(`/meal-logs?date=${date}`);
