import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, Download, Printer, Calculator, Briefcase, DollarSign, Clock, Users,
  MessageSquare, UserCheck, HelpCircle, ChevronRight, Sparkles, RefreshCw, BarChart2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, BarChart, Bar, AreaChart, Area 
} from 'recharts';
import AiInsightsCard from '../components/AiInsightsCard';

export default function AdvancedAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Backend data states
  const [overview, setOverview] = useState({
    total_leads: 0,
    sent_leads: 0,
    accepted_leads: 0,
    replied_leads: 0,
    connections_today: 0,
    connections_total: 0
  });
  const [trends, setTrends] = useState([]);
  const [advancedData, setAdvancedData] = useState({ templates: [], accounts: [] });
  const [insights, setInsights] = useState([]);

  // ROI Calculator states
  const [saasCost, setSaasCost] = useState(99);
  const [hourlyRate, setHourlyRate] = useState(30);
  const [hoursSaved, setHoursSaved] = useState(25);
  const [placedValue, setPlacedValue] = useState(200);

  async function fetchAnalyticsData() {
    try {
      const [overviewRes, trendsRes, advancedRes, insightsRes] = await Promise.all([
        axios.get('/api/analytics/overview'),
        axios.get('/api/analytics/trends'),
        axios.get('/api/analytics/advanced'),
        axios.get('/api/analytics/ai-insights')
      ]);

      if (overviewRes.data?.success) setOverview(overviewRes.data.data);
      if (trendsRes.data?.success) setTrends(trendsRes.data.data);
      if (advancedRes.data?.success) setAdvancedData(advancedRes.data.data);
      if (insightsRes.data?.success) setInsights(insightsRes.data.data);
    } catch (err) {
      console.error('[Analytics] Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData();
  };

  // ROI Computations
  const timeSavedValue = hoursSaved * hourlyRate;
  const leadsGenerated = overview.replied_leads || 0;
  const leadAcquisitionValue = leadsGenerated * placedValue;
  const totalValueCreated = timeSavedValue + leadAcquisitionValue;
  const netRoiValue = totalValueCreated - saasCost;
  const roiPercentage = saasCost > 0 ? ((netRoiValue / saasCost) * 100).toFixed(0) : 0;
  const cplValue = leadsGenerated > 0 ? (saasCost / leadsGenerated).toFixed(1) : saasCost.toFixed(1);

  // Trigger report downloads
  const handleExportCSV = (type) => {
    const token = localStorage.getItem('lrat_token');
    const url = `/api/analytics/export?type=${type}&token=${token}`;
    window.open(url, '_blank');
  };

  const handlePrintReport = () => {
    const token = localStorage.getItem('lrat_token');
    const url = `/api/analytics/print?token=${token}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[24px]" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[24px]" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-[24px]" />
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-[24px]" />
      </div>
    );
  }

  // Custom tooltips for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 border border-slate-800 p-3.5 rounded-xl text-left text-xs text-white shadow-xl">
          <p className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
          {payload.map((p, idx) => (
            <div key={idx} className="flex justify-between items-center gap-6 my-1">
              <span className="font-semibold text-slate-350">{p.name}:</span>
              <span className="font-black" style={{ color: p.color || p.stroke }}>{p.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      {/* Header and Quick Options */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">SaaS Intelligence</span>
          <h1 className="text-2xl md:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
            Advanced Analytics
          </h1>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">
            Analyze campaign conversion dynamics, individual accounts, template A/B tests, and ROI.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 hover:border-blue-200 dark:hover:border-blue-900 transition-all flex items-center justify-center`}
            title="Refresh Report"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          
          <button
            onClick={handlePrintReport}
            className="px-4 py-2.5 rounded-xl border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold text-xs transition-all flex items-center gap-1.5"
          >
            <Printer size={14} />
            <span>Print Report</span>
          </button>

          <div className="relative group">
            <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs transition-all flex items-center gap-1.5">
              <Download size={14} />
              <span>Export CSV</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl hidden group-hover:block hover:block z-50 overflow-hidden">
              <button
                onClick={() => handleExportCSV('leads')}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                Export Leads Database
              </button>
              <button
                onClick={() => handleExportCSV('campaigns')}
                className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 border-t border-slate-100 dark:border-slate-800/80 transition-all"
              >
                Export Campaigns Stats
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Main Overview & AI Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Graph Card */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between min-h-[350px]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">Outreach Speed</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Daily Conversion Trends</h3>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
              Last 7 Days
            </span>
          </div>

          <div className="flex-1 w-full h-[220px]">
            {trends.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No active outreach data found in database.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReplied" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
                  <XAxis 
                    dataKey="date" 
                    tickLine={false}
                    axisLine={false} 
                    tick={{ fontSize: 9, fontWeight: 'bold' }} 
                    stroke="#94a3b8"
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false} 
                    tick={{ fontSize: 9, fontWeight: 'bold' }} 
                    stroke="#94a3b8" 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Area type="monotone" name="Invites Sent" dataKey="sent" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSent)" />
                  <Area type="monotone" name="Connected" dataKey="accepted" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAccepted)" />
                  <Area type="monotone" name="Replies" dataKey="replied" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorReplied)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* AI Outreach Insights */}
        <div>
          <AiInsightsCard insights={insights} loading={false} />
        </div>
      </div>

      {/* Middle Row: ROI Calculator & Account Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive ROI Calculator */}
        <div className="bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Calculator size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">Cost-Benefit Analysis</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Live ROI Calculator</h3>
              </div>
            </div>

            {/* Live Slider inputs */}
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Monthly Tool Budget</label>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">${saasCost}/mo</span>
                </div>
                <input 
                  type="range" min="10" max="500" value={saasCost} onChange={e => setSaasCost(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hourly Rate</label>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">${hourlyRate}/hr</span>
                </div>
                <input 
                  type="range" min="10" max="150" value={hourlyRate} onChange={e => setHourlyRate(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Hours Saved / Month</label>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">{hoursSaved} Hrs</span>
                </div>
                <input 
                  type="range" min="5" max="100" value={hoursSaved} onChange={e => setHoursSaved(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Value of a Replied Lead</label>
                  <span className="text-xs font-black text-slate-900 dark:text-slate-100">${placedValue} / lead</span>
                </div>
                <input 
                  type="range" min="20" max="1000" step="10" value={placedValue} onChange={e => setPlacedValue(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Calculator Output Display */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-dashed border-slate-205 dark:border-slate-800/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold">Time Value Retained:</span>
              <span className="text-xs font-black text-slate-900 dark:text-slate-200">${timeSavedValue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold">Lead Sourcing Value:</span>
              <span className="text-xs font-black text-slate-900 dark:text-slate-200">${leadAcquisitionValue}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold">Cost Per Lead (CPL):</span>
              <span className="text-xs font-black text-blue-600 dark:text-blue-450">${cplValue}</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
              <span className="text-xs font-black text-slate-800 dark:text-slate-200">Net Estimated Savings:</span>
              <span className={`text-base font-black ${netRoiValue >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                ${netRoiValue}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-850 dark:text-slate-250">Estimated ROI %:</span>
              <span className="flex items-center gap-1.5 text-base font-black text-blue-600 dark:text-blue-400">
                <Sparkles size={13} className="text-amber-500" />
                {roiPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* Account Performance comparison graph */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <BarChart2 size={16} />
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">Profile Audits</span>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Account outreach Output Comparison</h3>
              </div>
            </div>
            <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md">
              Total logs
            </span>
          </div>

          <div className="flex-1 w-full h-[220px]">
            {advancedData.accounts.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No LinkedIn accounts configured.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={advancedData.accounts} margin={{ top: 15, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800/60" />
                  <XAxis 
                    dataKey="name" 
                    tickLine={false}
                    axisLine={false} 
                    tick={{ fontSize: 9, fontWeight: 'bold' }} 
                    stroke="#94a3b8" 
                  />
                  <YAxis 
                    tickLine={false}
                    axisLine={false} 
                    tick={{ fontSize: 9, fontWeight: 'bold' }} 
                    stroke="#94a3b8" 
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Bar name="Invites Sent" dataKey="sent" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar name="Connected" dataKey="accepted" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={12} />
                  <Bar name="Replies" dataKey="replied" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* A/B Message Templates Performance Comparison Section */}
      <div className="bg-white dark:bg-slate-900/80 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800/80 shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <MessageSquare size={16} />
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">Message Optimization</span>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">A/B outreach Note Conversions</h3>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-md">
            <Sparkles size={10} />
            A/B TEST ACTIVE
          </span>
        </div>

        {advancedData.templates.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No templates are associated with sent invitations.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850">
                  <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-left">Campaign Name / Note</th>
                  <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Invites Sent</th>
                  <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Connected</th>
                  <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Acceptance Rate</th>
                  <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Replies</th>
                  <th className="py-3 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center font-bold text-blue-600 dark:text-blue-400">Reply Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850/60">
                {advancedData.templates.map((temp) => (
                  <tr key={temp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                    <td className="py-4">
                      <p className="text-xs font-black text-slate-900 dark:text-slate-100 mb-1">{temp.name}</p>
                      <p className="text-[10px] font-bold text-slate-455 dark:text-slate-500 line-clamp-1 max-w-[400px]" title={temp.template}>
                        {temp.template}
                      </p>
                    </td>
                    <td className="py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300">{temp.connections_sent}</td>
                    <td className="py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300">{temp.accepted}</td>
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">{temp.acceptance_rate}%</span>
                        <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 hidden sm:block">
                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, temp.acceptance_rate)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-center text-xs font-bold text-slate-700 dark:text-slate-300">{temp.replied}</td>
                    <td className="py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400">{temp.reply_rate}%</span>
                        <div className="w-12 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0 hidden sm:block">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${Math.min(100, temp.reply_rate)}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
