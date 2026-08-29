import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { registerUser } from '../../services/authService';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    age: '',
    weight: '',
    height: '',
    goal: 'maintain',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const dataToSubmit = {
        ...formData,
        age: formData.age ? Number(formData.age) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        height: formData.height ? Number(formData.height) : undefined,
      };

      const { data } = await registerUser(dataToSubmit);
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 px-4 py-12">
      <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-[0_20px_50px_-12px_rgba(16,185,129,0.2)] w-full max-w-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight flex justify-center items-center gap-2 mb-2">
            <span className="text-emerald-500 font-black bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 text-2xl">C</span>
            Calorify<span className="text-emerald-500">.ai</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Create your health profile and start tracking</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group 1: Credentials */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 border-b border-emerald-100 pb-1.5">Account credentials</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+88017xxxxxxxx"
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Group 2: Metrics */}
          <div>
            <h3 className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-4 border-b border-emerald-100 pb-1.5">Health Profile & Goals</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  placeholder="25"
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Weight (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  placeholder="70"
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Height (cm)</label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  placeholder="175"
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Fitness Goal</label>
                <select
                  name="goal"
                  value={formData.goal}
                  onChange={handleChange}
                  className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium focus:outline-none transition-colors"
                >
                  <option value="lose_weight">Lose Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="gain_muscle">Gain Muscle</option>
                </select>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-semibold rounded-2xl transition shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-[0.98] mt-2"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-emerald-100 pt-6">
          <p className="text-gray-500 text-sm font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-500 font-bold transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

