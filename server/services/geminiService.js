// Gemini API service wrapper
// Used by: Evan (Diet Plan, Medical Report), Jarin (Meal Log), Mashrekin (Recipe), Noorani (Trivia)

const axios = require('axios');

const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent`;

/**
 * Safely parse JSON from LLM responses, stripping code fences and extracting valid JSON boundaries
 * @param {string} rawText
 * @returns {any}
 */
const parseJSONResponse = (rawText) => {
  if (!rawText) throw new Error('Empty response received from AI model');

  // Strip markdown code fences if present
  let cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  // Try direct parse first
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    // Fallback: extract substring between first { or [ and matching last } or ]
    const firstObj = cleaned.indexOf('{');
    const firstArr = cleaned.indexOf('[');
    let startIdx = -1;
    let endIdx = -1;

    if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
      startIdx = firstObj;
      endIdx = cleaned.lastIndexOf('}');
    } else if (firstArr !== -1) {
      startIdx = firstArr;
      endIdx = cleaned.lastIndexOf(']');
    }

    if (startIdx !== -1 && endIdx > startIdx) {
      const extracted = cleaned.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(extracted);
      } catch {
        // Strip trailing commas before closing braces/brackets
        const fixed = extracted.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixed);
      }
    }

    throw initialErr;
  }
};

/**
 * Send a text prompt to Gemini and return the parsed text response
 * @param {string} prompt
 * @param {object} options
 * @returns {Promise<string>}
 */
const generateText = async (prompt, options = {}) => {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  // Enforce JSON mode by default unless explicitly disabled
  if (options.jsonMode !== false) {
    payload.generationConfig = {
      responseMimeType: 'application/json',
      ...options.generationConfig,
    };
  }

  const response = await axios.post(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    payload
  );
  return response.data.candidates[0].content.parts[0].text;
};

/**
 * Send a file (base64) + prompt to Gemini for multimodal processing
 * @param {string} prompt
 * @param {Buffer} fileBuffer
 * @param {string} mimeType - e.g. 'application/pdf' or 'image/jpeg'
 * @param {object} options
 * @returns {Promise<string>}
 */
const generateWithFile = async (prompt, fileBuffer, mimeType, options = {}) => {
  const base64Data = fileBuffer.toString('base64');
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } },
        ],
      },
    ],
  };

  if (options.jsonMode !== false) {
    payload.generationConfig = {
      responseMimeType: 'application/json',
      ...options.generationConfig,
    };
  }

  const response = await axios.post(
    `${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`,
    payload
  );
  return response.data.candidates[0].content.parts[0].text;
};

module.exports = { generateText, generateWithFile, parseJSONResponse };
