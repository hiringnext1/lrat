import React, { useState } from 'react';
import { 
  ShieldCheck, Trash2, Zap, Activity, Clock, 
  Pause, Play, AlertCircle, ExternalLink, RefreshCw, Save, Terminal, Key
} from 'lucide-react';
import axios from 'axios';

export default function AccountCard({ account, onUpdate, onOpenLogs, onOpenReauth }) {
  const [updating, setSaving] = useState(false);
  const [customLimit, setCustomLimit] = useState(account.daily_limit || 20);
  const [warmupWeek, setWarmupWeek] = useState(account.warmup_week || 1);

  // Health logic
  const isRestricted = account.status === 'restricted' || account.status === 'warning';
  const isHealthy = account.status === 'active' && account.is_active;

  async function toggleActive() {
    try {
      const next = !account.is_active;
      await axios.put(`/api/accounts/${account.id}/status`, { is_active: next });
      onUpdate();
    } catch (e) {
      alert('Failed to toggle status');
    }
  }

  async function saveLimit() {
    setSaving(true);
    try {
      await axios.put(`/api/accounts/${account.id}`, { 
        daily_limit: customLimit,
        warmup_week: warmupWeek
      });
      onUpdate();
    } catch (e) {
      alert('Failed to update limit');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${account.name}? This will remove it from Unipile as well.`)) return;
    
    setSaving(true);
    try {
      await axios.delete(`/api/accounts/${account.id}`);
      onUpdate();
    } catch (e) {
      console.error('[Frontend] Delete failed:', e);
      alert('Deletion failed. Please check backend logs.');
    } finally {
      setSaving(false);
    }
  }

  // Get status pill colors dynamically
  const getStatusColor = () => {
    if (isHealthy) return 'bg-emerald-50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
    if (isRestricted) return 'bg-rose-50 text-rose-600 border-rose-100/50 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30';
    return 'bg-amber-50 text-amber-600 border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
  };

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-700/80 transition-all duration-300 group overflow-hidden flex flex-col relative text-left">
      {/* Glow highlight based on health */}
      <div className={`absolute top-0 right-0 w-32 h-32 -mr-10 -mt-10 rounded-full blur-3xl opacity-20 bg-gradient-to-tr ${
        isHealthy ? 'from-emerald-400 to-transparent' : isRestricted ? 'from-rose-400 to-transparent' : 'from-amber-400 to-transparent'
      }`} />

      {/* Profile Header */}
      <div className="p-6 pb-5 flex items-start gap-4 border-b border-slate-50 dark:border-slate-800/80 relative z-10">
        <div className="w-16 h-16 rounded-[22px] bg-slate-50 dark:bg-slate-800 flex-shrink-0 overflow-hidden border border-slate-100 dark:border-slate-700 shadow-inner flex items-center justify-center relative">
          {account.photo_url ? (
            <img src={account.photo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 uppercase">
              {account.name?.charAt(0)}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 group/name">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 truncate tracking-tight">
              {account.linkedin_url ? (
                <a 
                  href={account.linkedin_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1.5"
                >
                  {account.name}
                  <ExternalLink size={12} className="text-slate-400 opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                </a>
              ) : (
                account.name
              )}
            </h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold truncate mt-0.5">{account.email || 'LinkedIn Member Profile'}</p>
          
          <div className="flex items-center gap-2 mt-2.5">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${getStatusColor()}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : isRestricted ? 'bg-rose-500' : 'bg-amber-500'}`} />
              {account.status}
            </span>
          </div>
        </div>

        <button
          onClick={() => onOpenLogs && onOpenLogs(account)}
          className="p-2 text-slate-350 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all opacity-40 group-hover:opacity-100 mr-1"
          title="View Live Node Logs"
        >
          <Terminal size={15} />
        </button>

        <button 
          onClick={handleDelete} 
          className="p-2 text-slate-350 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all opacity-40 group-hover:opacity-100"
          title="Delete account node"
        >
          <Trash2 size={15} />
        </button>

      </div>

      {/* Re-authenticate Warning Banner */}
      {isRestricted && (
        <div className="px-6 py-2.5 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between gap-3 select-none">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertCircle size={14} className="shrink-0" />
            <span className="text-[9px] font-black uppercase tracking-wider">Session restricted / Expired</span>
          </div>
          <button
            onClick={() => onOpenReauth && onOpenReauth(account)}
            className="flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-all cursor-pointer shrink-0 shadow-sm"
          >
            <Key size={10} />
            <span>Re-auth Node</span>
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="px-6 py-4.5 grid grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-50 dark:border-slate-800/80">
        <div className="text-center">
          <p className="text-xl font-black text-slate-850 dark:text-slate-100 leading-none">{account.today_connections || 0}</p>
          <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">Sent Today</p>
        </div>
        <div className="text-center border-x border-slate-100 dark:border-slate-800/80">
          <p className="text-xl font-black text-slate-850 dark:text-slate-100 leading-none">{account.week_connections || 0}</p>
          <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">This Week</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-black text-slate-850 dark:text-slate-100 leading-none">{account.health_score || 0}%</p>
          <p className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">Node Health</p>
        </div>
      </div>

      {/* Linked Campaigns Badges */}
      <div className="px-6 py-3 bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-50 dark:border-slate-800/80 flex items-center gap-2 flex-wrap select-none">
        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mr-1 shrink-0">Linked:</span>
        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pr-1">
          {account.campaigns && account.campaigns.length > 0 ? (
            account.campaigns.map((camp) => (
              <span 
                key={camp.id} 
                className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                  camp.status === 'active' 
                    ? 'bg-emerald-50/50 border-emerald-100/50 text-emerald-600 dark:bg-emerald-950/10 dark:border-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-slate-100/50 border-slate-200/50 text-slate-500 dark:bg-slate-800/40 dark:border-slate-700/30'
                }`}
              >
                {camp.name}
              </span>
            ))
          ) : (
            <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border bg-rose-50/50 border-rose-100/50 text-rose-500 dark:bg-rose-950/10 dark:border-rose-900/30">
              No Campaigns (Stalled)
            </span>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      <div className="p-6 space-y-6 flex-1 relative z-10">
        
        {/* Connection Throttle Limit */}
        <div className={`space-y-3.5 transition-all duration-300 ${warmupWeek < 3 ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={13} className="text-amber-500" /> Throttle Limits
            </label>
            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
              {warmupWeek < 3 ? 'Auto (Locked)' : `${customLimit} / 25 daily`}
            </span>
          </div>
          
          <div className="relative flex items-center">
            <input 
              type="range" 
              min="1" 
              max="25" 
              value={customLimit} 
              onChange={(e) => setCustomLimit(parseInt(e.target.value))}
              disabled={warmupWeek < 3}
              className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
            />
          </div>
        </div>

        {/* Warmup Level Selector */}
        <div className="space-y-3">
          <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Activity size={13} className="text-emerald-500" /> Auto-Warmup Mode
          </label>
          
          <div className="grid grid-cols-4 gap-1.5 bg-slate-50 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/30">
            {[1, 2, 3, 4].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setWarmupWeek(w)}
                className={`py-2 rounded-xl text-[10px] font-black transition-all ${
                  warmupWeek === w 
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md shadow-blue-500/20' 
                    : 'text-slate-400 hover:text-slate-650 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                }`}
              >
                Lvl {w}
              </button>
            ))}
          </div>
          
          <p className="text-[10px] text-slate-400 dark:text-slate-550 font-medium italic mt-1.5 leading-relaxed">
            {warmupWeek === 1 && 'Level 1: Auto-locked 5 connections/day (Safe start)'}
            {warmupWeek === 2 && 'Level 2: Auto-locked 10 connections/day (Active Warmup)'}
            {warmupWeek === 3 && `Level 3: Custom Throttle up to 15 (Active: ${Math.min(customLimit, 15)})`}
            {warmupWeek >= 4 && `Level 4: Custom Throttle up to 25 (Active: ${customLimit})`}
          </p>
          {account.warmup_started_at && (
            <p className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mt-1 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
              <span>Warmup active: {Math.max(0, Math.floor((new Date() - new Date(account.warmup_started_at)) / (1000 * 60 * 60 * 24)))} days elapsed (Week {Math.min(4, Math.floor(Math.max(0, Math.floor((new Date() - new Date(account.warmup_started_at)) / (1000 * 60 * 60 * 24))) / 7) + 1)}/4)</span>
            </p>
          )}
        </div>

        {/* Pulse Check Timing */}
        <div className="space-y-1.5 pt-3.5 border-t border-slate-50 dark:border-slate-800/80">
          <label className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <Clock size={13} className="text-blue-500" /> Last Active Queue Check
          </label>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 italic">
            {account.last_action_at 
              ? new Date(account.last_action_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
              : 'Agent warming up...'
            }
          </p>
        </div>
      </div>

      {/* Footer Controls */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-800/80 flex items-center gap-3">
        <button 
          onClick={toggleActive}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
            account.is_active 
              ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400' 
              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400'
          }`}
        >
          {account.is_active ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          <span>{account.is_active ? 'Pause Node' : 'Activate'}</span>
        </button>
        
        <button 
          onClick={saveLimit}
          disabled={updating || (customLimit === account.daily_limit && warmupWeek === account.warmup_week)}
          className="px-5 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-slate-850 dark:hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1.5"
        >
          {updating ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
          <span>Save</span>
        </button>
      </div>
    </div>
  );
}
