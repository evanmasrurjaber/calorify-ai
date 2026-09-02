import api from './api';

export const getTodayChallenges = (date) =>
  api.get('/challenges/today', { params: date ? { date } : {} });
export const logChallengeProgress = (id, amount) => api.post(`/challenges/${id}/progress`, { amount });
export const completeChallenge = (id) => api.post(`/challenges/${id}/complete`);
