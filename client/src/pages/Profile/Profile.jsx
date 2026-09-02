import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Activity,
  Heart,
  Scale,
  Shield,
  Bell,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Save,
  Crown,
  Award,
  Zap,
  FileText,
  Stethoscope,
  ExternalLink,
  Droplets,
  HeartPulse,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { getUserProfile, updateUserProfile } from '../../services/userService';
import { getMedicalReports } from '../../services/medicalReportService';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const { login } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    weight: '',
    height: '',
    goal: 'maintain',
    gender: 'prefer_not_to_say',
    activityLevel: 'sedentary',
    medicalConditions: '',
    allergies: '',
    dailyCalorieTarget: 2000,
    points: 0,
    badge: 'none',
    isPro: false,
    notifications: {
      weeklyPlanReset: true,
      loginAlerts: true,
      challengeAlerts: true,
      communityAlerts: true,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Medical Reports State
  const [medicalReports, setMedicalReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchMedicalReports();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await getUserProfile();

      setProfile({
        ...data,
        notifications: {
          weeklyPlanReset: data.notifications?.weeklyPlanReset !== false,
          loginAlerts: data.notifications?.loginAlerts !== false,
          challengeAlerts: data.notifications?.challengeAlerts !== false,
          communityAlerts: data.notifications?.communityAlerts !== false,
        },
        medicalConditions: data.medicalConditions?.join(', ') || '',
        allergies: data.allergies?.join(', ') || '',
      });
    } catch (err) {
      console.error('Error loading profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile details.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMedicalReports = async () => {
    try {
      setReportsLoading(true);
      const { data } = await getMedicalReports();
      setMedicalReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Could not load medical reports:', err);
      setMedicalReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // Aggregated clinical data from all reports
  const latestReport = medicalReports[0] || null;

  const allParsedDiagnoses = useMemo(() => {
    const set = new Set();
    medicalReports.forEach((r) => {
      (r.parsedData?.diagnoses || []).forEach((d) => {
        if (d && typeof d === 'string') set.add(d.trim());
      });
    });
    return Array.from(set);
  }, [medicalReports]);

  const allParsedAllergies = useMemo(() => {
    const set = new Set();
    medicalReports.forEach((r) => {
      (r.parsedData?.allergies || []).forEach((a) => {
        if (a && typeof a === 'string') set.add(a.trim());
      });
    });
    return Array.from(set);
  }, [medicalReports]);

  const latestHbA1c = useMemo(() => {
    const reportWithHbA1c = medicalReports.find((r) => r.parsedData?.hba1c != null);
    return reportWithHbA1c ? reportWithHbA1c.parsedData.hba1c : null;
  }, [medicalReports]);

  const latestBloodMarkers = latestReport?.parsedData?.bloodMarkers || {};

  // One-click sync from medical reports to profile state
  const syncFromMedicalReports = () => {
    if (!allParsedDiagnoses.length && !allParsedAllergies.length) return;

    setProfile((prev) => {
      const existingConditions = prev.medicalConditions
        ? prev.medicalConditions.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const mergedConditions = Array.from(new Set([...existingConditions, ...allParsedDiagnoses]));

      const existingAllergies = prev.allergies
        ? prev.allergies.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const mergedAllergies = Array.from(new Set([...existingAllergies, ...allParsedAllergies]));

      return {
        ...prev,
        medicalConditions: mergedConditions.join(', '),
        allergies: mergedAllergies.join(', '),
      };
    });

    setMessage({
      type: 'success',
      text: '✨ Parsed medical conditions & allergies populated into your profile fields! Click "Save Profile Details" to persist.',
    });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = async (field) => {
    const currentVal = profile.notifications?.[field] !== false;
    const nextVal = !currentVal;
    const updatedNotifications = {
      ...(profile.notifications || {}),
      [field]: nextVal,
    };

    setProfile((prev) => ({
      ...prev,
      notifications: updatedNotifications,
    }));

    try {
      await updateUserProfile({ notifications: updatedNotifications });
      setMessage({
        type: 'success',
        text: `✅ Preference saved: ${nextVal ? 'Turned ON' : 'Turned OFF'}`,
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 2500);
    } catch (err) {
      console.error('Failed to auto-save preference:', err);
    }
  };

  const calculateBMI = () => {
    const w = Number(profile.weight);
    const h = Number(profile.height);
    if (!w || !h || h <= 0) return null;
    const heightM = h / 100;
    const bmi = +(w / (heightM * heightM)).toFixed(1);
    let category = 'Normal';
    let color = 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (bmi < 18.5) {
      category = 'Underweight';
      color = 'text-blue-600 bg-blue-50 border-blue-200';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Overweight';
      color = 'text-amber-600 bg-amber-50 border-amber-200';
    } else if (bmi >= 30) {
      category = 'Obese';
      color = 'text-rose-600 bg-rose-50 border-rose-200';
    }
    return { bmi, category, color };
  };

  const bmiInfo = calculateBMI();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const dataToSubmit = {
        ...profile,
        age: profile.age ? Number(profile.age) : undefined,
        weight: profile.weight ? Number(profile.weight) : undefined,
        height: profile.height ? Number(profile.height) : undefined,
        medicalConditions: profile.medicalConditions
          ? profile.medicalConditions.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
        allergies: profile.allergies
          ? profile.allergies.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };

      const { data } = await updateUserProfile(dataToSubmit);
      setProfile({
        ...data,
        medicalConditions: data.medicalConditions?.join(', ') || '',
        allergies: data.allergies?.join(', ') || '',
      });

      // Update auth context state
      const token = localStorage.getItem('calorify_token');
      if (token) {
        login(data, token);
      }

      setMessage({ type: 'success', text: '✅ Profile updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error(err);
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to save changes. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const getBadgeLabel = (badge) => {
    switch (badge) {
      case 'diet_legend':
        return '👑 Diet Legend';
      case 'nutrition_master':
        return '⭐ Nutrition Master';
      case 'healthy_starter':
        return '🌱 Healthy Starter';
      default:
        return '🌟 Member';
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-16 flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
        <p className="text-gray-500 font-semibold text-sm">Loading profile details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* ── Hero Profile Header ── */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-tr from-[#10B981] to-[#006c49] flex items-center justify-center text-white font-black text-3xl shrink-0 shadow-md shadow-emerald-600/20">
              {profile.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  {profile.name || 'User Profile'}
                </h1>
                {profile.isPro ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Crown size={14} className="text-amber-500" />
                    Pro Member
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                    Free Plan
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Award size={13} />
                  {getBadgeLabel(profile.badge)}
                </span>
              </div>
              <p className="text-sm text-gray-500 font-medium">{profile.email}</p>
            </div>
          </div>

          {/* Quick Metrics Chips */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-gray-50 border border-gray-150 px-4 py-2.5 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight</span>
              <span className="text-sm font-black text-gray-900">{profile.weight ? `${profile.weight} kg` : '--'}</span>
            </div>
            <div className="bg-gray-50 border border-gray-150 px-4 py-2.5 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Height</span>
              <span className="text-sm font-black text-gray-900">{profile.height ? `${profile.height} cm` : '--'}</span>
            </div>
            {bmiInfo && (
              <div className="bg-gray-50 border border-gray-150 px-4 py-2.5 rounded-2xl text-center">
                <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">BMI</span>
                <span className="text-sm font-black text-emerald-600">{bmiInfo.bmi}</span>
              </div>
            )}
            <div className="bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-2xl text-center">
              <span className="block text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Daily Target</span>
              <span className="text-sm font-black text-emerald-900">{profile.dailyCalorieTarget || 2000} kcal</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Status Message Banner ── */}
      {message.text && (
        <div
          className={`flex items-center gap-3 p-4 rounded-2xl border text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="text-emerald-600 shrink-0" size={20} />
          ) : (
            <AlertCircle className="text-red-600 shrink-0" size={20} />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Profile Edit Form ── */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Info */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <User size={20} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Personal & Contact Details</h3>
              <p className="text-xs text-gray-500 font-medium">Manage your personal identification details</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Email Address (Read-only) */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Email Address <span className="text-xs text-gray-400 normal-case">(Primary account identifier)</span>
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full bg-gray-100/70 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-500 font-medium cursor-not-allowed"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={profile.phone || ''}
                onChange={handleChange}
                placeholder="e.g. +880 1712 345678"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Age & Gender Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Age</label>
                <input
                  type="number"
                  name="age"
                  value={profile.age || ''}
                  onChange={handleChange}
                  placeholder="e.g. 26"
                  min="10"
                  max="120"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Gender</label>
                <select
                  name="gender"
                  value={profile.gender || 'prefer_not_to_say'}
                  onChange={handleChange}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Health Metrics & Goals */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Activity size={20} />
              </span>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Health Metrics & Dietary Profile</h3>
                <p className="text-xs text-gray-500 font-medium">Used by AI to calculate your calorie targets and diet plans</p>
              </div>
            </div>
            {bmiInfo && (
              <span className={`hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border ${bmiInfo.color}`}>
                BMI: {bmiInfo.bmi} ({bmiInfo.category})
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Weight */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                name="weight"
                value={profile.weight || ''}
                onChange={handleChange}
                placeholder="e.g. 70.5"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Height */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Height (cm)</label>
              <input
                type="number"
                step="0.1"
                name="height"
                value={profile.height || ''}
                onChange={handleChange}
                placeholder="e.g. 175"
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>

            {/* Fitness Goal */}
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Primary Goal</label>
              <select
                name="goal"
                value={profile.goal || 'maintain'}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
              >
                <option value="lose_weight">Lose Weight 📉</option>
                <option value="maintain">Maintain Weight ⚖️</option>
                <option value="gain_muscle">Gain Muscle 💪</option>
              </select>
            </div>

            {/* Activity Level */}
            <div className="md:col-span-3">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                Physical Activity Level
                <span className="text-xs text-gray-400 normal-case font-normal ml-2">
                  (Determines your Total Daily Energy Expenditure / TDEE)
                </span>
              </label>
              <select
                name="activityLevel"
                value={profile.activityLevel || 'sedentary'}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition cursor-pointer"
              >
                <option value="sedentary">Sedentary — Desk job, little or no structured exercise</option>
                <option value="lightly_active">Lightly Active — Light workouts 1–3 days/week</option>
                <option value="moderately_active">Moderately Active — Moderate workouts 3–5 days/week</option>
                <option value="very_active">Very Active — Hard workouts 6–7 days/week</option>
              </select>
            </div>

            {/* Medical Conditions */}
            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Medical Conditions <span className="text-gray-400 normal-case">(comma separated)</span>
                </label>
                <input
                  type="text"
                  name="medicalConditions"
                  value={profile.medicalConditions || ''}
                  onChange={handleChange}
                  placeholder="e.g. Diabetes Type 2, Hypertension, PCOS"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Allergies & Restrictions <span className="text-gray-400 normal-case">(comma separated)</span>
                </label>
                <input
                  type="text"
                  name="allergies"
                  value={profile.allergies || ''}
                  onChange={handleChange}
                  placeholder="e.g. Peanuts, Lactose, Seafood, Gluten"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 font-medium placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section: Clinical Diagnostics & Medical Report Insights */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <Stethoscope size={20} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Clinical Diagnostics & Medical Report Data</h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    AI Parsed
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Conditions and biometrics extracted from your laboratory test scans
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {medicalReports.length > 0 && (allParsedDiagnoses.length > 0 || allParsedAllergies.length > 0) && (
                <button
                  type="button"
                  onClick={syncFromMedicalReports}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition active:scale-95 cursor-pointer"
                  title="Copy parsed diagnoses & allergies into your editable profile fields above"
                >
                  <Sparkles size={13} className="text-blue-600" />
                  <span>Sync to Profile Form</span>
                </button>
              )}
              <Link
                to="/medical-report"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition cursor-pointer"
              >
                <span>Upload / View Reports</span>
                <ArrowUpRight size={14} className="text-gray-500" />
              </Link>
            </div>
          </div>

          {reportsLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <RefreshCw size={20} className="animate-spin text-blue-500" />
              <p className="text-xs text-gray-500">Loading parsed clinical records...</p>
            </div>
          ) : medicalReports.length === 0 ? (
            /* Empty State */
            <div className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 rounded-2xl p-6 border border-blue-100 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-xs">
                <FileText size={22} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-gray-900">No Medical Lab Reports Uploaded Yet</h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Upload PDF or scanned photos of your diagnostic test reports (from Popular, Square, Labaid, Ibn Sina, etc.) to automatically extract health conditions, blood sugar, and biomarker trends.
                </p>
              </div>
              <Link
                to="/medical-report"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 transition active:scale-95"
              >
                <Sparkles size={14} />
                <span>Upload First Medical Report</span>
              </Link>
            </div>
          ) : (
            /* Parsed Clinical Information Display */
            <div className="space-y-5">
              {/* Reports Summary Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gray-50/80 rounded-2xl border border-gray-150 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-gray-800">
                    {medicalReports.length} {medicalReports.length === 1 ? 'Report' : 'Reports'} Synchronized
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">
                    Latest: <strong className="text-gray-700 font-semibold">{latestReport?.fileName || 'Report'}</strong> (
                    {new Date(latestReport?.createdAt).toLocaleDateString()})
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  Calibrating AI Diet Plans
                </span>
              </div>

              {/* Grid: Diagnoses & Allergies */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Diagnoses Card */}
                <div className="p-4 rounded-2xl border border-gray-150 bg-[#fafbff] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Stethoscope size={14} className="text-blue-600" />
                      Extracted Health Conditions & Diagnoses
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {allParsedDiagnoses.length} Found
                    </span>
                  </div>
                  {allParsedDiagnoses.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {allParsedDiagnoses.map((d, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200 shadow-xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-1">
                      No chronic clinical conditions detected in uploaded documents.
                    </p>
                  )}
                </div>

                {/* Allergies Card */}
                <div className="p-4 rounded-2xl border border-gray-150 bg-[#fafbff] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={14} className="text-rose-500" />
                      Extracted Allergies & Intolerances
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                      {allParsedAllergies.length} Found
                    </span>
                  </div>
                  {allParsedAllergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {allParsedAllergies.map((a, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-900 border border-rose-200 shadow-xs"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic py-1">
                      No specific allergies flagged in uploaded records.
                    </p>
                  )}
                </div>
              </div>

              {/* Biomarkers / Lab Results Highlight Strip */}
              {(latestHbA1c != null ||
                latestBloodMarkers.fastingGlucose ||
                latestBloodMarkers.systolicBP ||
                latestBloodMarkers.totalCholesterol ||
                latestBloodMarkers.hemoglobin ||
                latestBloodMarkers.creatinine) && (
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Droplets size={14} className="text-emerald-600" />
                    Latest Diagnostic Biomarkers
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {/* HbA1c */}
                    {latestHbA1c != null && (
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">HbA1c</span>
                        <span className="text-sm font-black text-gray-900">{latestHbA1c}%</span>
                        <span
                          className={`block text-[9px] font-bold mt-0.5 ${
                            latestHbA1c >= 6.5
                              ? 'text-red-600'
                              : latestHbA1c >= 5.7
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {latestHbA1c >= 6.5 ? 'Diabetic' : latestHbA1c >= 5.7 ? 'Prediabetic' : 'Normal'}
                        </span>
                      </div>
                    )}

                    {/* Fasting Glucose */}
                    {latestBloodMarkers.fastingGlucose && (
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">Fasting Glucose</span>
                        <span className="text-sm font-black text-gray-900">{latestBloodMarkers.fastingGlucose}</span>
                        <span className="block text-[9px] text-gray-400">mg/dL</span>
                      </div>
                    )}

                    {/* Blood Pressure */}
                    {(latestBloodMarkers.systolicBP || latestBloodMarkers.diastolicBP) && (
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">Blood Pressure</span>
                        <span className="text-sm font-black text-gray-900">
                          {latestBloodMarkers.systolicBP || '--'}/{latestBloodMarkers.diastolicBP || '--'}
                        </span>
                        <span className="block text-[9px] text-gray-400">mmHg</span>
                      </div>
                    )}

                    {/* Total Cholesterol */}
                    {latestBloodMarkers.totalCholesterol && (
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">Cholesterol</span>
                        <span className="text-sm font-black text-gray-900">{latestBloodMarkers.totalCholesterol}</span>
                        <span className="block text-[9px] text-gray-400">mg/dL</span>
                      </div>
                    )}

                    {/* Hemoglobin */}
                    {latestBloodMarkers.hemoglobin && (
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">Hemoglobin</span>
                        <span className="text-sm font-black text-gray-900">{latestBloodMarkers.hemoglobin}</span>
                        <span className="block text-[9px] text-gray-400">g/dL</span>
                      </div>
                    )}

                    {/* Creatinine */}
                    {latestBloodMarkers.creatinine && (
                      <div className="p-3 bg-gray-50 border border-gray-150 rounded-2xl text-center">
                        <span className="block text-[10px] font-bold text-gray-500 uppercase">Creatinine</span>
                        <span className="text-sm font-black text-gray-900">{latestBloodMarkers.creatinine}</span>
                        <span className="block text-[9px] text-gray-400">mg/dL</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Clinical Summary */}
              {latestReport?.parsedData?.summary && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-150 text-xs space-y-1">
                  <span className="font-bold text-emerald-900 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Sparkles size={12} className="text-emerald-600" />
                    Latest AI Clinical Summary
                  </span>
                  <p className="text-emerald-950/90 leading-relaxed font-medium">
                    {latestReport.parsedData.summary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Notification Preferences */}
        <div className="bg-white border border-gray-150 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Bell size={20} />
            </span>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Notification Preferences</h3>
              <p className="text-xs text-gray-500 font-medium">Control automated email alerts and schedule updates</p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Toggle 1: Weekly Diet Plan Reset */}
            <div
              onClick={() => handleNotificationToggle('weeklyPlanReset')}
              className="flex items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-150 cursor-pointer transition"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-gray-900">Weekly Diet Plan Resets</p>
                <p className="text-xs text-gray-500">Get notified when a new 7-day personalized meal plan is generated or ready for refresh.</p>
              </div>
              <div
                className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner shrink-0 ${
                  profile.notifications?.weeklyPlanReset !== false ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    profile.notifications?.weeklyPlanReset !== false ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Toggle 3: New User Login Security Alerts */}
            <div
              onClick={() => handleNotificationToggle('loginAlerts')}
              className="flex items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-150 cursor-pointer transition"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-gray-900">Login Security Alerts</p>
                <p className="text-xs text-gray-500">Receive security notification emails whenever a successful login to your account occurs.</p>
              </div>
              <div
                className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner shrink-0 ${
                  profile.notifications?.loginAlerts !== false ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    profile.notifications?.loginAlerts !== false ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Toggle 4: Challenge & Badge Unlock Alerts */}
            <div
              onClick={() => handleNotificationToggle('challengeAlerts')}
              className="flex items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-150 cursor-pointer transition"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-gray-900">Challenges & Badge Unlocks</p>
                <p className="text-xs text-gray-500">Receive celebration emails when you unlock new health badges or complete daily challenges.</p>
              </div>
              <div
                className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner shrink-0 ${
                  profile.notifications?.challengeAlerts !== false ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    profile.notifications?.challengeAlerts !== false ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>

            {/* Toggle 5: Community Post & Suggestion Alerts */}
            <div
              onClick={() => handleNotificationToggle('communityAlerts')}
              className="flex items-center justify-between p-4 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-150 cursor-pointer transition"
            >
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-gray-900">Community Activity Alerts</p>
                <p className="text-xs text-gray-500">Receive email notifications on your first blog post and significant community interactions.</p>
              </div>
              <div
                className={`w-12 h-6 rounded-full flex items-center transition-colors duration-300 p-1 shadow-inner shrink-0 ${
                  profile.notifications?.communityAlerts !== false ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                    profile.notifications?.communityAlerts !== false ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Form Actions ── */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-600/25 transition active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Profile Details</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
