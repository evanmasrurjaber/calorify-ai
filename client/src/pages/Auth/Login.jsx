import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginUser } from '../../services/authService';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data } = await loginUser({ email, password });
      login(data.user, data.token);
      if (data.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 px-4">
      <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-[0_20px_50px_-12px_rgba(16,185,129,0.2)] w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight flex justify-center items-center gap-2 mb-2">
            <span className="text-emerald-500 font-black bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 text-2xl">C</span>
            Calorify<span className="text-emerald-500">.ai</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium">Sign in to your personalized diet manager</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-50/50 border-2 border-emerald-100 focus:border-emerald-500 rounded-2xl px-4 py-3.5 text-gray-800 font-medium placeholder-gray-400 focus:outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 text-white font-semibold rounded-2xl transition shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 active:scale-[0.98] mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-emerald-100 pt-6">
          <p className="text-gray-500 text-sm font-medium">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-600 hover:text-emerald-500 font-bold transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

