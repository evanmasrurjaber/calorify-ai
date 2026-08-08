// Gemini API service wrapper
// Used by: Evan (Diet Plan, Medical Report), Jarin (Meal Log), Mashrekin (Recipe), Noorani (Trivia)

const axios = require('axios');

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

/**
 * Send a text prompt to Gemini and return the parsed text response
 * @param {string} prompt
 * @returns {Promise<string>}
 */
const generateText = async (prompt) => {
  const response = await axios.post(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    { contents: [{ parts: [{ text: prompt }] }] }
  );
  return response.data.candidates[0].content.parts[0].text;
};

/**
 * Send a file (base64) + prompt to Gemini for multimodal processing
 * @param {string} prompt
 * @param {Buffer} fileBuffer
 * @param {string} mimeType - e.g. 'application/pdf' or 'image/jpeg'
 * @returns {Promise<string>}
 */
const generateWithFile = async (prompt, fileBuffer, mimeType) => {
  const base64Data = fileBuffer.toString('base64');
  const response = await axios.post(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    {
      contents: [
        {
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        },
      ],
    }
  );
  return response.data.candidates[0].content.parts[0].text;
};

module.exports = { generateText, generateWithFile };
