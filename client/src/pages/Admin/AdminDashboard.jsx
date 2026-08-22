import React, { useState, useEffect } from 'react';
import { getPlatformStats, getAllUsers, deleteUser } from '../../services/adminService';
import { Trash2, TrendingUp, Users, Activity, Bell, MessageSquare, Clipboard } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(null); // Track ID being deleted

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes] = await Promise.all([
        getPlatformStats(),
        getAllUsers()
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch admin platform data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    try {
      setDeleteLoading(id);
      await deleteUser(id);
      // Refresh list
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800">Admin Platform Analytics</h2>
        <p className="text-gray-500 text-sm mt-1 font-medium">Monitor user registrations, growth, and platform activity.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl mb-6 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total Users" value={stats.totalUsers} icon={<Users size={20} />} color="emerald" />
          <StatCard title="New (7d)" value={stats.usersLast7} icon={<TrendingUp size={20} />} color="green" />
          <StatCard title="New (30d)" value={stats.usersLast30} icon={<TrendingUp size={20} />} color="teal" />
          <StatCard title="New (90d)" value={stats.usersLast90} icon={<TrendingUp size={20} />} color="cyan" />
          
          <StatCard title="DAU / MAU" value={`${stats.dau || 0} / ${stats.mau || 0}`} icon={<Activity size={20} />} color="blue" />
          <StatCard title="Diet Plans" value={stats.totalDietPlans} icon={<Clipboard size={20} />} color="emerald" />
          <StatCard title="Calorie Scans" value={stats.totalScans} icon={<Activity size={20} />} color="green" />
          
          <StatCard title="Community Posts" value={stats.communityPosts || 0} icon={<MessageSquare size={20} />} color="teal" />
          <StatCard title="Notifs Sent" value={stats.notificationsSent || 0} icon={<Bell size={20} />} color="emerald" />
        </div>
      )}

      {/* User Records Table */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl overflow-hidden shadow-[0_10px_30px_-10px_rgba(16,185,129,0.15)]">
        <div className="px-6 py-5 border-b border-emerald-50 bg-emerald-50/30 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Registered Users</h3>
          <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">{users.length} Total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50/80 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Goal</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">
                    No registered general users found.
                  </td>
                </tr>
              ) : (
                users.map((userRecord) => (
                  <tr key={userRecord._id} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-800">{userRecord.name}</td>
                    <td className="px-6 py-4 text-gray-500">{userRecord.email}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-emerald-100 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-md font-bold uppercase">
                        {userRecord.goal}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-400">
                      {new Date(userRecord.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDeleteUser(userRecord._id)}
                        disabled={deleteLoading === userRecord._id}
                        className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Helper component for stats
function StatCard({ title, value, icon, color }) {
  // Simple mapping for tailwind border/icon colors based on prop
  const colorMap = {
    emerald: 'text-emerald-500 border-emerald-100 bg-emerald-50',
    green: 'text-green-500 border-green-100 bg-green-50',
    teal: 'text-teal-500 border-teal-100 bg-teal-50',
    cyan: 'text-cyan-500 border-cyan-100 bg-cyan-50',
    blue: 'text-blue-500 border-blue-100 bg-blue-50',
  };
  
  const selectedTheme = colorMap[color] || colorMap.emerald;

  return (
    <div className={`bg-white/80 backdrop-blur-sm border p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow ${selectedTheme.split(' ')[1]}`}>
      <div className="flex justify-between items-start mb-2">
        <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${selectedTheme.split(' ')[2]} ${selectedTheme.split(' ')[0]}`}>
          {icon}
        </div>
      </div>
      <span className="text-3xl font-black text-gray-800">{value}</span>
    </div>
  );
}
