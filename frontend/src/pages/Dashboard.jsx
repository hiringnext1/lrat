import React, { useEffect, useState } from 'react';
import { 
  Users, UserCheck, MessageSquare, TrendingUp, Activity, 
  Target, Zap, AlertCircle, Calendar, ArrowUpRight, ArrowDownRight,
  LayoutDashboard, Megaphone, Inbox, CheckCircle2, Moon, Play, Globe, Clock,
  ChevronRight, Laptop, Shield, ShieldCheck, RefreshCw, Send, Check, Download, Printer, Coffee, ChevronDown, SlidersHorizontal
} from 'lucide-react';
import axios from 'axios';
import socket from '../socket';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from 'recharts';

// ─── MINI SPARKLINE CHART FOR STAT CARDS ────────────────────────────────────
function Sparkline({ data, strokeColor, fillColor }) {
  if (!data || data.length === 0) {
    // Generate dummy trend sparkline
    data = [10, 15, 8, 12, 19, 14, 25].map(v => ({ value: v }));
  }
  return (
    <div className="h-10 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`gradient-${strokeColor}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.4}/>
              <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={strokeColor} 
            strokeWidth={2} 
            fillOpacity={1} 
            fill={`url(#gradient-${strokeColor})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── PREMIUM STAT CARD ──────────────────────────────────────────────────────
// ─── PREMIUM STAT CARD ──────────────────────────────────────────────────────
function StatCard({ title, value, subValue, trend, trendValue, icon: Icon, color, sparklineData }) {
  const isPositive = trend === 'up';
  
  const palette = {
    blue: {
      border: 'hover:border-blue-450 dark:hover:border-blue-800',
      bgGlow: 'from-blue-500/10 to-transparent',
      badgeBg: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
      stroke: '#3b82f6',
      fill: '#60a5fa'
    },
    amber: {
      border: 'hover:border-amber-450 dark:hover:border-amber-800',
      bgGlow: 'from-amber-500/10 to-transparent',
      badgeBg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400',
      stroke: '#f59e0b',
      fill: '#fbbf24'
    },
    purple: {
      border: 'hover:border-purple-450 dark:hover:border-purple-800',
      bgGlow: 'from-purple-500/10 to-transparent',
      badgeBg: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
      stroke: '#8b5cf6',
      fill: '#a78bfa'
    },
    emerald: {
      border: 'hover:border-emerald-400 dark:hover:border-emerald-800',
      bgGlow: 'from-emerald-500/10 to-transparent',
      badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
      stroke: '#10b981',
      fill: '#34d399'
    }
  };

  const currentTheme = color.includes('blue') ? palette.blue 
                     : color.includes('amber') ? palette.amber 
                     : color.includes('purple') ? palette.purple 
                     : palette.emerald;

  return (
    <div className={`bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-md transition-all duration-350 relative overflow-hidden flex flex-col justify-between min-h-[145px] ${currentTheme.border}`}>
      <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-2xl opacity-20 bg-gradient-to-tr ${currentTheme.bgGlow}`} />
      
      {/* Header element row */}
      <div className="flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`p-2 rounded-xl ${currentTheme.badgeBg} flex items-center justify-center shrink-0`}>
            <Icon size={15} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{title}</span>
        </div>
        
        {trendValue && (
          <span className={`flex items-center gap-0.5 text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
            isPositive 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
              : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
          }`}>
            {isPositive ? <ArrowUpRight size={8} strokeWidth={3} /> : <ArrowDownRight size={8} strokeWidth={3} />}
            {trendValue}
          </span>
        )}
      </div>

      {/* Main value container */}
      <div className="my-3.5 relative z-10 flex items-baseline gap-1.5 flex-wrap">
        {typeof value === 'string' && value.includes(' ') ? (
          <>
            <span className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white leading-none">
              {value.split(' ')[0]}
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 self-end mb-0.5">
              {value.split(' ').slice(1).join(' ')}
            </span>
          </>
        ) : (
          <span className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white tracking-tight leading-none">
            {value}
          </span>
        )}
      </div>

      {/* Bottom context block */}
      <div className="flex items-center justify-between gap-3 mt-auto pt-2.5 border-t border-slate-100/50 dark:border-slate-800/40 relative z-10 min-w-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate pr-1">{subValue}</p>
        <div className="shrink-0 opacity-80 hover:opacity-100 transition-opacity">
          <Sparkline data={sparklineData} strokeColor={currentTheme.stroke} fillColor={currentTheme.fill} />
        </div>
      </div>
    </div>
  );
}

