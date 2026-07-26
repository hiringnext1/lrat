import { useEffect, useState } from 'react';
import { ShieldCheck, Plus, Users, Terminal, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import AccountCard from '../components/AccountCard';
import ConnectLinkedInModal from '../components/ConnectLinkedInModal';
import { GlassCard, PageHeader, PrimaryBtn, EmptyState, LoadingSpinner, PageBg, PageStyle } from '../components/PageShell';

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
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchAccountLogs(accountId) {
    setLogsLoading(true);
    try {
      const res = await axios.get(`/api/analytics/activity-log?limit=30&account_id=${accountId}`);
      setLogsList(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLogsLoading(false); }
  }

  useEffect(() => { fetchAccounts(); }, []);
  useEffect(() => {
    if (selectedAccountForLogs) fetchAccountLogs(selectedAccountForLogs.id);
    else setLogsList([]);
  }, [selectedAccountForLogs]);

  const activeCount = accounts.filter(a => a.status === 'active').length;
  const todayTotal = accounts.reduce((s, a) => s + (a.today_connections || 0), 0);

  return (
    <div className={`p-6 space-y-6 ${PageBg}`} style={PageStyle}>

      <PageHeader
        icon={ShieldCheck}
        title="LinkedIn Accounts"
        subtitle="Manage proxy-gated sender profiles and limits"
        accent="text-blue-400"
        actions={
          <PrimaryBtn onClick={() => setShowConnect(true)} id="link-account-btn">
            <Plus size={13} strokeWidth={3} /> Link Account
          </PrimaryBtn>
        }
      />

      {/* Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Accounts', val: accounts.length, color: 'text-blue-400' },
          { label: 'Active', val: activeCount, color: 'text-emerald-400' },
          { label: 'Paused', val: accounts.length - activeCount, color: 'text-amber-400' },
          { label: 'Sent Today', val: todayTotal, color: 'text-purple-400' },
        ].map(({ label, val, color }) => (
          <GlassCard key={label} className="p-4">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{label}</p>
            <p className={`text-2xl font-black mt-1 ${color}`}>{val}</p>
          </GlassCard>
        ))}
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <LoadingSpinner text="Syncing accounts..." />
      ) : accounts.length === 0 ? (
        <GlassCard className="py-8">
          <EmptyState
            icon={Users}
            title="No accounts linked"
            subtitle="Link your LinkedIn profiles to begin safety-optimized automated outreach."
            action={<PrimaryBtn onClick={() => setShowConnect(true)}><Plus size={13} /> Connect First Profile</PrimaryBtn>}
          />
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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

      {showConnect && (
        <ConnectLinkedInModal onClose={() => setShowConnect(false)} onConnected={fetchAccounts} />
      )}

      {/* Logs Drawer */}
      <AnimatePresence>
        {selectedAccountForLogs && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedAccountForLogs(null)}
              className="fixed inset-0 z-40 cursor-pointer"
              style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 flex flex-col"
              style={{ background: '#0D1221', borderLeft: '1px solid rgba(255,255,255,0.08)' }}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-5 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
                    <Terminal size={15} className="text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">{selectedAccountForLogs.name}</h3>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Activity Logs</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => fetchAccountLogs(selectedAccountForLogs.id)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-all">
                    <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                  </button>
                  <button onClick={() => setSelectedAccountForLogs(null)} className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-white/8 transition-all">
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Logs */}
              <div className="flex-1 overflow-y-auto p-4 font-mono text-[10px] space-y-2" style={{ background: '#050810' }}>
                {logsLoading && logsList.length === 0 ? (
                  <div className="flex items-center justify-center py-16 gap-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-slate-500 uppercase tracking-widest text-[9px]">Loading logs...</span>
                  </div>
                ) : logsList.length === 0 ? (
                  <p className="text-center py-16 text-slate-600 uppercase tracking-widest text-[9px]">No activity recorded yet.</p>
                ) : logsList.map(log => {
                  const isOk = log.status === 'success';
                  const time = log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour12: false }) : '';
                  return (
                    <div key={log.id} className="border-b border-white/4 pb-2 last:border-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-slate-600">[{time}]</span>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${isOk ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {log.action_type}
                        </span>
                      </div>
                      <p className="text-slate-400 leading-relaxed">{log.error_message || log.message_preview || 'Action completed.'}</p>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-white/8 flex justify-between items-center">
                <span className="text-[9px] text-slate-600 font-mono">ID: {selectedAccountForLogs.unipile_account_id?.slice(0, 12)}...</span>
                <button onClick={() => setSelectedAccountForLogs(null)} className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-wider transition-colors">
                  Close ×
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
