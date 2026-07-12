import { useState } from 'react';
import { Search, Filter, Megaphone, Users, Sparkles, Inbox, CheckCircle2, MessageSquare, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
}

export default function ConversationList({ conversations, activeId, onSelect, accounts, campaigns, sortBy, onSortChange }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');

  // Calculate counts for each tab
  const allCount = conversations.length;
  const unreadCount = conversations.filter(c => !c.lead?.is_read && c.last_message_from !== 'me').length;
  const repliedCount = conversations.filter(c => c.lead?.reply_received).length;

  const filtered = conversations.filter((conv) => {
    const lead = conv.lead;
    const name = lead?.full_name || conv.attendee_name || '';
    const preview = conv.last_message_text || '';
    
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !preview.toLowerCase().includes(search.toLowerCase())) return false;
    if (tab === 'replied' && !lead?.reply_received) return false;
    if (tab === 'unread') {
      const isUnread = !lead?.is_read && conv.last_message_from !== 'me';
      if (!isUnread) return false;
    }
    if (filterAccount && String(conv.account_id) !== String(filterAccount)) return false;
    if (filterCampaign && lead && String(lead.campaign_id) !== String(filterCampaign)) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full border-r border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0 text-left w-[340px] select-none">
      
      {/* ─── SEARCH & FILTER SEGMENT ────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 space-y-4 shrink-0 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-1.5 uppercase">
            <Inbox size={15} className="text-blue-600" />
            <span>Outreach Pipeline</span>
          </h2>
          <span className="bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-450 text-[9px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase">
            {filtered.length} Threads
          </span>
        </div>

        {/* Dynamic Search */}
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns, names..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 outline-none text-slate-700 dark:text-slate-200 transition-all font-semibold placeholder:text-slate-400"
          />
        </div>

        {/* Sort Group Row */}
        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-1.5 rounded-xl border border-slate-100 dark:border-slate-850">
          <span className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest pl-1 select-none">Sort pipeline</span>
          <div className="flex gap-1">
            <button
              onClick={() => onSortChange('recency')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                sortBy === 'recency'
                  ? 'bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-450 shadow-sm border border-slate-100 dark:border-slate-800'
                  : 'text-slate-455 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350'
              }`}
            >
              Recency
            </button>
            <button
              onClick={() => onSortChange('score')}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-0.5 ${
                sortBy === 'score'
                  ? 'bg-gradient-to-r from-amber-500/10 to-rose-500/10 text-rose-605 dark:text-rose-455 border border-rose-100 dark:border-rose-900/30 font-black shadow-sm'
                  : 'text-slate-455 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-350'
              }`}
            >
              🔥 Hot Leads
            </button>
          </div>
        </div>

        {/* Tabs Control Row */}
        <div className="flex bg-slate-105/60 dark:bg-slate-900/40 p-0.5 rounded-xl border border-slate-100 dark:border-slate-850">
          {[
            { id: 'all', label: 'All', count: allCount },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'replied', label: 'Replied', count: repliedCount }
          ].map((t) => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)}
              className="flex-1 relative flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-150 cursor-pointer"
            >
              {tab === t.id && (
                <motion.div 
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-white dark:bg-slate-850 shadow-sm border border-slate-100 dark:border-slate-800/85 rounded-lg"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <span className={`relative z-10 ${
                tab === t.id 
                  ? 'text-blue-600 dark:text-blue-450' 
                  : 'text-slate-450 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-350'
              }`}>
                {t.label}
              </span>
              {t.count > 0 && (
                <span className={`relative z-10 text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                  tab === t.id 
                    ? t.id === 'unread' ? 'bg-indigo-500 text-white' : t.id === 'replied' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-650'
                    : 'bg-slate-200 dark:bg-slate-850 text-slate-500'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 gap-2">
          {/* Account Filter */}
          <div className="bg-slate-50 dark:bg-slate-900/60 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-100 dark:border-slate-800/80">
            <Users size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <select 
              value={filterAccount} 
              onChange={(e) => setFilterAccount(e.target.value)}
              className="bg-transparent text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-450 outline-none cursor-pointer w-full"
            >
              <option value="">Sender Account</option>
              {(accounts || []).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Campaign Filter */}
          <div className="bg-slate-50 dark:bg-slate-900/60 px-3 py-2 rounded-xl flex items-center gap-1.5 border border-slate-100 dark:border-slate-800/80">
            <Megaphone size={11} className="text-slate-400 dark:text-slate-500 shrink-0" />
            <select 
              value={filterCampaign} 
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="bg-transparent text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-450 outline-none cursor-pointer w-full"
            >
              <option value="">Campaigns</option>
              {(campaigns || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── CHAT STREAM CONTAINER ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100/65 dark:divide-slate-850/30">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-10 text-center flex flex-col items-center justify-center h-48"
            >
              <Users className="text-slate-350 dark:text-slate-700 mb-3" size={24} />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-550">No Active Conversations</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-650 mt-1 uppercase font-semibold">Try modifying search or filters</p>
            </motion.div>
          ) : (
            filtered.map((conv) => {
              const lead = conv.lead;
              const name = lead?.full_name || conv.attendee_name || 'LinkedIn Prospect';
              const preview = (conv.last_message_text || '').slice(0, 36);
              const time = conv.last_message_at || conv.updated_at;
              const isActive = conv.id === activeId;
              const isUnread = !lead?.is_read && conv.last_message_from !== 'me';

              // Determine LinkedIn profile node status ring color
              const isAccountActive = accounts.find(a => String(a.id) === String(conv.account_id))?.status === 'ACTIVE';

              return (
                <motion.button
                  key={conv.id}
                  layoutId={`conv-card-${conv.id}`}
                  onClick={() => onSelect(conv)}
                  className={`w-full text-left px-4.5 py-4 transition-all duration-155 flex items-start gap-3.5 relative overflow-hidden outline-none cursor-pointer border-l-4 ${
                    isActive 
                      ? 'bg-blue-50/20 dark:bg-blue-950/10 border-l-blue-600 shadow-[inset_1px_0_0_rgba(37,99,235,0.05)]' 
                      : 'hover:bg-slate-50/40 dark:hover:bg-slate-900/20 border-l-transparent'
                  }`}
                >
                  {/* Initials profile bubble + Connection Status Badge */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-650 flex items-center justify-center text-white text-[10px] font-black uppercase shadow-sm">
                      {initials(name)}
                    </div>
                    {/* Active account system indicator dot */}
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 ${
                      isAccountActive ? 'bg-emerald-500' : 'bg-rose-500'
                    }`} title={isAccountActive ? 'Account Online' : 'Account Restricted'} />
                  </div>

                  {/* Text Container */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${
                        isUnread 
                          ? 'font-black text-slate-900 dark:text-slate-100' 
                          : 'font-extrabold text-slate-750 dark:text-slate-300'
                      }`}>
                        {name}
                      </p>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold shrink-0 uppercase tracking-tight">
                        {timeAgo(time)}
                      </span>
                    </div>

                    {/* Associated Account Name */}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
                        {conv.account_name || 'LinkedIn Node'}
                      </p>
                    </div>
                    
                    {/* Message Preview snippet */}
                    <div className="flex items-center justify-between mt-1.5 gap-2">
                      <p className={`text-[11px] truncate leading-tight flex-1 ${
                        isUnread 
                          ? 'font-black text-slate-800 dark:text-slate-205' 
                          : 'font-medium text-slate-450 dark:text-slate-400'
                      }`}>
                        {preview || 'Connected to pipeline'}
                      </p>
                      
                      {isUnread && (
                        <span className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full shrink-0 animate-pulse shadow-sm shadow-blue-500" />
                      )}
                    </div>

                    {/* AI Sentiment Analysis Pill */}
                    {lead?.ai_sentiment && (
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border flex items-center gap-1 shrink-0 ${
                          lead.ai_sentiment === 'positive' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                            : lead.ai_sentiment === 'negative' 
                            ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/30' 
                            : 'bg-slate-50 text-slate-550 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-850'
                        }`}>
                          <Sparkles size={8} />
                          <span>{lead.ai_sentiment} sentiment</span>
                        </span>
                        
                        {/* Quick Fit Score percentage Indicator */}
                        {lead.fit_score > 0 && (
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
                            lead.fit_score >= 80 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20 dark:text-rose-450 dark:border-rose-900/20' 
                              : 'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-850'
                          }`}>
                            {lead.fit_score >= 80 && <span>🔥 HOT:</span>}
                            <span>{lead.fit_score}%</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