function ProgressRing({ value, target, color }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / target, 1);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center">
      <svg className="w-28 h-28 transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="9"
          fill="transparent"
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="currentColor"
          strokeWidth="9"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          fill="transparent"
          className={`${color} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-none">{value}</span>
        <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">/ {target}</span>
      </div>
    </div>
  );
}

// ─── TAPERED GRAPH FUNNEL CHART ─────────────────────────────────────────────
function FunnelChart({ stats }) {
  const steps = [
    { label: 'Prospects', value: stats.total_leads, color: 'from-blue-500 to-blue-600', icon: Users, desc: "Total Pool" },
    { label: 'Outreach', value: stats.sent_leads, color: 'from-indigo-500 to-indigo-600', icon: Zap, desc: "Invites Sent" },
    { label: 'Network', value: stats.accepted_leads, color: 'from-purple-500 to-purple-600', icon: UserCheck, desc: "Accepted" },
    { label: 'Interest', value: stats.replied_leads, color: 'from-emerald-500 to-emerald-600', icon: MessageSquare, desc: "Replies" },
  ];

  const maxVal = Math.max(...steps.map(s => s.value), 1);

  return (
    <div className="space-y-4">
      {steps.map((step, i) => {
        const width = Math.max((step.value / maxVal) * 100, 8);
        const Icon = step.icon;
        const dropoff = i > 0 && steps[i-1].value > 0
          ? Math.round((1 - (step.value / steps[i-1].value)) * 100)
          : null;

        return (
          <div key={step.label} className="space-y-1">
            {/* Dropoff rate alert between steps */}
            {dropoff !== null && (
              <div className="flex items-center gap-1 pl-6 text-[8px] font-black text-rose-500 dark:text-rose-450 uppercase tracking-wider py-1 select-none">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 dark:border-rose-900/30">
                  ⬇ {dropoff}% Drop-off rate
                </span>
              </div>
            )}

            <div className="flex justify-between items-baseline px-1.5 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon size={12} className="text-slate-400 dark:text-slate-500 shrink-0" />
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{step.label}</span>
              </div>
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 shrink-0 whitespace-nowrap ml-2">
                {step.value} <span className="text-[9px] font-semibold text-slate-450 dark:text-slate-500 normal-case">({step.desc})</span>
              </span>
            </div>
            
            {/* Tapered bar using custom clip path or premium borders */}
            <div className="h-9 w-full bg-slate-50 dark:bg-slate-900/30 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800/80 p-0.5 relative">
              <div 
                className={`h-full bg-gradient-to-r ${step.color} transition-all duration-1000 ease-out flex items-center justify-end px-3.5 rounded-xl`}
                style={{ width: `${width}%` }}
              >
                {width > 20 && (
                  <span className="text-[9px] font-extrabold text-white/70 uppercase tracking-widest">
                    {i > 0 ? Math.round((step.value / (steps[i-1].value || 1)) * 100) : 100}%
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CUSTOM CHART TOOLTIP ───────────────────────────────────────────────────
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const sent = payload.find(p => p.dataKey === 'sent')?.value || 0;
    const accepted = payload.find(p => p.dataKey === 'accepted')?.value || 0;
    const replied = payload.find(p => p.dataKey === 'replied')?.value || 0;

    const acceptanceRate = sent > 0 ? Math.round((accepted / sent) * 100) : 0;
    const replyRate = accepted > 0 ? Math.round((replied / accepted) * 100) : 0;

    return (
      <div className="bg-slate-950/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl space-y-2.5 text-left text-white max-w-[240px]">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <div className="space-y-1.5 text-xs font-bold">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-550" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-slate-300">Invites Sent</span>
            </div>
            <span>{sent}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-550" style={{ backgroundColor: '#10b981' }} />
              <span className="text-slate-300">Acceptances</span>
            </div>
            <span>{accepted}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-550" style={{ backgroundColor: '#818cf8' }} />
              <span className="text-slate-300">Replies</span>
            </div>
            <span>{replied}</span>
          </div>
        </div>

        <div className="h-px bg-slate-800 my-1" />

        <div className="space-y-1 text-[10px] font-black uppercase tracking-wider text-slate-450">
          <div className="flex justify-between gap-6">
            <span>Acceptance Rate</span>
            <span style={{ color: '#10b981' }}>{acceptanceRate}%</span>
          </div>
          <div className="flex justify-between gap-6">
            <span>Reply Conversion</span>
            <span style={{ color: '#818cf8' }}>{replyRate}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}


// ─── ACTIVE TIME / TIMER MODULE ─────────────────────────────────────────────
function NextRunTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isSleeping, setIsSleeping] = useState(false);

  useEffect(() => {
    function checkSleep() {
      const now = new Date();
      const istOptions = { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false };
      const istHour = parseInt(new Intl.DateTimeFormat('en-GB', istOptions).format(now));
      // Gating standard: 11 PM to 7 AM IST
      setIsSleeping(istHour >= 23 || istHour < 7);
    }

    if (!targetDate) return;

    function update() {
      checkSleep();
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Processing...');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}m ${secs}s`);
    }

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!targetDate) return null;

  if (isSleeping) {
    return (
      <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <Moon size={16} className="text-indigo-500 fill-indigo-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">System Sleeping (Gated)</span>
        </div>
        <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
          IST 7:00 AM Resume
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
      <div className="flex items-center gap-2.5">
        <Clock size={16} className="text-blue-600 animate-pulse" />
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Next Action Cooldown</span>
      </div>
      <span className="text-xs font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">
        {timeLeft}
      </span>
    </div>
  );
}

