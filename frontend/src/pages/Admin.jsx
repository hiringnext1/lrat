import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  DollarSign, 
  Activity, 
  Megaphone, 
  UserCheck, 
  TrendingDown, 
  ShieldAlert, 
  Edit, 
  UserX, 
  RefreshCw, 
  Search, 
  Settings, 
  UserCheck2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Admin() {
  const [metrics, setMetrics] = useState(null);
  const [users, setUsers] = useState([]);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State for modifying plan/role
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [editPlanType, setEditPlanType] = useState('trial');
  const [editPlanStatus, setEditPlanStatus] = useState('trialing');
  const [editAccountsLimit, setEditAccountsLimit] = useState(1);
  const [editRole, setEditRole] = useState('user');
  const [editTrialEnds, setEditTrialEnds] = useState('');

  // Fetch metrics data
  async function fetchMetrics() {
    setMetricsLoading(true);
    try {
      const res = await axios.get('/api/admin/metrics');
      if (res.data?.success) {
        setMetrics(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch admin metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  }

  // Fetch users data
  async function fetchUsers() {
    setUsersLoading(true);
    try {
      const res = await axios.get('/api/admin/users');
      if (res.data?.success) {
        setUsers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin users list:', err);
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
    fetchUsers();
  }, []);

  // Set initial edit state when user is selected
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditPlanType(user.plan_type || 'trial');
    setEditPlanStatus(user.plan_status || 'trialing');
    setEditAccountsLimit(user.plan_accounts_limit || 1);
    setEditRole(user.role || 'user');
    
    if (user.trial_ends_at) {
      // Format YYYY-MM-DD
      setEditTrialEnds(new Date(user.trial_ends_at).toISOString().split('T')[0]);
    } else {
      setEditTrialEnds('');
    }
  };

  // Submit plan & role update modifications
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setModalLoading(true);

    try {
      // 1. Update user plan
      await axios.put(`/api/admin/users/${selectedUser.id}/plan`, {
        plan_type: editPlanType,
        plan_status: editPlanStatus,
        plan_accounts_limit: parseInt(editAccountsLimit, 10),
        trial_ends_at: editTrialEnds ? new Date(editTrialEnds).toISOString() : null
      });

      // 2. Update user role
      await axios.put(`/api/admin/users/${selectedUser.id}/role`, {
        role: editRole
      });

      alert('User records updated successfully.');
      setSelectedUser(null);
      fetchUsers();
      fetchMetrics();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save modifications');
    } finally {
      setModalLoading(false);
    }
  };

  // Filtered users list based on search
  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      (user.email || '').toLowerCase().includes(query) ||
      (user.name || '').toLowerCase().includes(query) ||
      (user.company_name || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen text-left relative overflow-hidden">
      {/* Background ambient grids */}
      <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-indigo-500 to-purple-500 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-pink-500 to-blue-500 pointer-events-none" />

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="text-red-500" size={28} strokeWidth={2.5} />
            Super Admin Panel
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">Configure settings, plans, and monitor SaaS revenue KPIs</p>
        </div>

        <button
          onClick={() => { fetchMetrics(); fetchUsers(); }}
          className="flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all duration-150 shrink-0"
        >
          <RefreshCw size={14} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
        {metricsLoading ? (
          [1, 2, 3, 4].map(idx => (
            <div key={idx} className="h-28 bg-white dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800/80 animate-pulse" />
          ))
        ) : metrics ? (
          <>
            {/* MRR Card */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex items-center gap-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl">
                <DollarSign size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Est. Monthly Revenue</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-white tracking-tight mt-0.5">${metrics.mrr || 0} USD</h3>
              </div>
            </div>

            {/* Total Subscribers Card */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex items-center gap-4">
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-2xl">
                <Users size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Subscribers</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-white tracking-tight mt-0.5">{metrics.totalSubscribers || 0} users</h3>
              </div>
            </div>

            {/* Churn Rate Card */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex items-center gap-4">
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 text-rose-600 rounded-2xl">
                <TrendingDown size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Churn Rate</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-white tracking-tight mt-0.5">{metrics.churnRate || 0}%</h3>
              </div>
            </div>

            {/* System Health / Linked accounts Card */}
            <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex items-center gap-4">
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 rounded-2xl">
                <Activity size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Linked Nodes</p>
                <h3 className="text-xl font-black text-slate-850 dark:text-white tracking-tight mt-0.5">{metrics.activeAccounts || 0} profiles</h3>
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Users Management Workspace */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.01)] overflow-hidden relative z-10">
        
        {/* Table Search Header */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800/85 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-xs">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={14} />
            </div>
            <input
              type="text"
              placeholder="Search user, email, or company..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          <div className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
            Total Users: <span className="font-black text-slate-800 dark:text-slate-200">{filteredUsers.length}</span>
          </div>
        </div>

        {/* User Table Grid */}
        <div className="overflow-x-auto">
          {usersLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Retrieving user database...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-slate-550 dark:text-slate-500 uppercase tracking-widest text-[10px]">
              No users match your current filter search queries.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/20 border-b border-slate-100 dark:border-slate-800/80 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                  <th className="py-4 px-6">User profile</th>
                  <th className="py-4 px-6">Plan details</th>
                  <th className="py-4 px-6">Access details</th>
                  <th className="py-4 px-6">Engagement metrics</th>
                  <th className="py-4 px-6">Last Login</th>
                  <th className="py-4 px-6 text-center">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                {filteredUsers.map(user => {
                  const isAdminRole = user.role === 'admin';
                  const isPlanActive = user.plan_status === 'active' || user.plan_status === 'trialing';
                  
                  return (
                    <tr key={user.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                      {/* Column 1: User profile details */}
                      <td className="py-4.5 px-6">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-slate-900 dark:text-white">{user.name || 'Anonymous User'}</span>
                          <span className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold lowercase mt-0.5">{user.email}</span>
                          {(user.company_name || user.designation) && (
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wide">
                              {user.designation || 'Staff'} @ {user.company_name || 'N/A'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Column 2: Plan details */}
                      <td className="py-4.5 px-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              user.plan_type === 'scale' || user.plan_type === 'enterprise' ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400' :
                              user.plan_type === 'agency' || user.plan_type === 'professional' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-750 dark:text-blue-400' :
                              user.plan_type === 'free' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600' :
                              'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-755 dark:text-indigo-400'
                            }`}>
                              {user.plan_type}
                            </span>
                            
                            <span className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
                              isPlanActive ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {isPlanActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                              {user.plan_status}
                            </span>
                          </div>
                          
                          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mt-1.5">
                            Node limit: {user.plan_accounts_limit} ({user.accountsCount} active)
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Access details */}
                      <td className="py-4.5 px-6">
                        <div className="flex flex-col gap-1">
                          <span className={`self-start px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                            isAdminRole ? 'bg-red-50 dark:bg-red-950/30 text-red-650 dark:text-red-400 border border-red-200/50' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {user.role}
                          </span>

                          <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold">
                            Setup: {user.onboarding_completed ? '✅ Done' : `❌ Step (${user.onboarding_step || 'welcome'})`}
                          </span>
                        </div>
                      </td>

                      {/* Column 4: Engagement metrics */}
                      <td className="py-4.5 px-6 text-slate-550 dark:text-slate-400 font-medium text-[10px]">
                        <div className="flex flex-col gap-0.5">
                          <span>Nodes: {user.accountsCount}</span>
                          <span>Campaigns: {user.campaignsCount}</span>
                        </div>
                      </td>

                      {/* Column 5: Last Login */}
                      <td className="py-4.5 px-6 text-[10px] text-slate-400 dark:text-slate-500">
                        {user.last_login ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-600 dark:text-slate-350">
                              {new Date(user.last_login).toLocaleDateString()}
                            </span>
                            <span className="text-[9px] mt-0.5">
                              {new Date(user.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 uppercase tracking-wider text-[9px] font-semibold">
                            <Clock size={11} /> Never
                          </span>
                        )}
                      </td>

                      {/* Column 6: Edit configuration settings */}
                      <td className="py-4.5 px-6 text-center">
                        <button
                          onClick={() => handleOpenEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-xl transition-colors inline-flex items-center justify-center cursor-pointer"
                          title="Modify user specifications"
                        >
                          <Edit size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit User Modal Dialog Slider */}
      <AnimatePresence>
        {selectedUser && (
          <>
            {/* Backdrop Blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 cursor-pointer"
            />

            {/* Slider container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-100 dark:border-slate-800 z-50 flex flex-col justify-between text-left"
            >
              {/* Modal header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide">
                    Configure User Node
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider mt-0.5">
                    Modifying specifications for {selectedUser.email}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-2.5 py-1 text-[10px] font-black uppercase border border-slate-200 dark:border-slate-700/80 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-slate-400 hover:text-slate-600 transition-colors"
                >
                  ESC
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleUpdateSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Subscription Plan Level */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-widest mb-2">
                    SaaS Pricing Plan level
                  </label>
                  <select
                    value={editPlanType}
                    onChange={(e) => setEditPlanType(e.target.value)}
                    className="block w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none dark:text-white"
                  >
                    <option value="trial">Trial</option>
                    <option value="starter">Starter / Solo</option>
                    <option value="professional">Professional / Agency</option>
                    <option value="enterprise">Enterprise / Scale</option>
                    <option value="free">Free Limit</option>
                  </select>
                </div>

                {/* 2. Plan Status */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-widest mb-2">
                    Billing Status
                  </label>
                  <select
                    value={editPlanStatus}
                    onChange={(e) => setEditPlanStatus(e.target.value)}
                    className="block w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none dark:text-white"
                  >
                    <option value="trialing">Trialing</option>
                    <option value="active">Active (Subscribed)</option>
                    <option value="past_due">Past Due (Unpaid)</option>
                    <option value="canceled">Canceled / Incomplete</option>
                  </select>
                </div>

                {/* 3. Account / Node Limits */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-widest mb-2">
                    LinkedIn Node accounts limit
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={editAccountsLimit}
                    onChange={(e) => setEditAccountsLimit(e.target.value)}
                    className="block w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none dark:text-white"
                  />
                  <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 uppercase font-semibold">Maximum number of LinkedIn channels they can link concurrently.</p>
                </div>

                {/* 4. Trial Expiration Date */}
                {editPlanType === 'trial' && (
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-widest mb-2">
                      Trial expiration date
                    </label>
                    <input
                      type="date"
                      value={editTrialEnds}
                      onChange={(e) => setEditTrialEnds(e.target.value)}
                      className="block w-full py-3 px-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-semibold focus:outline-none dark:text-white"
                    />
                  </div>
                )}

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* 5. User role authorization */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-550 tracking-widest mb-2">
                    Super Admin role authority
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-bold uppercase tracking-wider text-slate-600 dark:text-slate-450">
                      <input
                        type="radio"
                        name="userRole"
                        value="user"
                        checked={editRole === 'user'}
                        onChange={() => setEditRole('user')}
                        className="w-4 h-4 text-blue-600"
                      />
                      Standard User
                    </label>
                    <label className="flex items-center gap-2 text-xs cursor-pointer font-bold uppercase tracking-wider text-slate-600 dark:text-slate-450">
                      <input
                        type="radio"
                        name="userRole"
                        value="admin"
                        checked={editRole === 'admin'}
                        onChange={() => setEditRole('admin')}
                        className="w-4 h-4 text-red-650"
                      />
                      Super Admin
                    </label>
                  </div>
                </div>
              </form>

              {/* Modal footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateSubmit}
                  disabled={modalLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {modalLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                  <span>Save changes</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
