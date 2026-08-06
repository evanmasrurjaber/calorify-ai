// Calorie Counting API service (FastAPI microservice or third-party)
// Member responsibility: Jarin Tasnim Dia

const axios = require('axios');

/**
 * Send an image buffer to the calorie estimation API
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @returns {Promise<{ foods: string[], calories: number, carbs: number, protein: number, fat: number }>}
 */
const estimateCaloriesFromImage = async (imageBuffer, mimeType) => {
  // TODO: Replace URL with actual FastAPI microservice / third-party calorie API endpoint
  const base64Image = imageBuffer.toString('base64');

  const response = await axios.post(process.env.CALORIE_API_URL, {
    image: base64Image,
    mime_type: mimeType,
  });

  return response.data;
};

module.exports = { estimateCaloriesFromImage };
