// Bkash Payment API service
// Member responsibility: Mohammed Mashrekin Yakub

const axios = require('axios');

const BKASH_BASE_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'; // Use prod URL for live

let bkashToken = null;

const getToken = async () => {
  if (bkashToken) return bkashToken;

  const response = await axios.post(
    `${BKASH_BASE_URL}/tokenized/checkout/token/grant`,
    {
      app_key: process.env.BKASH_APP_KEY,
      app_secret: process.env.BKASH_APP_SECRET,
    },
    {
      headers: {
        username: process.env.BKASH_USERNAME,
        password: process.env.BKASH_PASSWORD,
        'Content-Type': 'application/json',
      },
    }
  );

  bkashToken = response.data.id_token;
  return bkashToken;
};

/**
 * Create a Bkash payment
 * @param {number} amount - in BDT
 * @param {string} orderId - unique reference
 */
const createPayment = async (amount, orderId) => {
  const token = await getToken();
  // TODO: Implement full payment creation flow
  return { token, amount, orderId };
};

module.exports = { createPayment };
