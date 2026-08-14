import React, { useState, useEffect } from 'react';
import { getUserProfile, updateUserProfile } from '../../services/userService';
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
    medicalConditions: '',
    allergies: '',
    notifications: {
      dailyMealReminder: true,
      weeklyPlanReset: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await getUserProfile();
        setProfile({
          ...data,
          medicalConditions: data.medicalConditions?.join(', ') || '',
          allergies: data.allergies?.join(', ') || ''
        });
      } catch (err) {
        console.error(err);
        setMessage({ type: 'error', text: 'Failed to load profile details' });
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationChange = (field) => {
    setProfile(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: !prev.notifications[field]
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const dataToSubmit = {
        ...profile,
        age: Number(profile.age) || undefined,
        weight: Number(profile.weight) || undefined,
        height: Number(profile.height) || undefined,
        medicalConditions: profile.medicalConditions.split(',').map(s => s.trim()).filter(Boolean),
        allergies: profile.allergies.split(',').map(s => s.trim()).filter(Boolean)
      };

      const { data } = await updateUserProfile(dataToSubmit);
      setProfile({
        ...data,
        medicalConditions: data.medicalConditions?.join(', ') || '',
        allergies: data.allergies?.join(', ') || ''
      });

      // Update auth context state too
      const token = localStorage.getItem('calorify_token');
      login(data, token);

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <h2 className="text-3xl font-extrabold text-white mb-2">My Profile</h2>
        <p className="text-gray-400 text-sm mb-6">Manage your health metrics, goals, and notification settings.</p>

        {message.text && (
          <div className={`p-4 rounded-xl mb-6 text-sm font-medium border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Info */}
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-4 border-b border-gray-800 pb-2">Basic Info</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full bg-gray-950/40 border border-gray-800/40 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Age</label>
                <input
                  type="number"
                  name="age"
                  value={profile.age}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Health Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-4 border-b border-gray-800 pb-2">Health Metrics & Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={profile.weight}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Height (cm)</label>
                <input
                  type="number"
                  name="height"
                  value={profile.height}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Fitness Goal</label>
                <select
                  name="goal"
                  value={profile.goal}
                  onChange={handleChange}
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white focus:outline-none transition"
                >
                  <option value="lose_weight">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain_muscle">Gain Muscle</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Medical Conditions (comma separated)</label>
                <input
                  type="text"
                  name="medicalConditions"
                  value={profile.medicalConditions}
                  onChange={handleChange}
                  placeholder="e.g. Diabetes, Hypertension"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Allergies (comma separated)</label>
                <input
                  type="text"
                  name="allergies"
                  value={profile.allergies}
                  onChange={handleChange}
                  placeholder="e.g. Peanuts, Dairy, Gluten"
                  className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Notifications */}
          <div>
            <h3 className="text-lg font-semibold text-purple-400 mb-4 border-b border-gray-800 pb-2">Notifications Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notifications?.dailyMealReminder}
                  onChange={() => handleNotificationChange('dailyMealReminder')}
                  className="h-4 w-4 rounded text-purple-600 bg-gray-950 border-gray-800 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">Daily Meal Reminders (alerts you to log your meals)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={profile.notifications?.weeklyPlanReset}
                  onChange={() => handleNotificationChange('weeklyPlanReset')}
                  className="h-4 w-4 rounded text-purple-600 bg-gray-950 border-gray-800 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">Weekly Diet Plan Resets (notifications of fresh meal charts)</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold px-8 py-3 rounded-2xl transition shadow-lg shadow-purple-500/10 hover:shadow-purple-500/25 active:scale-95"
            >
              {saving ? 'Saving...' : 'Save Profile Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
