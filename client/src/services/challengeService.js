import api from './api';

export const getTodayChallenges = () => api.get('/challenges/today');
export const completeChallenge = (id) => api.post(`/challenges/${id}/complete`);
