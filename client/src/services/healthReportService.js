import api from './api';

/**
 * Fetch structured monthly health report data
 * @param {string} month - Format "YYYY-MM" (e.g. "2026-08")
 * @param {boolean} refresh - Force regenerate AI suggestions/metrics
 */
export const getMonthlyReport = (month, refresh = false) => {
  const query = [];
  if (month) query.push(`month=${encodeURIComponent(month)}`);
  if (refresh) query.push('refresh=true');
  const qs = query.length > 0 ? `?${query.join('&')}` : '';
  return api.get(`/reports/monthly${qs}`);
};

/**
 * Download the structured health report PDF directly
 * @param {string} month - Format "YYYY-MM"
 */
export const downloadMonthlyReportPDF = async (month) => {
  const qs = month ? `?month=${encodeURIComponent(month)}` : '';
  const response = await api.get(`/reports/monthly/pdf${qs}`, {
    responseType: 'blob',
  });

  // Create download link
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `Calorify-Health-Report-${month || 'Monthly'}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Fetch history of available report months
 */
export const getReportHistory = () => {
  return api.get('/reports/history');
};
