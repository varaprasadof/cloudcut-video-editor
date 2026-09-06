import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Shield, ArrowLeft, Search, CheckCircle, XCircle, RefreshCw, User, FileText, Check } from 'lucide-react';

export default function AdminDashboard({ onBack }) {
  const [activeTab, setActiveTab] = useState('utr'); // 'utr' or 'users'
  const [profiles, setProfiles] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchProfiles(), fetchPendingPayments()]);
    setLoading(false);
  };

  // 1. Fetch all user profiles
  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error.message);
    } else {
      setProfiles(data || []);
    }
  };

  // 2. Fetch all payments safely without strict filters
  const fetchPendingPayments = async () => {
    const { data, error } = await supabase
      .from('payments')
      .select('*');

    if (error) {
      console.error('Error fetching payments:', error.message);
    } else {
      setPendingPayments(data || []);
    }
  };

  // Approve a pending UTR request and upgrade user to PRO safely
  const handleApproveUtr = async (paymentId, userId) => {
    setUpdatingId(paymentId);
    try {
      const { error: payError } = await supabase
        .from('payments')
        .update({ status: 'approved' })
        .eq('id', paymentId);

      if (payError) throw payError;

      // Safely check if userId is valid before updating the profiles table
      if (userId && userId !== 'null' && userId !== '' && userId !== undefined) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ plan: 'PRO' })
          .eq('id', userId);

        if (profileError) throw profileError;
      }

      alert('🎉 UTR approved and user successfully upgraded to PRO!');
      fetchAllData();
    } catch (err) {
      alert('Approval failed: ' + err.message);
    }
    setUpdatingId(null);
  };

  // Toggle user plan between FREE and PRO directly
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

  const filteredProfiles = profiles.filter(p =>
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = profiles.length;
  const proUsers = profiles.filter(p => p.plan === 'PRO').length;
  const freeUsers = totalUsers - proUsers;

  return (
    <div className="flex h-screen w-screen flex-col bg-[#0b0c10] text-gray-200 font-sans select-none">
      {/* Top Header */}
      <header className="flex h-16 items-center justify-between border-b border-[#23242c] bg-[#121318] px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-xl bg-[#191a20] px-3.5 py-2 text-xs text-gray-300 hover:bg-[#20212b] border border-gray-800 transition"
          >
            <ArrowLeft size={16} /> Back to Editor
          </button>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-base">
            <Shield size={20} />
            <span>Admin Control Center</span>
          </div>
        </div>

        <button
          onClick={fetchAllData}
          className="flex items-center gap-2 rounded-xl bg-[#191a20] px-3.5 py-2 text-xs text-gray-300 hover:bg-[#20212b] border border-gray-800 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Data
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
        {/* Metric Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="rounded-2xl border border-gray-800 bg-[#16171d] p-5 shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Total UTRs</span>
            <p className="mt-2 text-3xl font-bold text-amber-400">{pendingPayments.length}</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#16171d] p-5 shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Total Registered</span>
            <p className="mt-2 text-3xl font-bold text-white">{totalUsers}</p>
          </div>
          <div className="rounded-2xl border border-gray-800 bg-[#16171d] p-5 shadow-lg">
            <span className="text-xs text-gray-400 uppercase tracking-wider">Free Accounts</span>
            <p className="mt-2 text-3xl font-bold text-gray-300">{freeUsers}</p>
          </div>
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 shadow-lg">
            <span className="text-xs text-indigo-400 uppercase tracking-wider">Pro Accounts</span>
            <p className="mt-2 text-3xl font-bold text-indigo-400">{proUsers}</p>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex gap-3 mb-6 border-b border-gray-800 pb-4">
          <button
            onClick={() => setActiveTab('utr')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'utr'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                : 'bg-[#16171d] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            ⏳ UTR Approvals ({pendingPayments.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-[#16171d] text-gray-400 hover:text-white border border-gray-800'
            }`}
          >
            👥 Manage All Users ({totalUsers})
          </button>
        </div>

        {/* TAB 1: UTR REQUESTS */}
        {activeTab === 'utr' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white mb-2">Customer UTR Verification Requests</h2>
            {pendingPayments.length === 0 ? (
              <div className="rounded-2xl bg-[#16171d] border border-gray-800 p-12 text-center shadow-xl">
                <CheckCircle size={40} className="mx-auto text-emerald-500 mb-3 opacity-80" />
                <h3 className="text-sm font-bold text-white">No Payment Requests</h3>
                <p className="text-xs text-gray-400 mt-1">There are no payment records found in the database.</p>
              </div>
            ) : (
              pendingPayments.map((item) => (
                <div key={item.id} className="rounded-2xl bg-[#16171d] border border-gray-800 p-6 flex items-center justify-between shadow-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      <User size={14} className="text-indigo-400" />
                      <span className="font-semibold text-white">{item.email}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${item.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                        {item.status || 'pending'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
                      <FileText size={14} /> UTR Code: <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-white font-bold">{item.utr}</span>
                    </div>
                    <div className="text-[10px] text-gray-500">Submitted: {new Date(item.created_at).toLocaleString()}</div>
                  </div>

                  {item.status !== 'approved' && (
                    <button
                      onClick={() => handleApproveUtr(item.id, item.user_id)}
                      disabled={updatingId === item.id}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition transform hover:-translate-y-0.5 disabled:opacity-50"
                    >
                      <Check size={16} /> {updatingId === item.id ? 'Approving...' : 'Approve & Upgrade to PRO'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: ALL USERS LIST */}
        {activeTab === 'users' && (
          <div>
            <div className="relative mb-6">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search user by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-gray-800 bg-[#16171d] pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="rounded-2xl border border-gray-800 bg-[#16171d] overflow-hidden shadow-xl">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#101115] text-gray-400 uppercase border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-3.5">User Email</th>
                    <th className="px-6 py-3.5">Joined Date</th>
                    <th className="px-6 py-3.5">Current Plan</th>
                    <th className="px-6 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredProfiles.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-800/40 transition">
                      <td className="px-6 py-4 font-medium text-white flex items-center gap-2">
                        {user.email}
                        {user.role === 'admin' && (
                          <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300 border border-indigo-500/30">
                            ADMIN
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                            user.plan === 'PRO'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-800 text-gray-400 border border-gray-700'
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
                          className={`rounded-xl px-3.5 py-1.5 font-semibold transition ${
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
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}