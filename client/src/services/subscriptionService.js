import api from './api';

export const initiateSubscription = (plan) => api.post('/subscriptions/initiate', { plan });
export const getSubscriptionStatus = () => api.get('/subscriptions/status');
