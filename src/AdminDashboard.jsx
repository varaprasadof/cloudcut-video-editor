import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Shield, ArrowLeft, Search, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function AdminDashboard({ onBack }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  // Fetch all profiles from Supabase
  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProfiles(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Toggle user plan between FREE and PRO
  const togglePlan = async (user) => {
    setUpdatingId(user.id);
    const newPlan = user.plan === 'PRO' ? 'FREE' : 'PRO';

    const { error } = await supabase
      .from('profiles')
      .update({ plan: newPlan })
      .eq('id', user.id);

    if (!error) {
      setProfiles(prev =>
        prev.map(p => (p.id === user.id ? { ...p, plan: newPlan } : p))
      );
    } else {
      alert('Failed to update plan: ' + error.message);
    }
    setUpdatingId(null);
  };

  // Filter users by search term
  const filteredProfiles = profiles.filter(p =>
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = profiles.length;
  const proUsers = profiles.filter(p => p.plan === 'PRO').length;
  const freeUsers = totalUsers - proUsers;

  return (
    <div className="flex h-screen w-screen flex-col bg-dark-900 text-gray-200">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-dark-700 bg-dark-800 px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-lg bg-dark-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-600 transition"
          >
            <ArrowLeft size={16} /> Back to Editor
          </button>
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-lg">
            <Shield size={22} />
            <span>Admin Management Panel</span>
          </div>
        </div>

        <button
          onClick={fetchProfiles}
          className="flex items-center gap-2 rounded-lg bg-dark-700 px-3 py-1.5 text-xs text-gray-300 hover:bg-dark-600 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-5 shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Total Registered</span>
            <p className="mt-2 text-3xl font-bold text-white">{totalUsers}</p>
          </div>
          <div className="rounded-xl border border-dark-700 bg-dark-800 p-5 shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Free Accounts</span>
            <p className="mt-2 text-3xl font-bold text-gray-300">{freeUsers}</p>
          </div>
          <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-5 shadow-lg">
            <span className="text-xs text-indigo-400 uppercase tracking-wider">Pro Accounts</span>
            <p className="mt-2 text-3xl font-bold text-indigo-400">{proUsers}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-dark-700 bg-dark-800 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* User Table */}
        <div className="rounded-xl border border-dark-700 bg-dark-800 overflow-hidden shadow-xl">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-dark-900/60 text-xs text-gray-400 uppercase border-b border-dark-700">
              <tr>
                <th className="px-6 py-3.5">User Email</th>
                <th className="px-6 py-3.5">Joined Date</th>
                <th className="px-6 py-3.5">Total Exports</th>
                <th className="px-6 py-3.5">Current Plan</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {filteredProfiles.map((user) => (
                <tr key={user.id} className="hover:bg-dark-700/40 transition">
                  <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                    {user.email}
                    {user.role === 'admin' && (
                      <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                        ADMIN
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-gray-300">
                    {user.exports_count || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.plan === 'PRO'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-700/50 text-gray-400 border border-gray-600'
                      }`}
                    >
                      {user.plan === 'PRO' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => togglePlan(user)}
                      disabled={updatingId === user.id}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                        user.plan === 'PRO'
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-600/20'
                      }`}
                    >
                      {updatingId === user.id ? 'Updating...' : user.plan === 'PRO' ? 'Revoke PRO' : 'Grant PRO'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 text-sm">
                    No users found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}