/**
 * Format a date to YYYY-MM-DD string
 * @param {Date} date
 * @returns {string}
 */
export const formatDate = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

/**
 * Calculate BMR using Mifflin-St Jeor formula
 * @param {{ weight: number, height: number, age: number, gender: string }} profile
 * @returns {number} BMR in kcal/day
 */
export const calculateBMR = ({ weight, height, age, gender = 'male' }) => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
};

/**
 * Get a badge label from point total
 * @param {number} points
 * @returns {string}
 */
export const getBadgeTier = (points) => {
  if (points >= 500) return 'diet_legend';
  if (points >= 200) return 'nutrition_master';
  if (points >= 50) return 'healthy_starter';
  return 'none';
};

/**
 * Build a marketplace search URL for an ingredient
 * @param {string} ingredient
 * @param {'chaldal' | 'shopno'} platform
 * @returns {string}
 */
export const getMarketplaceURL = (ingredient, platform) => {
  const encoded = encodeURIComponent(ingredient);
  if (platform === 'chaldal') return `https://chaldal.com/search/${encoded}`;
  if (platform === 'shopno') return `https://www.shopno.com.bd/search?q=${encoded}`;
  return '#';
};
