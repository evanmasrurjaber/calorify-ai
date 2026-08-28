import api from './api';

export const getWearableStatus = () => api.get('/wearable/status');
export const getWearableAuthUrl = () => api.get('/wearable/auth-url');
export const syncWearableNow = () => api.post('/wearable/sync');
export const getWearableToday = () => api.get('/wearable/today');
export const disconnectWearable = () => api.delete('/wearable/disconnect');
