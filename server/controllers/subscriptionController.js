// TODO: Implement Bkash payment and pro subscription upgrade
// Member responsibility: Mohammed Mashrekin Yakub

const Subscription = require('../models/Subscription');
const User = require('../models/User');
const axios = require('axios');
const crypto = require('crypto');

// bKash Sandbox config
const BKASH_BASE_URL = 'https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout';

// Helper to get bkash token
const getBkashToken = async () => {
  const { BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD } = process.env;
  
  const { data } = await axios.post(`${BKASH_BASE_URL}/token/grant`, {
    app_key: BKASH_APP_KEY,
    app_secret: BKASH_APP_SECRET
  }, {
    headers: {
      username: BKASH_USERNAME,
      password: BKASH_PASSWORD
    }
  });
  return data.id_token;
};

// @route POST /api/subscriptions/initiate
const initiatePayment = async (req, res) => {
  try {
    const token = await getBkashToken();
    const invoiceNumber = 'Inv' + crypto.randomBytes(4).toString('hex');
    
    const { BKASH_APP_KEY } = process.env;

    // Create payment session
    const { data } = await axios.post(`${BKASH_BASE_URL}/create`, {
      mode: '0011',
      payerReference: ' ',
      callbackURL: `http://localhost:5173/subscription`, 
      amount: '99',
      currency: 'BDT',
      intent: 'sale',
      merchantInvoiceNumber: invoiceNumber
    }, {
      headers: {
        'Authorization': token,
        'X-APP-Key': BKASH_APP_KEY
      }
    });

    if (data.statusCode !== '0000') {
      throw new Error(data.statusMessage);
    }

    res.json({ paymentURL: data.bkashURL, paymentID: data.paymentID });
  } catch (error) {
    console.error('bKash initiate error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to initiate bKash payment' });
  }
};

// @route POST /api/subscriptions/callback (Bkash callback webhook or frontend callback)
const paymentCallback = async (req, res) => {
  try {
    const { paymentID, status } = req.body;

    if (status !== 'success') {
      return res.status(400).json({ message: 'Payment was not successful' });
    }

    const token = await getBkashToken();
    const { BKASH_APP_KEY } = process.env;
    
    // Execute payment
    const { data } = await axios.post(`${BKASH_BASE_URL}/execute`, {
      paymentID
    }, {
      headers: {
        'Authorization': token,
        'X-APP-Key': BKASH_APP_KEY
      }
    });

    if (data.statusCode !== '0000' && data.statusCode !== '2062') {
      throw new Error(data.statusMessage || 'Execution failed');
    }

    // Success! Update User status
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 1 month pro

    await User.findByIdAndUpdate(req.user.id, {
      isPro: true,
      subscriptionExpiry: expiryDate
    });

    // Save Subscription history
    await Subscription.create({
      user: req.user.id,
      plan: 'monthly',
      bkashPaymentId: paymentID,
      bkashTrxId: data.trxID,
      amount: data.amount,
      status: 'active',
      startDate: new Date(),
      expiryDate: expiryDate
    });

    res.json({ success: true, message: 'Upgraded to Pro successfully!' });
  } catch (error) {
    console.error('bKash execute error:', error.response?.data || error.message);
    res.status(500).json({ message: 'Failed to verify payment' });
  }
};

// @route GET /api/subscriptions/status
const getSubscriptionStatus = async (req, res) => {
  try {
    const sub = await Subscription.findOne({ user: req.user.id, status: 'active' });
    res.json({ isPro: !!sub, subscription: sub });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { initiatePayment, paymentCallback, getSubscriptionStatus };
