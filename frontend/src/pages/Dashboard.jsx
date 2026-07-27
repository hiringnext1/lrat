import React, { useEffect, useState } from 'react';
import {
  Users, UserCheck, MessageSquare, TrendingUp, Activity,
  Target, Zap, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight,
  Megaphone, CheckCircle2, Play, Globe, Clock, RefreshCw, Send,
  Check, Coffee, ChevronDown, SlidersHorizontal, ShieldCheck,
  LayoutDashboard, Inbox, Wifi, WifiOff, BarChart2
} from 'lucide-react';
import axios from 'axios';
import socket from '../socket';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from 'recharts';

// ─── DESIGN TOKENS ──────────────────────────────────────────────────────────
const CARD = {
  base: 'rounded-2xl border p-5',
  bg: 'bg-white/4',
  border: 'border-white/8',
  hover: 'hover:bg-white/6 transition-all duration-200',
};

// ─── GLASS CARD ──────────────────────────────────────────────────────────────
function GlassCard({ children, className = '', style = {} }) {
  return (
    <div
      className={`rounded-2xl border border-white/8 ${className}`}
      style={{ background: 'rgba(13,18,33,0.7)', backdropFilter: 'blur(12px)', ...style }}
    >
      {children}
    </div>
  );
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ title, value, sub, icon: Icon, accent, trend, trendVal, sparkData }) {
  const colors = {
    blue:    { bg: 'rgba(59,130,246,0.1)',  text: '#60a5fa', stroke: '#3b82f6', fill: '#1d4ed8' },
    amber:   { bg: 'rgba(245,158,11,0.1)',  text: '#fbbf24', stroke: '#f59e0b', fill: '#92400e' },
    emerald: { bg: 'rgba(16,185,129,0.1)',  text: '#34d399', stroke: '#10b981', fill: '#065f46' },
    purple:  { bg: 'rgba(139,92,246,0.1)',  text: '#a78bfa', stroke: '#8b5cf6', fill: '#4c1d95' },
    indigo:  { bg: 'rgba(99,102,241,0.1)',  text: '#818cf8', stroke: '#6366f1', fill: '#312e81' },
  };
  const c = colors[accent] || colors.blue;
  const isUp = trend === 'up';
  const dummyData = [3, 7, 5, 9, 6, 11, 8].map(v => ({ v }));
  const chartData = sparkData?.length ? sparkData.map(v => ({ v })) : dummyData;

  return (
    <GlassCard className="flex flex-col justify-between min-h-[130px] p-5 group hover:border-white/15 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl" style={{ background: c.bg }}>
            <Icon size={15} style={{ color: c.text }} strokeWidth={2} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</span>
        </div>
        {trendVal && (
          <span className={`flex items-center gap-0.5 text-[9px] font-bold px-2 py-0.5 rounded-lg ${
            isUp ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {isUp ? <ArrowUpRight size={9} /> : <ArrowDownRight size={9} />}
            {trendVal}
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-black text-white mt-3 leading-none font-display" style={{fontVariantNumeric:'tabular-nums'}}>{value}</p>
        <p className="text-[10px] text-slate-500 font-medium mt-1">{sub}</p>
      </div>

      <div className="mt-3 h-8 opacity-60 group-hover:opacity-100 transition-opacity">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`sg-${accent}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c.stroke} stopOpacity={0.5} />
                <stop offset="100%" stopColor={c.stroke} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={c.stroke} strokeWidth={1.5} fill={`url(#sg-${accent})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GlassCard>
  );
}

// ─── CHART TOOLTIP ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 px-4 py-3 text-xs" style={{ background: '#0D1221', backdropFilter: 'blur(12px)' }}>
      <p className="text-slate-400 font-bold uppercase tracking-wider mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-6 font-semibold text-white">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-slate-300 capitalize">{p.dataKey}</span>
          </div>
          <span>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── FUNNEL BAR ──────────────────────────────────────────────────────────────
function FunnelRow({ label, value, max, color, icon: Icon, sub }) {
  const pct = Math.max((value / Math.max(max, 1)) * 100, 2);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2 text-slate-400">
          <Icon size={11} />
          <span className="font-bold uppercase tracking-wider">{label}</span>
        </div>
        <div className="text-right">
          <span className="font-black text-white">{value}</span>
          <span className="text-slate-600 ml-1">({sub})</span>
        </div>
      </div>
      <div className="h-7 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
          className="h-full rounded-xl flex items-center justify-end pr-3"
          style={{ background: `linear-gradient(90deg, ${color}aa, ${color})` }}
        >
          {pct > 15 && <span className="text-[9px] font-black text-white/70">{Math.round(pct)}%</span>}
        </motion.div>
      </div>
    </div>
  );
}

// ─── PROGRESS RING ───────────────────────────────────────────────────────────
function ProgressRing({ value, target }) {
  const r = 36, circ = 2 * Math.PI * r;
  const pct = Math.min(value / Math.max(target, 1), 1);
  const done = pct >= 1;
  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-24 h-24 -rotate-90">
        <circle cx="48" cy="48" r={r} stroke="rgba(255,255,255,0.06)" strokeWidth="8" fill="none" />
        <circle
          cx="48" cy="48" r={r}
          stroke={done ? '#10b981' : '#3b82f6'}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={circ - pct * circ}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-xl font-black text-white leading-none">{value}</p>
        <p className="text-[9px] text-slate-500 font-bold">/ {target}</p>
      </div>
    </div>
  );
}

// ─── ACTIVITY LOG ROW ────────────────────────────────────────────────────────
function LogRow({ log }) {
  const isError = log.status === 'failed' || log.error_message;
  const isReply = log.action_type === 'reply_received' || log.message_preview;
  const dot = isError ? '#f87171' : isReply ? '#34d399' : '#60a5fa';
  const typeLabel = (log.action_type || 'system').replace(/_/g, ' ');
  const time = log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Now';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0 group"
    >
      <div className="mt-1 shrink-0">
        <span className="block w-2 h-2 rounded-full" style={{ background: dot, boxShadow: `0 0 6px ${dot}66` }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-black text-white uppercase tracking-wider">{typeLabel}</span>
          <span className="text-[9px] text-slate-600 font-semibold shrink-0">{time}</span>
        </div>
        {log.lead_name && (
          <span className="text-[10px] text-blue-400 font-semibold">{log.lead_name}</span>
        )}
        <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed line-clamp-1">
          {log.message_preview || log.error_message || 'Step executed.'}
        </p>
      </div>
    </motion.div>
  );
}

// ─── NEXT TIMER ──────────────────────────────────────────────────────────────
function NextTimer({ targetDate }) {
  const [left, setLeft] = useState('');
  useEffect(() => {
    const calc = () => {
      let diff = new Date(targetDate).getTime() - Date.now();
      if (isNaN(diff) || diff <= 0) {
        diff = 120 * 1000 - (Math.abs(diff || 0) % (120 * 1000));
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(`${m}m ${s < 10 ? '0' : ''}${s}s`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  return (
    <div className="flex items-center justify-between w-full text-slate-400 text-[10px] font-bold uppercase tracking-wider">
      <div className="flex items-center gap-1.5">
        <Clock size={11} className="text-blue-400 animate-pulse" />
        <span>Next Connection Run</span>
      </div>
      <span className="text-blue-400 font-black bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{left}</span>
    </div>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState({
    total_leads: 0, sent_leads: 0, accepted_leads: 0, replied_leads: 0,
    connections_today: 0, connections_total: 0, daily_goal: 0,
    acceptance_rate: 0, reply_rate: 0, active_campaigns: 0,
    active_accounts: 0, next_action_at: null, is_resting_day: false,
  });
  const [trends, setTrends] = useState([]);
  const [activity, setActivity] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [engine, setEngine] = useState({ status: 'LOADING', data: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [consoleLogs, setConsoleLogs] = useState([
    { text: 'System initialized. Operational Terminal connected.', type: 'info', timestamp: new Date().toISOString() }
  ]);
  const [visibleMetrics, setVisibleMetrics] = useState({ sent: true, accepted: true, replied: true });
  const [dailySparkData, setDailySparkData] = useState([]);

  async function fetchDashboard() {
    try {
      const q = selectedCampaign ? `?campaign_id=${selectedCampaign}` : '';
      const qd = selectedCampaign ? `&campaign_id=${selectedCampaign}` : '';
      const [over, daily, trendRes, logs, status, accs, camps] = await Promise.all([
        axios.get('/api/analytics/overview' + q),
        axios.get('/api/analytics/daily?days=7' + qd),
        axios.get('/api/analytics/trends' + q),
        axios.get('/api/analytics/activity-log?limit=20' + qd),
        axios.get('/api/analytics/engine-status'),
        axios.get('/api/analytics/accounts'),
        axios.get('/api/analytics/campaigns'),
      ]);
      if (over.data?.success) setStats(over.data.data);
      if (daily.data?.success) setDailySparkData(daily.data.data.map(d => d.connections_sent));
      if (trendRes.data?.success) setTrends(trendRes.data.data);
      if (logs.data?.success) setActivity(logs.data.data);
      if (status.data?.status) setEngine(status.data);
      if (accs.data?.success) setAccounts(accs.data.data);
      if (camps.data?.success) setCampaigns(camps.data.data);
      setError(null);
    } catch (e) {
      setError('Failed to load live data. Check connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboard();
    const refresh = () => fetchDashboard();
    const updateStats = (s) => s && setStats(p => ({ ...p, ...s }));
    const logItem = (l) => setConsoleLogs(p => [...p, l].slice(-100));
    socket.on('activity_update', refresh);
    socket.on('stats_update', updateStats);
    socket.on('new_reply', refresh);
    socket.on('leads_updated', refresh);
    socket.on('automation_log', logItem);
    const interval = setInterval(fetchDashboard, 60000);
    return () => {
      clearInterval(interval);
      socket.off('activity_update', refresh);
      socket.off('stats_update', updateStats);
      socket.off('new_reply', refresh);
      socket.off('leads_updated', refresh);
      socket.off('automation_log', logItem);
    };
  }, [selectedCampaign]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = () => setDropdownOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [dropdownOpen]);

  async function handleSync() {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await axios.post('/api/automation/sync');
      setSyncMsg({ ok: true, text: res.data.message || 'Sync triggered!' });
      setTimeout(() => fetchDashboard(), 4000);
    } catch {
      setSyncMsg({ ok: false, text: 'Sync failed. Check logs.' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  }

  const filteredActivity = activity.filter(log => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'OUTREACH') return ['connection_sent','jd_sent','follow_up_sent','view_profile','like_post','message','connection_accepted'].includes(log.action_type);
    if (activeTab === 'REPLIES') return log.action_type === 'reply_received' || log.message_preview;
    if (activeTab === 'ALERTS') return log.status === 'failed' || log.error_message;
    return true;
  }).slice(0, 10);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '☀️ Good Morning';
    if (h < 18) return '☕ Good Afternoon';
    return '🌙 Good Evening';
  };

  const engineActive = engine.status === 'ACTIVE';
  const campaignName = selectedCampaign
    ? campaigns.find(c => c.id === Number(selectedCampaign))?.name || 'Campaign'
    : 'All Campaigns';

  if (loading && stats.connections_total === 0) {
    return (
      <div className="p-8 space-y-6 min-h-screen animate-pulse" style={{ background: '#080C18' }}>
        <div className="h-16 rounded-2xl bg-white/4" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-white/4" />)}
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-8 h-80 rounded-2xl bg-white/4" />
          <div className="col-span-4 h-80 rounded-2xl bg-white/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6 pb-20" style={{ background: '#080C18', fontFamily: 'Inter, sans-serif' }}>

      {/* ═══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Greeting + Title */}
        <div>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">{greeting()}</p>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3 font-display">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <LayoutDashboard size={16} className="text-blue-400" />
            </div>
            Command Center
          </h1>
        </div>

        {/* Right: Controls */}
        <div className="flex flex-wrap items-center gap-3">

          {/* Engine Badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${
            engineActive
              ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400'
              : 'border-amber-500/25 bg-amber-500/8 text-amber-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${engineActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            Engine {engine.status}
          </div>

          {/* Campaign Filter */}
          <div className="relative" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-white text-[10px] font-bold uppercase tracking-wider transition-all min-w-[160px] justify-between"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={11} className="text-slate-400" />
                <span className="truncate max-w-[100px]">{campaignName}</span>
              </div>
              <ChevronDown size={11} className={`text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/10 py-2 z-50 overflow-hidden"
                  style={{ background: '#0D1221', backdropFilter: 'blur(12px)' }}
                >
                  <div className="px-3 py-1.5 border-b border-white/6 flex justify-between items-center mb-1">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Filter by Campaign</span>
                    <span className="text-[9px] bg-white/8 text-slate-400 px-2 py-0.5 rounded-md font-bold">{campaigns.length}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedCampaign(''); setDropdownOpen(false); }}
                    className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${
                      selectedCampaign === '' ? 'text-blue-400 bg-blue-500/8' : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2"><Megaphone size={10} />All Campaigns</div>
                    {selectedCampaign === '' && <Check size={10} />}
                  </button>
                  {campaigns.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCampaign(c.id.toString()); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${
                        Number(selectedCampaign) === c.id ? 'text-blue-400 bg-blue-500/8' : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.connections_sent > 0 ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      {Number(selectedCampaign) === c.id && <Check size={10} />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sync Button */}
          <button
            id="sync-now-btn"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-slate-300 text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
          >
            <RefreshCw size={11} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync message */}
      <AnimatePresence>
        {syncMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${
              syncMsg.ok ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400' : 'border-red-500/25 bg-red-500/8 text-red-400'
            }`}>
            {syncMsg.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            {syncMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/6 text-red-400 text-[10px] font-bold uppercase tracking-wider">
          <AlertCircle size={13} /> {error}
        </div>
      )}

      {/* ═══ STAT CARDS ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Prospect Pool" value={stats.total_leads} sub="Total leads in database" icon={Users} accent="blue" />
        <StatCard title="Today's Outreach" value={stats.connections_today} sub={`Goal: ${stats.daily_goal}`} icon={Zap} accent="amber" sparkData={dailySparkData} trendVal={stats.connections_today > 0 ? `+${stats.connections_today}` : null} trend="up" />
        <StatCard title="Total Sent" value={stats.connections_total} sub="Lifetime invitations" icon={Send} accent="indigo" />
        <StatCard title="Accepted" value={`${stats.accepted_leads}`} sub={`${stats.acceptance_rate}% rate`} icon={UserCheck} accent="purple" trendVal={`${stats.acceptance_rate}%`} trend="up" />
        <StatCard title="Replies" value={`${stats.replied_leads}`} sub={`${stats.reply_rate}% reply rate`} icon={MessageSquare} accent="emerald" trendVal={`${stats.reply_rate}%`} trend="up" />
      </div>

      {/* ═══ MAIN GRID ═══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── LEFT COLUMN (8/12) ── */}
        <div className="lg:col-span-8 space-y-6">

          {/* Outreach Analytics Chart */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 size={15} className="text-blue-400" />
                  Outreach Analytics
                </h2>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">Last 7 days performance</p>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { key: 'sent', label: 'Sent', color: '#3b82f6' },
                  { key: 'accepted', label: 'Accepted', color: '#10b981' },
                  { key: 'replied', label: 'Replied', color: '#a78bfa' },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => setVisibleMetrics(p => ({ ...p, [m.key]: !p[m.key] }))}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all ${
                      visibleMetrics[m.key]
                        ? 'border-white/15 bg-white/8 text-white'
                        : 'border-white/5 bg-transparent text-slate-600 hover:text-slate-400'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: visibleMetrics[m.key] ? m.color : '#374151' }} />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#475569' }} width={28} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  {visibleMetrics.sent && <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={24} fillOpacity={0.85} />}
                  {visibleMetrics.accepted && <Bar dataKey="accepted" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} fillOpacity={0.85} />}
                  {visibleMetrics.replied && <Bar dataKey="replied" fill="#a78bfa" radius={[4, 4, 0, 0]} maxBarSize={24} fillOpacity={0.85} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* Activity Log */}
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <Activity size={14} className="text-blue-400 animate-pulse" />
                  Activity Stream
                </h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-time outreach events</p>
              </div>
              {/* Tab Pills */}
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                {['ALL', 'OUTREACH', 'REPLIES', 'ALERTS', 'LIVE'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'LIVE' ? (
              <div className="rounded-xl p-4 font-mono text-[10px] leading-relaxed h-64 overflow-y-auto" style={{ background: '#050810', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/6">
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE TERMINAL
                  </span>
                  <button
                    onClick={() => setConsoleLogs([{ text: 'Console cleared.', type: 'info', timestamp: new Date().toISOString() }])}
                    className="text-[9px] text-slate-600 hover:text-slate-400 font-bold uppercase tracking-wider"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-1.5">
                  {consoleLogs.map((log, i) => {
                    let col = '#94a3b8';
                    const t = log.text?.toLowerCase() || '';
                    if (t.includes('error') || t.includes('fail')) col = '#f87171';
                    else if (t.includes('skip') || t.includes('rest')) col = '#fbbf24';
                    else if (t.includes('success') || t.includes('sent')) col = '#34d399';
                    else if (t.includes('fetch') || t.includes('sync')) col = '#38bdf8';
                    const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour12: false }) : '';
                    return (
                      <div key={i} className="whitespace-pre-wrap" style={{ color: col }}>
                        <span style={{ color: '#374151' }}>[{time}] </span>{log.text}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : filteredActivity.length === 0 ? (
              <div className="py-16 text-center opacity-30">
                <Activity size={28} className="mx-auto mb-3 text-slate-500" />
                <p className="text-xs text-slate-500 font-black uppercase tracking-widest">No events found</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredActivity.map(log => <LogRow key={log.id} log={log} />)}
              </AnimatePresence>
            )}
          </GlassCard>
        </div>

        {/* ── RIGHT COLUMN (4/12) ── */}
        <div className="lg:col-span-4 space-y-6">

          {/* Daily Goal Ring */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Target size={13} className="text-amber-400" />
                Daily Target
              </h2>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                stats.connections_today >= stats.daily_goal && stats.daily_goal > 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                {stats.connections_today >= stats.daily_goal && stats.daily_goal > 0 ? '✓ Done' : 'In Progress'}
              </span>
            </div>

            {stats.is_resting_day ? (
              <div className="text-center py-6">
                <Coffee size={36} className="mx-auto text-amber-400 opacity-60 animate-pulse" />
                <p className="text-[10px] text-amber-400 font-black uppercase tracking-widest mt-3">Rest Day Active</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ProgressRing value={stats.connections_today} target={stats.daily_goal || 1} />
                <div className="w-full text-center space-y-1">
                  {stats.daily_goal > 0 ? (
                    stats.connections_today >= stats.daily_goal ? (
                      <p className="text-[11px] text-emerald-400 font-bold">🔥 Daily goal achieved!</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-medium">
                        <span className="text-white font-black">{stats.daily_goal - stats.connections_today}</span> more to reach goal
                      </p>
                    )
                  ) : (
                    <p className="text-[10px] text-slate-600">Link a LinkedIn account to set goal</p>
                  )}
                </div>
                {stats.connections_today < (stats.daily_goal || 20) && (
                  <div className="w-full pt-3 border-t border-white/6">
                    <NextTimer targetDate={stats.next_action_at} />
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Engine Status */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Activity size={13} className="text-blue-400 animate-pulse" />
                Engine Status
              </h2>
              <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-wider ${
                engineActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>{engine.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Outreach Queue', val: engine.data?.queued?.pending_connections ?? 0 },
                { label: 'Enrichment Queue', val: engine.data?.queued?.pending_enrichment ?? 0 },
              ].map(({ label, val }) => (
                <div key={label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-black text-white mt-1">{val}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 pt-3 border-t border-white/6">
              <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Task Processes</p>
              {[
                { name: 'Connection Sender', key: 'runSendConnections' },
                { name: 'Profile Enrichment', key: 'runLeadEnrichment' },
                { name: 'Flow Execution', key: 'runFlowExecution' },
              ].map(task => {
                const active = engine.data?.isRunning?.[task.key];
                return (
                  <div key={task.key} className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-medium">{task.name}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-ping' : 'bg-slate-700'}`} />
                      <span className={`font-bold text-[9px] ${active ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {active ? 'Running' : 'Idle'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* Pipeline Funnel */}
          <GlassCard className="p-5">
            <h2 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 mb-5">
              <TrendingUp size={13} className="text-purple-400" />
              Pipeline Funnel
            </h2>
            <div className="space-y-4">
              <FunnelRow label="Prospects" value={stats.total_leads} max={stats.total_leads} color="#3b82f6" icon={Users} sub="pool" />
              <FunnelRow label="Sent" value={stats.sent_leads} max={stats.total_leads} color="#6366f1" icon={Send} sub="outreach" />
              <FunnelRow label="Accepted" value={stats.accepted_leads} max={stats.sent_leads} color="#8b5cf6" icon={UserCheck} sub="connected" />
              <FunnelRow label="Replied" value={stats.replied_leads} max={stats.accepted_leads} color="#10b981" icon={MessageSquare} sub="engaged" />
            </div>
          </GlassCard>

          {/* Active Accounts */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={13} className="text-emerald-400" />
                Sender Profiles
              </h2>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{accounts.length} linked</span>
            </div>
            <div className="space-y-2">
              {accounts.length === 0 ? (
                <p className="text-[10px] text-slate-600 text-center py-4">No accounts linked yet</p>
              ) : accounts.map((acc, i) => (
                <div key={acc.id || i} className="flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-white/4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center text-[10px] font-black text-blue-400 shrink-0">
                    {(acc.name || 'A').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-white truncate">{acc.name}</p>
                    <p className="text-[9px] text-slate-600 font-medium">{acc.today_connections || 0}/{acc.daily_limit || 25} today</p>
                  </div>
                  <span className={`w-2 h-2 rounded-full ${acc.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                </div>
              ))}
            </div>
          </GlassCard>

        </div>
      </div>
    </div>
  );
}
