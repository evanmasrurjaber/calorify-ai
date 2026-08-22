import api from './api';

export const generateDietPlan = (payload = {}) => api.post('/diet-plans/generate', payload);
export const regenerateDay = (payload = {}) => api.post('/diet-plans/regenerate-day', payload);
export const regenerateMeal = (payload = {}) => api.post('/diet-plans/regenerate-meal', payload);
export const getActiveDietPlan = () => api.get('/diet-plans/active');
export const generateRecipe = (mealId) => api.get(`/diet-plans/${mealId}/recipe`);
export const generateRecipeDirectly = (name, meal, calories) => api.post('/diet-plans/generate-direct', { name, meal, calories });
export const getGenerationContext = () => api.get('/diet-plans/generation-context');
