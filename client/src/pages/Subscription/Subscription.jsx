import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { initiateSubscription, getSubscriptionStatus } from '../../services/subscriptionService';
import api from '../../services/api'; // For the execute callback
import { Check, Zap, Shield, Camera, ArrowRight, Loader, Bookmark, FileText } from 'lucide-react';

export default function Subscription() {
  const { user, login, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Check for bKash callback params on mount
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bkashStatuses = params.getAll('status');
    const paymentID = params.get('paymentID');
    
    const isSuccess = bkashStatuses.includes('success');
    const isFailure = bkashStatuses.includes('failure') || bkashStatuses.includes('cancel');

    if (isSuccess && paymentID) {
      verifyPayment(paymentID);
    } else if (isFailure) {
      setErrorMsg(`Payment failed or cancelled. Please try again.`);
      // Clear URL
      window.history.replaceState({}, document.title, '/subscription');
    }
  }, [location]);

  const verifyPayment = async (paymentID) => {
    try {
      setVerifying(true);
      const { data } = await api.post('/subscriptions/callback', {
        paymentID,
        status: 'success'
      });
      if (data.success) {
        setSuccess(true);
        if (user && token) {
          login({ ...user, isPro: true }, token);
        }
        // Clean URL
        window.history.replaceState({}, document.title, '/subscription');
      }
    } catch (err) {
      console.error('Error verifying payment:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to verify payment.');
    } finally {
      setVerifying(false);
    }
  };

  const handleBkashPay = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { data } = await initiateSubscription('pro');
      if (data.paymentURL) {
        window.location.href = data.paymentURL;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (err) {
      console.error('bKash init error:', err);
      setErrorMsg('Failed to initiate bKash payment. Please try again later.');
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader className="w-12 h-12 text-pink-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800">Verifying Payment...</h2>
        <p className="text-gray-500 mt-2">Please do not close this window.</p>
      </div>
    );
  }

  if (success || user?.isPro) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-[3rem] p-12 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-20">
            <Zap size={120} />
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-lg">
              <Check className="w-10 h-10 text-emerald-500" strokeWidth={3} />
            </div>
            <h1 className="text-4xl font-black tracking-tight mb-4">You're a Pro Member!</h1>
            <p className="text-emerald-50 text-lg mb-8 max-w-md mx-auto font-medium">
              Thank you for upgrading. You now have unlimited access to all advanced AI features, including the food scanner.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-white text-emerald-600 font-bold px-8 py-3 rounded-full hover:bg-emerald-50 transition shadow-lg"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight mb-4">
          Unlock Your Full Potential
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl mx-auto font-medium">
          Upgrade to Pro for unlimited AI-powered nutrition insights and accelerate your health journey.
        </p>
      </div>

      {errorMsg && (
        <div className="max-w-lg mx-auto mb-8 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-center font-medium">
          {errorMsg}
        </div>
      )}

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        
        {/* Free Plan */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Free Plan</h3>
          <p className="text-gray-500 text-sm mb-6 font-medium">Perfect for getting started</p>
          <div className="mb-8">
            <span className="text-5xl font-black text-gray-900">৳0</span>
            <span className="text-gray-400 font-bold">/forever</span>
          </div>
          <ul className="space-y-4 mb-8 flex-1">
            <li className="flex items-start gap-3 text-gray-700 font-medium">
              <Check className="w-5 h-5 text-gray-400 shrink-0" /> Basic Calorie Tracking
            </li>
            <li className="flex items-start gap-3 text-gray-700 font-medium">
              <Check className="w-5 h-5 text-gray-400 shrink-0" /> Manual Diet Logging
            </li>
            <li className="flex items-start gap-3 text-gray-700 font-medium">
              <Check className="w-5 h-5 text-gray-400 shrink-0" /> Save up to 5 Bookmarks
            </li>
            <li className="flex items-start gap-3 text-gray-500 font-medium opacity-50">
              <Camera className="w-5 h-5 text-gray-400 shrink-0" /> AI Food Scanner (3/day)
            </li>
          </ul>
          <button disabled className="w-full bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl cursor-not-allowed">
            Current Plan
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-gradient-to-br from-green-400 to-emerald-600 rounded-[2.5rem] p-8 text-white shadow-2xl relative transform md:-translate-y-4 flex flex-col border border-green-500">
          <div className="absolute -top-4 right-8 bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1">
            <Zap size={14} className="fill-white" /> MOST POPULAR
          </div>
          
          <h3 className="text-2xl font-bold mb-2 text-white">Pro Plan</h3>
          <p className="text-emerald-100 text-sm mb-6 font-medium">Unlock the AI superpowers</p>
          <div className="mb-8">
            <span className="text-5xl font-black text-white">৳500</span>
            <span className="text-emerald-200 font-bold">/month</span>
          </div>
          <ul className="space-y-4 mb-10 flex-1">
            <li className="flex items-start gap-3 text-emerald-50 font-medium">
              <Check className="w-5 h-5 text-white shrink-0" /> Everything in Free
            </li>
            <li className="flex items-start gap-3 text-emerald-50 font-medium bg-white/10 p-2 rounded-xl -mx-2">
              <Camera className="w-5 h-5 text-white shrink-0" /> 
              <span><strong className="text-white">Unlimited</strong> AI Food Scans</span>
            </li>
            <li className="flex items-start gap-3 text-emerald-50 font-medium">
              <FileText className="w-5 h-5 text-white shrink-0" /> Smart Lab Report Uploads
            </li>
            <li className="flex items-start gap-3 text-emerald-50 font-medium">
              <Bookmark className="w-5 h-5 text-white shrink-0" /> Unlimited Recipe Bookmarks
            </li>
            <li className="flex items-start gap-3 text-emerald-50 font-medium">
              <Zap className="w-5 h-5 text-white shrink-0" /> Priority Support
            </li>
          </ul>
          
          <button
            onClick={handleBkashPay}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 text-emerald-700 font-bold py-4 rounded-2xl transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group relative overflow-hidden"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span className="relative z-10 flex items-center gap-2">
                  Pay with bKash <ArrowRight size={18} className="group-hover:translate-x-1 transition" />
                </span>
              </>
            )}
          </button>
          <p className="text-center text-xs text-emerald-200 mt-4 font-medium flex items-center justify-center gap-1">
            <Shield size={12} /> Secure sandbox payment gateway
          </p>
        </div>

      </div>
    </div>
  );
}
