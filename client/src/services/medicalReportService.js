import api from './api';

export const uploadMedicalReport = (formData) =>
  api.post('/medical-reports/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getMedicalReports = () => api.get('/medical-reports');

export const deleteMedicalReport = (id) => api.delete(`/medical-reports/${id}`);
