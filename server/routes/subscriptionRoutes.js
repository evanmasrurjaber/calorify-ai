const express = require('express');
const router = express.Router();
const { initiatePayment, paymentCallback, getSubscriptionStatus } = require('../controllers/subscriptionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/initiate', protect, initiatePayment);
router.post('/callback', protect, paymentCallback);
router.get('/status', protect, getSubscriptionStatus);

module.exports = router;
