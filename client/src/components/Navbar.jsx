import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-gray-950/70 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link to="/dashboard" className="flex items-center gap-2 text-2xl font-bold text-white tracking-wide hover:opacity-90 transition">
          <span className="text-purple-500 font-extrabold bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">C</span>
          <span>Calorify<span className="text-purple-400">.ai</span></span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/dashboard" className="text-gray-300 hover:text-white transition">Dashboard</Link>
          <Link to="/diet-plan" className="text-gray-300 hover:text-white transition">Diet Plan</Link>
          <Link to="/bookmarks" className="text-gray-300 hover:text-white transition">Recipe Library</Link>
          {user?.role === 'admin' && (
            <Link to="/admin" className="text-purple-400 hover:text-purple-300 transition font-semibold">Admin Panel</Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-4">
            <Link to="/profile" className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-white hover:text-purple-400 transition">{user.name}</span>
              <span className="text-xs text-purple-400 font-medium">Score: {user.points || 0} pts</span>
            </Link>
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold border border-purple-400/20 shadow-md">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-semibold text-gray-400 hover:text-red-400 bg-gray-900 hover:bg-red-500/10 border border-gray-800 hover:border-red-500/20 px-3 py-2 rounded-xl transition"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
