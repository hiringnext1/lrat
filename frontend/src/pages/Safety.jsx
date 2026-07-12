import { useEffect, useState } from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import SafetyMonitor from '../components/SafetyMonitor';

export default function Safety() {
  const [accounts, setAccounts] = useState([]);
  const [failedLogs, setFailedLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function fetchAccounts() {
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchFailedLogs() {
    try {
      const res = await axios.get('/api/analytics/activity-log', { params: { status: 'failed', limit: 20 } });
      setFailedLogs(res.data.data || []);
    } catch (e) { console.error(e); }
  }

  async function toggleAccount(account) {
    await axios.put(`/api/accounts/${account.id}`, {
      is_active: account.is_active ? 0 : 1,
      status: account.is_active ? 'paused' : 'active',
    });
    fetchAccounts();
  }

  useEffect(() => {
    fetchAccounts();
    fetchFailedLogs();
    const interval = setInterval(() => {
      fetchAccounts();
      fetchFailedLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen text-left relative overflow-hidden">
      
      {/* Background ambient glowing mesh */}
      <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-10 dark:opacity-5 bg-gradient-to-br from-emerald-500 to-indigo-500 pointer-events-none" />

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="text-emerald-500 dark:text-emerald-400" size={28} strokeWidth={2.5} />
            Safety & Limits Control
          </h1>
          <p className="text-xs text-slate-400 font-semibold uppercase mt-0.5 tracking-wider">Monitor account safety metrics and automated restrictions</p>
        </div>
      </div>

      {/* Rules Board Grid */}
      <div className="bg-white dark:bg-slate-900/60 rounded-[28px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.002)] relative z-10">
        <h2 className="text-xs font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mb-4">Hard-Coded Safe outreach rules</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {[
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
          ].map((rule) => (
            <div 
              key={rule} 
              className="text-xs font-semibold text-slate-600 dark:text-slate-355 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850 px-4 py-3 rounded-2xl flex items-center gap-3 transition-colors hover:border-slate-205 dark:hover:border-slate-800"
            >
              <div className="w-5 h-5 rounded-lg bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={13} strokeWidth={2.5} />
              </div>
              <span>{rule}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading & Monitor Area */}
      <div className="relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-3 border-blue-650 dark:border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Syncing safety bounds...</p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-16 text-center">
            <p className="text-slate-405 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">No active sender nodes detected</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-1 uppercase tracking-wide">Configure account details inside Accounts to begin.</p>
          </div>
        ) : (
          <SafetyMonitor accounts={accounts} onToggleAccount={toggleAccount} />
        )}
      </div>

      {/* System Errors log panel */}
      {failedLogs.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm relative z-10">
          <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center gap-2">
            <AlertOctagon size={16} className="text-rose-500" />
            <h2 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">Active restriction errors & warning logs</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/20 dark:bg-slate-950/20 text-slate-450 dark:text-slate-500 font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-850">
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">LinkedIn Sender Node</th>
                  <th className="px-6 py-3">Trigger Action</th>
                  <th className="px-6 py-3">Error Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {failedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 font-semibold text-slate-655 dark:text-slate-350">
                    <td className="px-6 py-3 text-slate-400 dark:text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </td>
                    <td className="px-6 py-3 font-extrabold text-slate-800 dark:text-slate-200">{log.account_name || 'System Scheduler'}</td>
                    <td className="px-6 py-3 text-[10px] font-black uppercase tracking-wider">{log.action_type}</td>
                    <td className="px-6 py-3 text-rose-600 dark:text-rose-450 max-w-sm truncate" title={log.error_message}>{log.error_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
