import api from './api';

export const generateDietPlan = () => api.post('/diet-plans/generate');
export const getActiveDietPlan = () => api.get('/diet-plans/active');
export const generateRecipe = (mealId) => api.get(`/diet-plans/${mealId}/recipe`);
export const generateRecipeDirectly = (name, meal, calories) => api.post('/diet-plans/generate-direct', { name, meal, calories });
