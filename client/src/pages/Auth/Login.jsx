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
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/40 via-gray-950 to-gray-950 px-4">
      <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-8 rounded-3xl shadow-2xl w-full max-w-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 to-indigo-600"></div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex justify-center items-center gap-2 mb-2">
            <span className="text-purple-500 font-black bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20 text-2xl">C</span>
            Calorify<span className="text-purple-400">.ai</span>
          </h1>
          <p className="text-gray-400 text-sm">Sign in to your personalized diet manager</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-2xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold rounded-2xl transition shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 active:scale-[0.98] mt-2"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-gray-800/80 pt-6">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-purple-400 hover:text-purple-300 font-semibold transition">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

