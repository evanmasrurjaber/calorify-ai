// Gemini API service wrapper
// Used by: Evan (Diet Plan, Medical Report), Jarin (Meal Log), Mashrekin (Recipe), Noorani (Trivia)

const axios = require('axios');

// Supported Gemini Models (with automatic multi-model fallback for quota limits)
// gemini-3.7-flash is listed first — confirmed working on this network
const GEMINI_MODELS = [
  'gemini-3.5-flash-light',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
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

  // Try direct parse first (fastest path — works when response is clean)
  try {
    return JSON.parse(cleaned);
  } catch (initialErr) {
    // Find the start of the first JSON object or array
    const firstObj = cleaned.indexOf('{');
    const firstArr = cleaned.indexOf('[');
    let startIdx = -1;
    let openChar, closeChar;

    if (firstObj !== -1 && (firstArr === -1 || firstObj < firstArr)) {
      startIdx = firstObj;
      openChar = '{';
      closeChar = '}';
    } else if (firstArr !== -1) {
      startIdx = firstArr;
      openChar = '[';
      closeChar = ']';
    }

    if (startIdx === -1) throw initialErr;

    // Walk forward tracking bracket depth to find the exact balanced closing bracket.
    // This correctly handles Gemini appending extra text or a second JSON blob after
    // the first complete object (which causes "Unexpected non-whitespace character after JSON").
    let depth = 0;
    let inString = false;
    let escape = false;
    let endIdx = -1;

    for (let i = startIdx; i < cleaned.length; i++) {
      const ch = cleaned[i];

      if (escape) { escape = false; continue; }
      if (ch === '\\' && inString) { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;

      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }

    if (endIdx === -1) throw initialErr;

    const extracted = cleaned.substring(startIdx, endIdx + 1);
    try {
      return JSON.parse(extracted);
    } catch {
      // Strip trailing commas before closing braces/brackets and retry
      const fixed = extracted.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(fixed);
    }
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
      const response = await axios.post(url, payload, { timeout: 300000 });
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      // Fall back to next model on rate limit, not found, service unavailable, or timeout
      if (status === 429 || status === 404 || status === 503 || isTimeout) {
        console.warn(`[GeminiService]: Model ${model} failed (${status || err.code}). Trying next model...`);
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
      const response = await axios.post(url, payload, { timeout: 300000 });
      return response.data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err;
      const status = err.response?.status;
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      if (status === 429 || status === 404 || status === 503 || isTimeout) {
        console.warn(`[GeminiService]: Model ${model} failed (${status || err.code}). Trying next model...`);
        continue;
      }
      throw err;
    }
  }

  throw lastError;
};

module.exports = { generateText, generateWithFile, parseJSONResponse };
