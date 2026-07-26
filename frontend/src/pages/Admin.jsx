import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, DollarSign, Activity, TrendingDown, ShieldAlert, 
  Edit, RefreshCw, Search, CheckCircle, XCircle, Clock, 
  Loader2, Key, UserCheck, Ban, LogIn, Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, PageHeader, PrimaryBtn, GhostBtn, StatusBadge, LoadingSpinner, PageBg, PageStyle } from '../components/PageShell';

export default function Admin() {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [editPlanType, setEditPlanType] = useState('trial');
  const [editPlanStatus, setEditPlanStatus] = useState('trialing');
  const [editAccountsLimit, setEditAccountsLimit] = useState(1);
  const [editRole, setEditRole] = useState('user');
  const [editTrialEnds, setEditTrialEnds] = useState('');

  // Password reset modal
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  async function fetchMetrics() {
    setMetricsLoading(true);
    try {
      const res = await axios.get('/api/admin/metrics');
      if (res.data?.success) setMetrics(res.data.data);
    } catch (err) { console.error(err); }
    finally { setMetricsLoading(false); }
  }

  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data?.success) setUsers(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setUsersLoading(false); }
  }

  useEffect(() => {
    fetchMetrics();
    fetchUsers();
  }, []);

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditPlanType(user.plan_type || 'trial');
    setEditPlanStatus(user.plan_status || 'trialing');
    setEditAccountsLimit(user.plan_accounts_limit || 1);
    setEditRole(user.role || 'user');
    setEditTrialEnds(user.trial_ends_at ? new Date(user.trial_ends_at).toISOString().split('T')[0] : '');
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalLoading(true);

    try {
      await axios.put(`/api/admin/users/${selectedUser.id}/plan`, {
        plan_type: editPlanType,
        plan_status: editPlanStatus,
        plan_accounts_limit: parseInt(editAccountsLimit, 10),
        trial_ends_at: editTrialEnds ? new Date(editTrialEnds).toISOString() : null
      });

      await axios.put(`/api/admin/users/${selectedUser.id}/role`, { role: editRole });

      setSelectedUser(null);
      fetchUsers();
      fetchMetrics();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save modifications');
    } finally {
      setModalLoading(false);
    }
  };

  // Toggle user suspension
  const handleToggleSuspend = async (user) => {
    if (!window.confirm(`Are you sure you want to ${user.plan_status === 'suspended' ? 'activate' : 'suspend'} ${user.email}?`)) return;
    try {
      await axios.put(`/api/admin/users/${user.id}/suspend`);
      fetchUsers();
      fetchMetrics();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update user status');
    }
  };

  // Direct Password Reset
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordUser || !newPassword) return;
    setPassLoading(true);
    try {
      await axios.put(`/api/admin/users/${passwordUser.id}/password`, { password: newPassword });
      alert(`Password for ${passwordUser.email} has been reset to: ${newPassword}`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setPassLoading(false);
    }
  };

  // Impersonate User ("Login As")
  const handleImpersonate = async (user) => {
    if (!window.confirm(`Impersonate ${user.email}? You will be logged in as this user.`)) return;
    try {
      const res = await axios.post(`/api/admin/users/${user.id}/impersonate`);
      if (res.data?.success && res.data.token) {
        localStorage.setItem('lrat_token', res.data.token);
        localStorage.setItem('lrat_user', JSON.stringify(res.data.user));
        window.location.href = '/dashboard';
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Impersonation failed');
    }
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      (user.email || '').toLowerCase().includes(query) ||
      (user.name || '').toLowerCase().includes(query) ||
      (user.company_name || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className={`p-6 space-y-6 ${PageBg}`} style={PageStyle}>

      <PageHeader
        icon={ShieldAlert}
        title="Super Admin Panel"
        subtitle="Manage users, subscriptions, system health & platform MRR"
        accent="text-red-400"
        actions={
          <GhostBtn onClick={() => { fetchMetrics(); fetchUsers(); }}>
            <RefreshCw size={13} /> Refresh
          </GhostBtn>
        }
      />

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metricsLoading ? (
          [1,2,3,4].map(i => <GlassCard key={i} className="h-24 animate-pulse" />)
        ) : metrics ? (
          <>
            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400">
                  <DollarSign size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Platform MRR</p>
                  <p className="text-xl font-black text-white mt-0.5">${metrics.mrr || 0}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/15 text-blue-400">
                  <Users size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active Users</p>
                  <p className="text-xl font-black text-white mt-0.5">{metrics.totalSubscribers || 0}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400">
                  <Activity size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Active LinkedIn Nodes</p>
                  <p className="text-xl font-black text-white mt-0.5">{metrics.activeAccounts || 0}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Churn Rate</p>
                  <p className="text-xl font-black text-white mt-0.5">{metrics.churnRate || 0}%</p>
                </div>
              </div>
            </GlassCard>
          </>
        ) : null}
      </div>

      {/* Users Table */}
      <GlassCard className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/8">
          <div className="relative w-full sm:w-64">
            <Search size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search email, name, company..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/8 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Total Users: <span className="text-white font-black">{filteredUsers.length}</span>
          </span>
        </div>

        {usersLoading ? (
          <LoadingSpinner text="Retrieving users..." />
        ) : filteredUsers.length === 0 ? (
          <p className="text-center py-16 text-slate-500 text-xs font-bold uppercase tracking-wider">No users match query</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b border-white/6 text-slate-500 font-black uppercase tracking-widest">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Plan & Status</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Nodes/Campaigns</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const isAdminRole = user.role === 'admin';
                  const isSuspended = user.plan_status === 'suspended';
                  const isPlanActive = user.plan_status === 'active' || user.plan_status === 'trialing';

                  return (
                    <tr key={user.id} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-white text-xs">{user.name || 'User'}</p>
                        <p className="text-slate-400 font-mono text-[9px]">{user.email}</p>
                        {user.company_name && <p className="text-slate-500 text-[9px] mt-0.5">{user.company_name}</p>}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            user.plan_type === 'enterprise' ? 'bg-purple-500/15 text-purple-400' :
                            user.plan_type === 'professional' ? 'bg-blue-500/15 text-blue-400' : 'bg-white/8 text-slate-400'
                          }`}>
                            {user.plan_type}
                          </span>
                          <span className={`text-[8px] font-black uppercase ${isSuspended ? 'text-red-400' : isPlanActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {user.plan_status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[9px]">Limit: {user.plan_accounts_limit} nodes</p>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          isAdminRole ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-white/6 text-slate-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-bold">
                        {user.accountsCount} nodes • {user.campaignsCount} campaigns
                      </td>

                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Impersonate */}
                          <button onClick={() => handleImpersonate(user)} className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-white/8 transition-all" title="Impersonate (Login as User)">
                            <LogIn size={13} />
                          </button>

                          {/* Password Reset */}
                          <button onClick={() => setPasswordUser(user)} className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-white/8 transition-all" title="Reset Password">
                            <Key size={13} />
                          </button>

                          {/* Suspend / Unsuspend */}
                          <button onClick={() => handleToggleSuspend(user)} className={`p-1.5 rounded-lg transition-all ${isSuspended ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-red-400 hover:bg-red-500/10'}`} title={isSuspended ? 'Activate User' : 'Suspend User'}>
                            <Ban size={13} />
                          </button>

                          {/* Edit Config */}
                          <button onClick={() => handleOpenEdit(user)} className="p-1.5 rounded-lg text-slate-500 hover:text-purple-400 hover:bg-white/8 transition-all" title="Configure Limits & Role">
                            <Edit size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Edit Config Modal */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedUser(null)} className="fixed inset-0 z-40" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 240 }} className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col p-6 space-y-5" style={{ background: '#0D1221', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex justify-between items-center pb-4 border-b border-white/8">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Configure User</h3>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} className="text-[10px] text-slate-500 hover:text-white uppercase font-bold">Close ×</button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Plan Type</label>
                  <select value={editPlanType} onChange={e => setEditPlanType(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white text-xs" style={{ colorScheme: 'dark' }}>
                    <option value="trial">Trial</option>
                    <option value="starter">Starter / Solo ($49/mo)</option>
                    <option value="professional">Professional / Agency ($99/mo)</option>
                    <option value="enterprise">Enterprise / Scale ($199/mo)</option>
                    <option value="free">Free Limit</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Status</label>
                  <select value={editPlanStatus} onChange={e => setEditPlanStatus(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white text-xs" style={{ colorScheme: 'dark' }}>
                    <option value="trialing">Trialing</option>
                    <option value="active">Active</option>
                    <option value="past_due">Past Due</option>
                    <option value="suspended">Suspended</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Account Node Limit</label>
                  <input type="number" min={1} max={100} value={editAccountsLimit} onChange={e => setEditAccountsLimit(e.target.value)} className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white text-xs" />
                </div>

                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Role Authority</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-300 font-bold cursor-pointer">
                      <input type="radio" name="role" value="user" checked={editRole === 'user'} onChange={() => setEditRole('user')} /> Standard User
                    </label>
                    <label className="flex items-center gap-2 text-xs text-red-400 font-bold cursor-pointer">
                      <input type="radio" name="role" value="admin" checked={editRole === 'admin'} onChange={() => setEditRole('admin')} /> Super Admin
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setSelectedUser(null)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-slate-400 text-xs font-bold uppercase tracking-wider">Cancel</button>
                  <button type="submit" disabled={modalLoading} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-500/20">
                    {modalLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {passwordUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm p-6 rounded-2xl border border-white/10 space-y-4" style={{ background: '#0D1221' }}>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Key size={15} className="text-amber-400" /> Reset Password
              </h3>
              <p className="text-[10px] text-slate-500 font-mono">User: {passwordUser.email}</p>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">New Password</label>
                  <input type="text" required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="e.g. AdminPass123" className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white text-xs font-mono" />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPasswordUser(null)} className="flex-1 py-2.5 border border-white/10 rounded-xl text-slate-400 text-xs font-bold uppercase tracking-wider">Cancel</button>
                  <button type="submit" disabled={passLoading} className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider">
                    {passLoading ? 'Resetting...' : 'Set Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
