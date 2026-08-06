// TODO: Implement Bkash payment and pro subscription upgrade
// Member responsibility: Mohammed Mashrekin Yakub

const Subscription = require('../models/Subscription');
const User = require('../models/User');

// @route POST /api/subscriptions/initiate
const initiatePayment = async (req, res) => {
  try {
    // TODO: Call Bkash Payment API to create payment session, return paymentURL
    res.status(501).json({ message: 'initiatePayment not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/subscriptions/callback (Bkash callback webhook)
const paymentCallback = async (req, res) => {
  try {
    // TODO: Validate Bkash callback, update subscription status and user.isPro
    res.status(501).json({ message: 'paymentCallback not yet implemented' });
  } catch (error) {
    res.status(500).json({ message: error.message });
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
