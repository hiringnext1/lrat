import { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Play, Pause, Activity, UserCheck, MessageSquare } from 'lucide-react';
import axios from 'axios';
import socket from '../socket';

const ACTION_COLORS = {
  connection_sent: 'bg-blue-500 shadow-blue-500/50',
  jd_sent: 'bg-purple-500 shadow-purple-500/50',
  follow_up_sent: 'bg-amber-500 shadow-amber-500/50',
  reply_detected: 'bg-emerald-500 shadow-emerald-500/50',
  error: 'bg-rose-500 shadow-rose-500/50',
  warning: 'bg-amber-400 shadow-amber-400/50',
  limit_reached: 'bg-rose-600 shadow-rose-600/50',
};

function ProgressBar({ value, max }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct > 90 ? 'bg-rose-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
      <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function StatusDot({ status, isActive }) {
  if (!isActive) return <span className="w-2 h-2 rounded-full bg-slate-350 dark:bg-slate-650 shrink-0" />;
  if (status === 'warning') return <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />;
  if (status === 'paused') return <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />;
  return <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />;
}

export default function SafetyMonitor({ accounts, onToggleAccount }) {
  const [activityLog, setActivityLog] = useState([]);

  useEffect(() => {
    axios.get('/api/analytics/activity-log?limit=50').then((r) => setActivityLog(r.data.data || []));

    const handler = (data) => {
      setActivityLog((prev) => [{
        id: Date.now(),
        account_name: data.account_id,
        lead_name: data.lead_name,
        action_type: data.action_type,
        status: data.status,
        created_at: data.timestamp,
      }, ...prev.slice(0, 49)]);
    };

    socket.on('activity_update', handler);
    return () => socket.off('activity_update', handler);
  }, []);

  const warningAccounts = accounts.filter((a) => a.status === 'warning' || !a.is_active);

  return (
    <div className="space-y-6 text-left">
      
      {/* Alert Header box */}
      {warningAccounts.length > 0 ? (
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-[24px] p-5 flex items-start gap-4 animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-455 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-extrabold text-rose-700 dark:text-rose-450 text-sm uppercase tracking-wide">{warningAccounts.length} sender accounts restricted or paused</p>
            <p className="text-xs text-rose-600/80 dark:text-rose-400 mt-1 font-semibold leading-relaxed">
              Verify LinkedIn credentials for: <span className="font-black text-rose-800 dark:text-rose-300">{warningAccounts.map((a) => a.name).join(', ')}</span> to avoid complete outreach lockouts.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-[24px] p-5 flex items-center gap-4 animate-in fade-in duration-300">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 flex items-center justify-center shrink-0">
            <ShieldCheck size={20} strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-extrabold text-emerald-700 dark:text-emerald-400 text-sm uppercase tracking-wide">LinkedIn automation running securely</p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-450 mt-0.5 font-semibold">All configured candidate senders operating within limits.</p>
          </div>
        </div>
      )}

      {/* Accounts Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
        {accounts.map((account) => {
          const effectiveLimit =
            account.warmup_week === 0 ? 0
            : account.warmup_week === 1 ? 5
            : account.warmup_week === 2 ? 10
            : account.warmup_week === 3 ? 15
            : Math.min(account.daily_limit, 25);

          const lastActionAgo = account.last_action_at
            ? (() => {
                const diff = Date.now() - new Date(account.last_action_at).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 60) return `${mins}m ago`;
                return `${Math.floor(mins / 60)}h ago`;
              })()
            : 'Never active';

          return (
            <div key={account.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-5 space-y-4 shadow-[0_4px_15px_rgb(0,0,0,0.002)]">
              
              {/* Account Title Switch */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <StatusDot status={account.status} isActive={account.is_active} />
                  <span className="font-extrabold text-slate-800 dark:text-slate-150 text-xs truncate leading-snug">{account.name}</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => onToggleAccount?.(account)}
                  className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 ${
                    account.is_active
                      ? 'border-amber-200 text-amber-600 bg-amber-50/50 hover:bg-amber-100/50 dark:border-amber-900/30 dark:text-amber-400 dark:bg-amber-950/20'
                      : 'border-emerald-200 text-emerald-600 bg-emerald-50/50 hover:bg-emerald-100/50 dark:border-emerald-900/30 dark:text-emerald-400 dark:bg-emerald-950/20'
                  }`}
                >
                  {account.is_active ? (
                    <>
                      <Pause size={10} strokeWidth={2.5} />
                      <span>Pause Node</span>
                    </>
                  ) : (
                    <>
                      <Play size={10} strokeWidth={2.5} />
                      <span>Resume</span>
                    </>
                  )}
                </button>
              </div>

              {/* Progress metrics */}
              <div className="space-y-3.5">
                <div>
                  <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                    <span>Daily outreach</span>
                    <span className={account.today_connections / (effectiveLimit || 1) > 0.9 ? 'text-rose-500 font-extrabold' : 'text-slate-700 dark:text-slate-300'}>
                      {account.today_connections} / {effectiveLimit || 0}
                    </span>
                  </div>
                  <ProgressBar value={account.today_connections} max={effectiveLimit || 1} />
                </div>
                
                <div>
                  <div className="flex justify-between text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                    <span>Weekly outreach</span>
                    <span className="text-slate-700 dark:text-slate-300">{account.week_connections} / {account.weekly_limit}</span>
                  </div>
                  <ProgressBar value={account.week_connections} max={account.weekly_limit} />
                </div>
              </div>

              {/* Warmup state Footer */}
              <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 pt-2.5 border-t border-slate-50 dark:border-slate-850/50">
                <span className="px-2 py-0.5 bg-slate-50 dark:bg-slate-850 rounded border border-slate-100 dark:border-slate-800">
                  {account.warmup_week === 0
                    ? 'Warming inactive'
                    : account.warmup_week >= 4
                    ? 'Fully warmed'
                    : `Warmup: Wk ${account.warmup_week}/4`}
                </span>
                <span>Active: {lastActionAgo}</span>
              </div>

            </div>
          );
        })}
      </div>

      {/* Live Activity panel */}
      <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-100 dark:border-slate-800/80 overflow-hidden shadow-sm">
        <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex items-center gap-2">
          <Activity size={16} className="text-blue-500" />
          <div className="flex-1">
            <h3 className="text-xs font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider">Live System activity stream</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide mt-0.5">Real-time Unipile API execution records</p>
          </div>
        </div>
        
        <div className="divide-y divide-slate-50 dark:divide-slate-850/50 max-h-80 overflow-y-auto">
          {activityLog.length === 0 && (
            <div className="p-10 text-center text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">Waiting for scheduler logs...</div>
          )}
          
          {activityLog.map((log, i) => (
            <div key={log.id || i} className="flex items-start gap-4 px-6 py-3.5 hover:bg-slate-50/30 dark:hover:bg-slate-900/10">
              <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 animate-ping ${ACTION_COLORS[log.action_type] || 'bg-slate-400'}`} />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{log.account_name || `Account ID ${log.account_id}`}</span>
                  <span className="text-slate-350 dark:text-slate-600 text-xs font-bold">→</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{(log.action_type || '').replace(/_/g, ' ')}</span>
                  {log.lead_name && (
                    <span className="text-[10px] font-black text-blue-650 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded-md">
                      Candidate: {log.lead_name}
                    </span>
                  )}
                </div>
                {log.message_preview && (
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate mt-1 italic">"{log.message_preview}"</p>
                )}
              </div>
              
              <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-550 shrink-0">
                {log.created_at ? new Date(log.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