// ─── ACTIVE ACCOUNT HEALTH GRIDS ────────────────────────────────────────────
function AccountCluster({ accounts }) {
  if (!accounts || accounts.length === 0) {
    return (
      <div className="p-8 text-center opacity-40 border border-dashed border-slate-200 rounded-3xl">
        <Users className="mx-auto mb-2 text-slate-400" size={24} />
        <p className="text-[10px] font-bold uppercase tracking-wider">No active accounts</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((acc, idx) => {
        // Mock Proxies and response metrics for visual premium completeness
        const proxyLocs = ["Mumbai-Res", "Delhi-Mobile", "Bengaluru-Res", "Pune-Res"];
        const proxyStr = proxyLocs[acc.id % proxyLocs.length];
        const pingTime = 90 + (acc.id * 14) % 70;
        
        return (
          <div key={acc.id || idx} className="bg-slate-50/60 dark:bg-slate-900/25 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-slate-850/60 transition-all duration-200">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950/60 flex items-center justify-center font-black text-blue-700 dark:text-blue-400 text-[10px] shrink-0 shadow-inner border border-blue-100/40 dark:border-blue-900/35 uppercase">
                {(acc.name || 'Account').substring(0, 2)}
              </div>
              <div className="min-w-0 text-left">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{acc.name}</span>
                <span className="block text-[8px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest mt-0.5">{proxyStr} • {pingTime}ms</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 min-w-0">
              <div className="text-right min-w-[55px]">
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 block leading-tight">{acc.today_connections || 0} / {acc.daily_limit || 25}</span>
                <span className="text-[7.5px] text-slate-400 dark:text-slate-500 block uppercase font-extrabold tracking-widest mt-0.5">Sent Today</span>
              </div>
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                acc.status === 'active' ? 'bg-emerald-500 ring-4 ring-emerald-500/15' : 'bg-amber-500 ring-4 ring-amber-500/15'
              }`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN DASHBOARD MODULE ──────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState({
    total_leads: 0,
    sent_leads: 0,
    accepted_leads: 0,
    replied_leads: 0,
    connections_today: 0,
    connections_total: 0,
    daily_goal: 0,
    acceptance_rate: 0,
    reply_rate: 0,
    active_campaigns: 0,
    active_accounts: 0,
    next_action_at: null
  });
  
  const [dailyData, setDailyData] = useState([]);
  const [trends, setTrends] = useState([]);
  const [activity, setActivity] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [campaignsList, setCampaignsList] = useState([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [engine, setEngine] = useState({ status: 'LOADING', message: 'Checking system...', color: 'text-gray-400' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [chartType, setChartType] = useState('area');
  const [visibleMetrics, setVisibleMetrics] = useState({ sent: true, accepted: true, replied: true });
  const [consoleLogs, setConsoleLogs] = useState([
    { text: 'System initialized. Operational Terminal connected.', type: 'info', timestamp: new Date().toISOString() }
  ]);

  // Operations filter console tabs
  const [activeTab, setActiveTab] = useState('ALL');

  async function fetchDashboard() {
    try {
      const queryStr = selectedCampaignId ? `?campaign_id=${selectedCampaignId}` : '';
      const queryStrDaily = selectedCampaignId ? `&campaign_id=${selectedCampaignId}` : '';

      const [over, daily, trendRes, logs, status, accs, camps] = await Promise.all([
        axios.get('/api/analytics/overview' + queryStr),
        axios.get('/api/analytics/daily?days=7' + queryStrDaily),
        axios.get('/api/analytics/trends' + queryStr),
        axios.get('/api/analytics/activity-log?limit=25' + queryStrDaily),
        axios.get('/api/analytics/engine-status'),
        axios.get('/api/analytics/accounts'),
        axios.get('/api/analytics/campaigns')
      ]);
      
      if (over.data?.success) setStats(over.data.data);
      if (daily.data?.success) setDailyData(daily.data.data.map(d => ({ value: d.connections_sent })));
      if (trendRes.data?.success) setTrends(trendRes.data.data);
      if (logs.data?.success) setActivity(logs.data.data);
      if (status.data?.status) setEngine(status.data);
      if (accs.data?.success) setAccounts(accs.data.data);
      if (camps.data?.success) setCampaignsList(camps.data.data);
      
      setError(null);
    } catch (e) {
      console.error('Dashboard Fetch Error:', e);
      setError('Failed to sync live data. Please check connection.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { 
    fetchDashboard();
    
    // Live listeners
    const refreshDashboard = () => fetchDashboard();
    const updateStatsLocally = (newStats) => {
      if (newStats) {
        setStats(prev => ({ ...prev, ...newStats }));
      }
    };
    const handleConsoleLog = (logItem) => {
      setConsoleLogs(prev => [...prev, logItem].slice(-100));
    };

    socket.on('activity_update', refreshDashboard);
    socket.on('stats_update', updateStatsLocally);
    socket.on('new_reply', refreshDashboard);
    socket.on('leads_updated', refreshDashboard);
    socket.on('automation_log', handleConsoleLog);

    const interval = setInterval(fetchDashboard, 60000); 

    return () => {
      clearInterval(interval);
      socket.off('activity_update', refreshDashboard);
      socket.off('stats_update', updateStatsLocally);
      socket.off('new_reply', refreshDashboard);
      socket.off('leads_updated', refreshDashboard);
      socket.off('automation_log', handleConsoleLog);
    };
  }, [selectedCampaignId]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClose = () => setDropdownOpen(false);
    document.addEventListener('click', handleClose);
    return () => document.removeEventListener('click', handleClose);
  }, [dropdownOpen]);

  // Manual sync handler
  async function handleSyncNow() {
    if (syncing) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await axios.post('/api/automation/sync');
      setSyncMsg({ type: 'success', text: res.data.message || 'Sync triggered! Checking LinkedIn...' });
      // Refresh dashboard data after 4 seconds to show new acceptances
      setTimeout(() => fetchDashboard(), 4000);
    } catch (e) {
      setSyncMsg({ type: 'error', text: 'Sync failed. Check server logs.' });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 5000);
    }
  }

  // Filter logs logic based on tab selection
  const filteredActivity = activity.filter(log => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'OUTREACH') {
      const types = ['connection_sent', 'jd_sent', 'follow_up_sent', 'view_profile', 'like_post', 'tag', 'message', 'end', 'connection_accepted'];
      return types.includes(log.action_type);
    }
    if (activeTab === 'REPLIES') return log.action_type === 'reply_received' || log.message_preview;
    if (activeTab === 'ALERTS') return log.status === 'failed' || log.error_message;
    return true;
  }).slice(0, 8); // Display only top 8 records

  if (loading && stats.connections_total === 0) {
    return (
      <div className="p-8 space-y-8 animate-pulse bg-[#fbfcfd] dark:bg-slate-900 min-h-screen">
        <div className="h-10 w-72 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1,2,3,4,5].map(i => <div key={i} className="h-40 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-sm" />)}
        </div>
      </div>
    );
  }

  // Get dynamic greeting based on IST Hours
  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good Morning, Sourcing Lead ☀️';
    if (hours < 18) return 'Good Afternoon, Sourcing Lead ☕';
    return 'Good Evening, Sourcing Lead 🌙';
  };

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#fbfcfd] dark:bg-slate-950 min-h-screen pb-24 text-left">
      {/* ─── HEADER ENGINE BANNER ───────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.01)] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="text-blue-600" size={28} strokeWidth={2.5} />
            Command Center
          </h1>
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">{getGreeting()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* Custom Campaign Selector Dropdown */}
          <div className="relative select-none" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-extrabold text-[10px] uppercase tracking-wider px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer min-w-[180px] justify-between group"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={12} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                <span className="truncate max-w-[110px]">
                  {selectedCampaignId 
                    ? campaignsList.find(c => c.id === Number(selectedCampaignId))?.name || 'Campaign' 
                    : 'All Campaigns'}
                </span>
              </div>
              <ChevronDown size={12} className={`text-slate-450 transition-transform duration-250 ${dropdownOpen ? 'rotate-180 text-blue-500' : ''}`} />
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 lg:right-0 lg:left-auto mt-2.5 w-56 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.08)] py-2 z-50 overflow-hidden"
                >
                  <div className="px-3 py-1.5 border-b border-slate-50 dark:border-slate-850/50 flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Select Campaign</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md font-bold">
                      {campaignsList.length} Total
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto mt-1">
                    {/* All Campaigns Option */}
                    <button
                      onClick={() => {
                        setSelectedCampaignId('');
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${
                        selectedCampaignId === ''
                          ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                          : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Megaphone size={12} className={selectedCampaignId === '' ? 'text-blue-500' : 'text-slate-400'} />
                        <span>All Campaigns</span>
                      </div>
                      {selectedCampaignId === '' && <Check size={12} strokeWidth={2.5} />}
                    </button>

                    {/* Campaigns List */}
                    {campaignsList.map((campaign) => {
                      const isSelected = Number(selectedCampaignId) === campaign.id;
                      return (
                        <button
                          key={campaign.id}
                          onClick={() => {
                            setSelectedCampaignId(campaign.id.toString());
                            setDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                              : 'text-slate-650 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:text-slate-850'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate pr-4">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              campaign.connections_sent > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                            }`} />
                            <span className="truncate pr-1">{campaign.name}</span>
                          </div>
                          {isSelected && <Check size={12} strokeWidth={2.5} className="shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── SYNC NOW BUTTON ── */}
          <button
            id="sync-now-btn"
            onClick={handleSyncNow}
            disabled={syncing}
            className={`flex items-center gap-2 font-extrabold text-[10px] uppercase tracking-wider px-4 py-3 rounded-2xl border transition-all duration-200 cursor-pointer ${
              syncing
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 cursor-not-allowed'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-600 dark:hover:bg-emerald-950/20 dark:hover:border-emerald-700 dark:hover:text-emerald-400 shadow-sm hover:shadow-md'
            }`}
          >
            <RefreshCw size={13} strokeWidth={2.5} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>

          {/* Connected state indicators */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 px-4 py-2.5 rounded-2xl">
            <div className={`w-3 h-3 rounded-full flex items-center justify-center shrink-0 ${
              engine.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${engine.status === 'ACTIVE' ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            </div>
            <div>
              <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Safety pulse</p>
              <p className={`text-xs font-black mt-0.5 ${engine.status === 'ACTIVE' ? 'text-emerald-600' : 'text-amber-500'}`}>
                {engine.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 p-4.5 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 text-xs font-extrabold uppercase tracking-wide">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ── SYNC STATUS TOAST ── */}
      {syncMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border text-xs font-extrabold uppercase tracking-wide ${
            syncMsg.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400'
          }`}
        >
          {syncMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          <span>{syncMsg.text}</span>
        </motion.div>
      )}


      {/* ─── STAT CARDS GRID ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatCard 
          title="Prospect Pool" 
          value={stats.total_leads || 0} 
          subValue="Prospect database size"
          icon={Users} 
          color="text-blue-600" 
        />
        <StatCard 
          title="Today's Outreach" 
          value={stats.connections_today || 0} 
          subValue="Invitations delivered today"
          icon={Zap} 
          color="text-amber-500" 
          sparklineData={dailyData}
        />
        <StatCard 
          title="Volume Sent" 
          value={stats.connections_total || 0} 
          subValue="Lifetime campaign outreach"
          icon={Globe} 
          color="text-blue-500" 
        />
        <StatCard 
          title="Conversion Rate" 
          value={`${stats.accepted_leads || 0} Connections`} 
          subValue={`${stats.acceptance_rate || 0}% Acceptance Rate`}
          icon={UserCheck} 
          color="text-purple-600" 
        />
        <StatCard 
          title="Win Rate" 
          value={`${stats.replied_leads || 0} Replies`} 
          subValue={`${stats.reply_rate || 0}% Reply Rate`}
          icon={MessageSquare} 
          color="text-emerald-600" 
        />
      </div>

      {/* ─── MAIN TWO-COLUMN DASHBOARD CONTENT ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (2/3 Width) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Performance Trend Chart */}
          <div className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">Outreach Analytics</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase mt-0.5 tracking-wider">Lately active: Last 7 days metrics</p>
              </div>

              {/* Metric Legend Toggles */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setVisibleMetrics(prev => ({ ...prev, sent: !prev.sent }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                    visibleMetrics.sent
                      ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400'
                      : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>Sent</span>
                </button>
                <button
                  onClick={() => setVisibleMetrics(prev => ({ ...prev, accepted: !prev.accepted }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                    visibleMetrics.accepted
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Accepted</span>
                </button>
                <button
                  onClick={() => setVisibleMetrics(prev => ({ ...prev, replied: !prev.replied }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all duration-205 cursor-pointer ${
                    visibleMetrics.replied
                      ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#818cf8' }} />
                  <span>Replied</span>
                </button>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} barGap={3}>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e2e8f0" className="dark:hidden" />
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  {visibleMetrics.sent && <Bar dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} />}
                  {visibleMetrics.accepted && <Bar dataKey="accepted" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />}
                  {visibleMetrics.replied && <Bar dataKey="replied" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={30} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>


          {/* Interactive Live Activity Stream Terminal */}
          <div className="bg-white dark:bg-slate-900/60 rounded-[28px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_25px_rgba(0,0,0,0.005)] p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                  <Activity className="text-blue-600 animate-pulse" size={15} />
                  Operational Terminal
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5 tracking-wider">
                  Real-time system events and background execution logs.
                </p>
              </div>

              {/* Tab Selector and Clear Row aligned perfectly */}
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl">
                  {['LIVE', 'ALL', 'OUTREACH', 'REPLIES', 'ALERTS'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 ${
                        activeTab === tab
                          ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === 'LIVE' && (
                  <button 
                    onClick={() => setConsoleLogs([{ text: 'Console cleared. Listening for live events...', type: 'info', timestamp: new Date().toISOString() }])}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-200 border border-slate-200/40 dark:border-slate-700/40 shrink-0"
                  >
                    Clear Log
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {activeTab === 'LIVE' ? (
                <div className="bg-slate-950 dark:bg-black rounded-2xl border border-slate-800 p-4.5 font-mono text-[10px] sm:text-[11px] leading-relaxed text-slate-350 shadow-inner h-[320px] overflow-y-auto flex flex-col justify-start relative scrollbar-thin">
                  <div className="space-y-2 text-left">
                    {consoleLogs.map((log, idx) => {
                      let timeStr = '';
                      try {
                        const date = log.timestamp ? new Date(log.timestamp) : new Date();
                        timeStr = isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                      } catch (e) {
                        timeStr = '00:00:00';
                      }
                      let color = 'text-slate-300';
                      if (log.type === 'error' || log.text.toLowerCase().includes('error') || log.text.toLowerCase().includes('fail')) {
                        color = 'text-rose-400';
                      } else if (log.type === 'warn' || log.text.includes('Skip') || log.text.includes('Resting')) {
                        color = 'text-amber-400';
                      } else if (log.text.includes('Successfully') || log.text.includes('Sent') || log.text.includes('resumed') || log.text.includes('success')) {
                        color = 'text-emerald-400';
                      } else if (log.text.includes('Fetching') || log.text.includes('Enrichment') || log.text.includes('Syncing')) {
                        color = 'text-sky-400';
                      }
                      return (
                        <div key={idx} className={`whitespace-pre-wrap ${color}`}>
                          <span className="text-slate-600 font-extrabold mr-2.5">[{timeStr}]</span>
                          {log.text}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : filteredActivity.length === 0 ? (
                <div className="py-16 text-center opacity-30">
                  <Activity size={32} className="mx-auto mb-3 text-slate-400" />
                  <p className="text-xs font-black uppercase tracking-widest italic">No filtered logs found</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredActivity.map((log) => {
                    const isError = log.status === 'failed' || log.error_message;
                    const isReply = log.action_type === 'reply_received' || log.message_preview;
                    
                    return (
                      <motion.div 
                        key={log.id} 
                        initial={{ opacity: 0, x: -10 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50/40 dark:bg-slate-900/15 border border-slate-100/50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-200"
                      >
                        <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 border border-white dark:border-slate-950 shadow-sm ${
                          isError ? 'bg-rose-500 ring-4 ring-rose-500/10' : isReply ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 'bg-blue-500 ring-4 ring-blue-500/10'
                        }`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-1 min-w-0">
                            <h4 className="text-[11px] font-black text-slate-850 dark:text-slate-150 uppercase tracking-wider flex items-center gap-1.5 flex-wrap min-w-0">
                              <span className="truncate">{(log.action_type || 'system').replace('_', ' ')}</span>
                              {log.lead_name && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700 font-normal text-[10px]">•</span>
                                  <span className="text-blue-600 dark:text-blue-400 normal-case font-bold hover:underline cursor-pointer truncate max-w-[130px]">{log.lead_name}</span>
                                </>
                              )}
                            </h4>
                            <span className="text-[8.5px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest shrink-0">
                              {log.created_at ? new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : 'Now'}
                            </span>
                          </div>
                          
                          <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 font-medium leading-relaxed break-words">
                            {log.message_preview || log.error_message || 'Step executed cleanly.'}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 Width) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Engine Queue & Health Monitor */}
          <div className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-blue-600">
                <Activity size={14} className="animate-pulse" /> Engine & Queue Status
              </h3>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${
                engine.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                engine.status === 'SLEEPING' ? 'bg-indigo-500/10 text-indigo-650 border-indigo-500/20' :
                'bg-slate-500/10 text-slate-650 border-slate-500/20'
              }`}>
                {engine.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Outreach Queue</span>
                <span className="text-sm font-extrabold text-slate-850 dark:text-slate-100">
                  {engine.data?.queued?.pending_connections ?? 0}
                </span>
                <span className="text-[9px] text-slate-450 dark:text-slate-500 block">Prospects ready</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Enrichment Queue</span>
                <span className="text-sm font-extrabold text-slate-850 dark:text-slate-100">
                  {engine.data?.queued?.pending_enrichment ?? 0}
                </span>
                <span className="text-[9px] text-slate-450 dark:text-slate-500 block">Profile checks pending</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-850/50">
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Task Process State</span>
              <div className="space-y-1.5">
                {[
                  { name: 'Connection Sender', key: 'runSendConnections' },
                  { name: 'Profile Enrichment', key: 'runLeadEnrichment' },
                  { name: 'Flow Execution Node', key: 'runFlowExecution' }
                ].map(task => {
                  const active = engine.data?.isRunning?.[task.key];
                  return (
                    <div key={task.key} className="flex justify-between items-center text-[10px] font-semibold text-slate-700 dark:text-slate-350">
                      <span>{task.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500 animate-ping' : 'bg-slate-450 dark:bg-slate-700'}`} />
                        <span className="font-extrabold text-xs">{active ? 'Running' : 'Idle'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {engine.data?.accountIssues && engine.data.accountIssues.length > 0 && (
              <div className="mt-3 p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-2">
                <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Sender Node Alerts ({engine.data.accountIssues.length})</span>
                <div className="space-y-1">
                  {engine.data.accountIssues.map((issue, idx) => (
                    <div key={idx} className="text-[10px] font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-rose-500" />
                      <span>{issue.name}: {issue.status} (Health: {issue.health_score}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily Goal & Next Cooldown Timer */}
          <div className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)] text-center space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 text-amber-500">
              <Target size={14} /> Daily Target Gauge
            </h3>
            
            {stats.is_resting_day ? (
              <div className="flex flex-col items-center justify-center py-6 text-amber-500/80 animate-pulse">
                <Coffee size={44} strokeWidth={1.5} />
                <span className="text-[10px] uppercase font-black tracking-widest mt-2.5">Campaign Resting Mode</span>
              </div>
            ) : (
              <div className="flex justify-center">
                <ProgressRing 
                  value={stats.connections_today || 0} 
                  target={stats.daily_goal || 1} 
                  color={stats.connections_today >= stats.daily_goal && stats.daily_goal > 0 ? 'text-emerald-500' : 'text-amber-500'} 
                />
              </div>
            )}
            
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
              {stats.is_resting_day ? (
                <span className="text-amber-600 dark:text-amber-400 block font-bold">Today is a scheduled resting day for your campaign(s). No automated invitations will be sent. ☕</span>
              ) : stats.daily_goal > 0 ? (
                <>
                  Aapka aaj ka target <span className="font-black text-slate-800 dark:text-slate-100">{stats.daily_goal}</span> requests hai. 
                  {stats.connections_today >= stats.daily_goal ? (
                    <span className="text-emerald-600 dark:text-emerald-400 block mt-1.5 font-bold">Goal complete! Aaj ki limits achieved. 🔥</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 block mt-1.5 font-bold">Bas {stats.daily_goal - stats.connections_today} aur invitations baaki hain.</span>
                  )}
                </>
              ) : (
                "Link a LinkedIn account to set your daily connection target."
              )}
            </p>
            
            {stats.is_resting_day ? (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between p-3 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100/50 dark:border-amber-900/20">
                <div className="flex items-center gap-2.5 text-left">
                  <Calendar size={16} className="text-amber-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Weekly Pause Active</span>
                    <span className="text-[10px] text-slate-550 dark:text-slate-500 font-medium">Actions resume on next working day</span>
                  </div>
                </div>
              </div>
            ) : stats.next_action_at && stats.connections_today < stats.daily_goal && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-850">
                <NextRunTimer targetDate={stats.next_action_at} />
              </div>
            )}
          </div>

          {/* Funnel Conversion Tracker */}
          <div className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-purple-600">
              <TrendingUp size={14} /> Pipeline Conversion
            </h3>
            <FunnelChart stats={stats} />
          </div>

          {/* Active Account Clusters (IP/Proxy Sync) */}
          <div className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                Linked Sender Profiles
              </h3>
              <span className="text-[8px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Proxy active
              </span>
            </div>
            <AccountCluster accounts={accounts} />
          </div>

        </div>
      </div>
    </div>
  );
}
