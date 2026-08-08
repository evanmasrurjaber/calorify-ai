import React, { useState, useEffect } from 'react';
import { getPlatformStats, getAllUsers } from '../../services/adminService';

// Member responsibility: Evan Masrur Jaber (lead)

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-white">Admin Platform Analytics</h2>
        <p className="text-gray-400 text-sm mt-1">Monitor user registrations, diet plan requests, and growth statistics.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-5 rounded-2xl">
            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Users</span>
            <span className="text-3xl font-black text-white">{stats.totalUsers || 0}</span>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-5 rounded-2xl">
            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Plans Generated</span>
            <span className="text-3xl font-black text-white">{stats.totalDietPlans || 0}</span>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-5 rounded-2xl">
            <span className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Scans Done</span>
            <span className="text-3xl font-black text-white">{stats.totalScans || 0}</span>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-5 rounded-2xl">
            <span className="block text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">New (7 days)</span>
            <span className="text-3xl font-black text-purple-400">{stats.usersLast7 || 0}</span>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-5 rounded-2xl">
            <span className="block text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">New (30 days)</span>
            <span className="text-3xl font-black text-purple-400">{stats.usersLast30 || 0}</span>
          </div>
          <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 p-5 rounded-2xl">
            <span className="block text-[10px] font-semibold text-purple-400 uppercase tracking-wider mb-1">New (90 days)</span>
            <span className="text-3xl font-black text-purple-400">{stats.usersLast90 || 0}</span>
          </div>
        </div>
      )}

      {/* User Records Table */}
      <div className="bg-gray-900/60 backdrop-blur-xl border border-gray-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="px-6 py-5 border-b border-gray-800">
          <h3 className="text-lg font-bold text-white">Registered Users</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-950/60 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-800">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Age</th>
                <th className="px-6 py-4">Weight (kg)</th>
                <th className="px-6 py-4">Height (cm)</th>
                <th className="px-6 py-4">Goal</th>
                <th className="px-6 py-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500 font-medium">
                    No registered general users found.
                  </td>
                </tr>
              ) : (
                users.map((userRecord) => (
                  <tr key={userRecord._id} className="hover:bg-gray-850/40 transition">
                    <td className="px-6 py-4 font-semibold text-white">{userRecord.name}</td>
                    <td className="px-6 py-4 text-gray-400">{userRecord.email}</td>
                    <td className="px-6 py-4">{userRecord.age || '--'}</td>
                    <td className="px-6 py-4">{userRecord.weight || '--'}</td>
                    <td className="px-6 py-4">{userRecord.height || '--'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md font-semibold">
                        {userRecord.goal}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(userRecord.createdAt).toLocaleDateString()}
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
