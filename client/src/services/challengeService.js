import api from './api';

export const getTodayChallenges = () => api.get('/challenges/today');
export const logChallengeProgress = (id, amount) => api.post(`/challenges/${id}/progress`, { amount });
export const completeChallenge = (id) => api.post(`/challenges/${id}/complete`);
