// Gemini API service wrapper
// Used by: Evan (Diet Plan, Medical Report), Jarin (Meal Log), Mashrekin (Recipe), Noorani (Trivia)

const axios = require('axios');

// Supported Gemini Models (with automatic multi-model fallback for quota limits)
const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
];

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
 * Send a text prompt to Gemini and return the parsed text response with multi-model fallback
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

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await axios.post(url, payload, { timeout: 15000 });
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      // If rate limited (429) or model not found (404), fall back to next model
      if (status === 429 || status === 404 || status === 503) {
        console.warn(`[GeminiService]: Model ${model} returned ${status}. Attempting fallback model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

/**
 * Send a file (base64) + prompt to Gemini for multimodal processing with multi-model fallback
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

  let lastError = null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const response = await axios.post(url, payload, { timeout: 20000 });
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      if (status === 429 || status === 404 || status === 503) {
        console.warn(`[GeminiService]: Model ${model} returned ${status}. Attempting fallback model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

module.exports = { generateText, generateWithFile, parseJSONResponse };
