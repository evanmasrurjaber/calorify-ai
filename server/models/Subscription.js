const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: String, enum: ['monthly', 'yearly'], required: true },
    amount: { type: Number },
    currency: { type: String, default: 'BDT' },
    status: { type: String, enum: ['pending', 'active', 'expired', 'failed'], default: 'pending' },
    bkashPaymentId: { type: String },
    bkashTrxId: { type: String },
    startDate: { type: Date },
    expiryDate: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
