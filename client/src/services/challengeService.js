import api from './api';

export const getTodayChallenges = () => api.get('/challenges/today');
export const logChallengeProgress = (id) => api.post(`/challenges/${id}/progress`);
export const completeChallenge = (id) => api.post(`/challenges/${id}/complete`);
