// Google Health API webhook handler helper
// Member responsibility: Evan Masrur Jaber

/**
 * Parse a Google Health API webhook payload
 * and extract steps + calories burned
 * @param {object} payload - raw webhook body
 * @returns {{ steps: number, caloriesBurned: number }}
 */
const parseWearablePayload = (payload) => {
  // TODO: Map actual Google Health API payload structure
  const steps = payload?.point?.[0]?.value?.[0]?.intVal || 0;
  const caloriesBurned = payload?.point?.[0]?.value?.[1]?.fpVal || 0;
  return { steps, caloriesBurned };
};

module.exports = { parseWearablePayload };
