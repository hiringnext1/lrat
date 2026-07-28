import { useState } from 'react';
import { Search, Megaphone, Users, Sparkles, Inbox, Flame, Pin, PinOff } from 'lucide-react';

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

export default function ConversationList({ conversations, activeId, onSelect, accounts, campaigns, sortBy, onSortChange, pinnedIds = [], onTogglePin }) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCampaign, setFilterCampaign] = useState('');

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

  // Sort pinned items to the very top
  const sortedFiltered = [...filtered].sort((a, b) => {
    const isAPinned = pinnedIds.includes(a.id);
    const isBPinned = pinnedIds.includes(b.id);
    if (isAPinned && !isBPinned) return -1;
    if (!isAPinned && isBPinned) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col h-full border-r border-white/8 select-none w-[340px] shrink-0 text-left" style={{ background: '#0D1221' }}>
      
      {/* ─── SEARCH & FILTER SEGMENT ────────────────────────────────────────── */}
      <div className="p-4 border-b border-white/8 space-y-3 shrink-0" style={{ background: 'rgba(13,18,33,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <Inbox size={16} className="text-blue-400" />
            <span>Outreach Pipeline</span>
          </h2>
          <span className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {filtered.length} Threads
          </span>
        </div>

        {/* Dynamic Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects, campaigns..."
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/8 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-all font-normal"
          />
        </div>

        {/* Sort Group Row */}
        <div className="flex justify-between items-center bg-white/4 p-1.5 rounded-xl border border-white/6">
          <span className="text-xs font-medium text-slate-400 pl-1">Sort by</span>
          <div className="flex gap-1">
            <button
              onClick={() => onSortChange('recency')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                sortBy === 'recency'
                  ? 'bg-blue-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recency
            </button>
            <button
              onClick={() => onSortChange('score')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                sortBy === 'score'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame size={12} /> Hot Leads
            </button>
          </div>
        </div>

        {/* Tabs Control Row */}
        <div className="flex bg-white/4 p-1 rounded-xl border border-white/6">
          {[
            { id: 'all', label: 'All', count: allCount },
            { id: 'unread', label: 'Unread', count: unreadCount },
            { id: 'replied', label: 'Replied', count: repliedCount }
          ].map((t) => (
            <button 
              key={t.id} 
              onClick={() => setTab(t.id)}
              className={`flex-1 relative flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                tab === t.id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{t.label}</span>
              {t.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  tab === t.id 
                    ? t.id === 'unread' ? 'bg-indigo-500 text-white' : t.id === 'replied' ? 'bg-emerald-500 text-white' : 'bg-white/20 text-white'
                    : 'bg-white/8 text-slate-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/8 flex items-center gap-1.5">
            <Users size={13} className="text-slate-400 shrink-0" />
            <select 
              value={filterAccount} 
              onChange={(e) => setFilterAccount(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-300 outline-none cursor-pointer w-full"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">Account</option>
              {(accounts || []).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/8 flex items-center gap-1.5">
            <Megaphone size={13} className="text-slate-400 shrink-0" />
            <select 
              value={filterCampaign} 
              onChange={(e) => setFilterCampaign(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-300 outline-none cursor-pointer w-full"
              style={{ colorScheme: 'dark' }}
            >
              <option value="">Campaign</option>
              {(campaigns || []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── CHAT STREAM CONTAINER ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/4">
        {sortedFiltered.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center h-48">
            <Users className="text-slate-600 mb-2" size={24} />
            <p className="text-sm font-medium text-slate-400">No Conversations Found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          sortedFiltered.map((conv) => {
            const lead = conv.lead;
            const name = lead?.full_name || conv.attendee_name || 'LinkedIn Prospect';
            const preview = (conv.last_message_text || '').slice(0, 50);
            const time = conv.last_message_at || conv.updated_at;
            const isActive = conv.id === activeId;
            const isUnread = Boolean(
              conv.unread === 1 || 
              conv.unread === true || 
              (conv.unread_count && conv.unread_count > 0) || 
              (lead && lead.is_read === 0 && conv.last_message_from !== 'me')
            );
            const isAccountActive = accounts.find(a => String(a.id) === String(conv.account_id))?.status === 'active';
            const isPinned = pinnedIds.includes(conv.id);

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={`w-full text-left px-4 py-4 transition-all flex items-start gap-3.5 relative outline-none cursor-pointer border-l-2 group ${
                  isActive 
                    ? 'bg-blue-600/10 border-l-blue-500' 
                    : 'hover:bg-white/4 border-l-transparent'
                }`}
              >
                {/* Circular avatar with image fallback */}
                <div className="relative shrink-0 mt-0.5">
                  {conv.attendee_avatar ? (
                    <img 
                      src={conv.attendee_avatar} 
                      alt={name} 
                      className="w-10 h-10 rounded-full object-cover border border-blue-500/30"
                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 items-center justify-center text-blue-400 text-xs font-semibold uppercase"
                    style={{ display: conv.attendee_avatar ? 'none' : 'flex' }}
                  >
                    {initials(name)}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0D1221] ${
                    isAccountActive ? 'bg-emerald-400' : 'bg-slate-600'
                  }`} />
                </div>

                {/* Text Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {isPinned && <Pin size={12} className="text-amber-400 fill-amber-400 shrink-0" />}
                      <p className={`text-sm truncate ${isUnread ? 'font-bold text-white' : 'font-medium text-slate-200'}`}>
                        {name}
                      </p>
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="Unread message" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-slate-400 font-normal">
                        {timeAgo(time)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onTogglePin?.(conv.id); }}
                        className="p-1 text-slate-500 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        {isPinned ? <PinOff size={12} /> : <Pin size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Designation / Company in sentence case */}
                  {(lead?.designation || lead?.company) && (
                    <p className="text-xs font-normal text-slate-400 truncate mt-0.5">
                      {lead?.designation ? lead.designation : ''} {lead?.company ? `• ${lead.company}` : ''}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-1 gap-2">
                    <p className={`text-sm truncate leading-snug flex-1 ${isUnread ? 'font-medium text-slate-100' : 'text-slate-400'}`}>
                      {preview || 'LinkedIn Message'}
                    </p>
                  </div>

                  {/* Consolidated Sentiment & Fit Score Badges */}
                  {lead?.ai_sentiment && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                        lead.ai_sentiment === 'positive' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : lead.ai_sentiment === 'negative' 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-white/5 text-slate-400 border-white/8'
                      }`}>
                        <Sparkles size={11} />
                        <span className="capitalize">{lead.ai_sentiment}</span>
                      </span>

                      {lead.fit_score > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                          lead.fit_score >= 80 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : 'bg-white/5 text-slate-400 border-white/8'
                        }`}>
                          {lead.fit_score >= 80 && '🔥 '}
                          {lead.fit_score}% fit
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
