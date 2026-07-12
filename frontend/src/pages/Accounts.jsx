import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Users, Terminal, X, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import AccountCard from '../components/AccountCard';
import ConnectLinkedInModal from '../components/ConnectLinkedInModal';

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const [selectedAccountForLogs, setSelectedAccountForLogs] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  async function fetchAccounts() {
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch accounts:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAccountLogs(accountId) {
    setLogsLoading(true);
    try {
      const res = await axios.get(`/api/analytics/activity-log?limit=30&account_id=${accountId}`);
      setLogsList(res.data.data || []);
    } catch (e) {
      console.error('Failed to fetch account logs:', e);
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => { 
    fetchAccounts(); 
  }, []);

  useEffect(() => {
    if (selectedAccountForLogs) {
      fetchAccountLogs(selectedAccountForLogs.id);
    } else {
      setLogsList([]);
    }
  }, [selectedAccountForLogs]);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen text-left relative overflow-hidden">
      
      {/* Dynamic ambient blur mesh */}
      <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-blue-500 to-indigo-500 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-emerald-500 to-purple-500 pointer-events-none" />

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="text-blue-600 dark:text-blue-400" size={28} strokeWidth={2.5} />
            LinkedIn Asset Nodes
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">Manage proxy-gated sender profiles and limits</p>
        </div>
        
        <button
          onClick={() => setShowConnect(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95 shrink-0"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Link New Node</span>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="relative z-10">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[420px] bg-white dark:bg-slate-900/40 rounded-[32px] animate-pulse border border-slate-100 dark:border-slate-800/85" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900/40 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800/80 p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100 dark:border-slate-700/50">
              <Users size={36} className="text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">No active nodes connected</h3>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-2 max-w-sm mx-auto font-semibold uppercase tracking-wider leading-relaxed">
              Link your professional profiles to begin safety-optimized outreach.
            </p>
            
            <button
              onClick={() => setShowConnect(true)}
              className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              Connect My First Profile
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {accounts.map(acc => (
              <AccountCard 
                key={acc.id} 
                account={acc} 
                onUpdate={fetchAccounts} 
                onOpenLogs={setSelectedAccountForLogs}
                onOpenReauth={() => setShowConnect(true)}
              />
            ))}
          </div>
        )}
      </div>

      {showConnect && (
        <ConnectLinkedInModal 
          onClose={() => setShowConnect(false)} 
          onConnected={fetchAccounts} 
        />
      )}

      {/* ─── SIDE-OVER ACTIVITY LOGS DRAWER ────────────────────────────────── */}
      <AnimatePresence>
        {selectedAccountForLogs && (
          <>
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAccountForLogs(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 cursor-pointer"
            />

            {/* Sidebar drawer container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-100 dark:border-slate-800 z-50 flex flex-col justify-between text-left"
            >
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Terminal size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-855 dark:text-slate-100 uppercase tracking-wide">
                      {selectedAccountForLogs.name} Logs
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                      Inspect live action events for this node
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchAccountLogs(selectedAccountForLogs.id)}
                    disabled={logsLoading}
                    className="p-2 text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                    title="Refresh logs"
                  >
                    <RefreshCw size={15} className={logsLoading ? 'animate-spin' : ''} />
                  </button>
                  <button
                    onClick={() => setSelectedAccountForLogs(null)}
                    className="p-2 text-slate-450 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Drawer Content (Console/Terminal Logs List) */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-950 font-mono text-[10px] space-y-4">
                {logsLoading && logsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 uppercase tracking-widest text-[9px]">Querying log stream...</p>
                  </div>
                ) : logsList.length === 0 ? (
                  <div className="text-center py-20 text-slate-600 uppercase tracking-widest text-[9px]">
                    No activity recorded for this node yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {logsList.map((log) => {
                      const isSuccess = log.status === 'success';
                      const timeStr = log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '00:00:00';
                      
                      return (
                        <div key={log.id} className="border-b border-slate-900 pb-2.5 last:border-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-2 pr-4">
                              <span className="text-slate-500">[{timeStr}]</span>
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                                isSuccess ? 'bg-emerald-950/40 text-emerald-400' : 'bg-rose-950/40 text-rose-400'
                              }`}>
                                {log.action_type}
                              </span>
                            </div>
                            <span className={`text-[8px] font-black uppercase tracking-wider shrink-0 ${
                              isSuccess ? 'text-emerald-500' : 'text-rose-500'
                            }`}>
                              {log.status}
                            </span>
                          </div>
                          
                          <p className="text-slate-350 mt-1.5 leading-relaxed">
                            {log.error_message || log.message_preview || 'Action completed successfully.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-between items-center text-xs">
                <span className="text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider text-[9px]">
                  Connection ID: {selectedAccountForLogs.unipile_account_id?.slice(0, 10)}...
                </span>
                <button
                  onClick={() => setSelectedAccountForLogs(null)}
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest shadow cursor-pointer hover:opacity-90"
                >
                  Close Console
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
