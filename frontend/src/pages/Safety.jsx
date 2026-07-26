import { useEffect, useState } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import SafetyMonitor from '../components/SafetyMonitor';
import { GlassCard, PageHeader, GhostBtn, EmptyState, LoadingSpinner, PageBg, PageStyle } from '../components/PageShell';

const RULES = [
  'Max 25 connections per account daily',
  'Max 150 connection requests weekly',
  'Outreach window strictly active 8 AM – 8 PM UTC/IST',
  'Minimum 2 minute delay cooldown between steps',
  'Maximum 8 action triggers per account hourly',
  'Cross-account duplicate prospect verification',
  'Automatic pause sequence on restriction signals',
  'Hard-cap limit of 2 follow-up messages max',
  'Automated new nodes warmup increments',
  'Automatic weekend pause (unless weekends enabled)',
];

export default function Safety() {
  const [accounts, setAccounts] = useState([]);
  const [failedLogs, setFailedLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const [accs, logs] = await Promise.all([
        axios.get('/api/accounts'),
        axios.get('/api/analytics/activity-log', { params: { status: 'failed', limit: 20 } }),
      ]);
      setAccounts(accs.data.data || []);
      setFailedLogs(logs.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function toggleAccount(account) {
    await axios.put(`/api/accounts/${account.id}`, { is_active: account.is_active ? 0 : 1, status: account.is_active ? 'paused' : 'active' });
    fetchData();
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const healthyCount = accounts.filter(a => a.status === 'active').length;
  const overallScore = accounts.length > 0 ? Math.round((healthyCount / accounts.length) * 100) : 100;

  return (
    <div className={`p-6 space-y-6 ${PageBg}`} style={PageStyle}>

      <PageHeader
        icon={ShieldCheck}
        title="Safety Monitor"
        subtitle="Account health, limits and automated protection rules"
        accent="text-emerald-400"
        actions={
          <GhostBtn onClick={fetchData}><RefreshCw size={13} />Refresh</GhostBtn>
        }
      />

      {/* Safety Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5 md:col-span-1">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90">
                <circle cx="40" cy="40" r="34" stroke="rgba(255,255,255,0.06)" strokeWidth="6" fill="none" />
                <circle cx="40" cy="40" r="34" stroke={overallScore >= 80 ? '#10b981' : overallScore >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="6"
                  strokeDasharray={2 * Math.PI * 34} strokeDashoffset={2 * Math.PI * 34 * (1 - overallScore / 100)}
                  strokeLinecap="round" fill="none" className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-white">{overallScore}%</span>
              </div>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Overall Safety Score</p>
              <p className={`text-xl font-black mt-1 ${overallScore >= 80 ? 'text-emerald-400' : overallScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                {overallScore >= 80 ? 'Healthy' : overallScore >= 50 ? 'Warning' : 'At Risk'}
              </p>
              <p className="text-[10px] text-slate-500 mt-1">{healthyCount} of {accounts.length} accounts active</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <CheckCircle2 size={18} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Active Nodes</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{healthyCount}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <AlertOctagon size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Recent Errors</p>
            <p className="text-2xl font-black text-red-400 mt-0.5">{failedLogs.length}</p>
          </div>
        </GlassCard>
      </div>

      {/* Safety Rules */}
      <GlassCard className="p-5">
        <h2 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4">
          <ShieldCheck size={13} className="text-emerald-400" />
          Hard-Coded Safety Rules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {RULES.map(rule => (
            <div key={rule} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.1)' }}>
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
              <span className="text-[10px] text-slate-300 font-medium">{rule}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Account Safety Monitor */}
      <GlassCard className="p-5">
        <h2 className="text-[11px] font-black text-white uppercase tracking-widest mb-4">Account Status</h2>
        {loading ? (
          <LoadingSpinner text="Syncing safety bounds..." />
        ) : accounts.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No accounts linked" subtitle="Configure accounts inside Accounts tab to begin monitoring." />
        ) : (
          <SafetyMonitor accounts={accounts} onToggleAccount={toggleAccount} />
        )}
      </GlassCard>

      {/* Error Log Table */}
      {failedLogs.length > 0 && (
        <GlassCard className="overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/8">
            <AlertOctagon size={14} className="text-red-400" />
            <h2 className="text-[11px] font-black text-white uppercase tracking-widest">Error & Warning Logs ({failedLogs.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }} className="border-b border-white/6">
                  {['Timestamp', 'Sender Node', 'Action', 'Error'].map(h => (
                    <th key={h} className="px-5 py-3 text-slate-500 font-black uppercase tracking-widest text-[8px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failedLogs.map(log => (
                  <tr key={log.id} className="border-b border-white/4 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">{new Date(log.created_at).toLocaleString('en-IN', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short' })}</td>
                    <td className="px-5 py-3 font-bold text-white">{log.account_name || 'System'}</td>
                    <td className="px-5 py-3 font-black text-[8px] uppercase tracking-wider text-slate-400">{log.action_type}</td>
                    <td className="px-5 py-3 text-red-400 max-w-xs truncate" title={log.error_message}>{log.error_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
