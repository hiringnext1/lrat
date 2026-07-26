import { useState, useEffect } from 'react';
import { ExternalLink, X, Plus, Tag, Calendar, Clipboard, Brain, Check, FileText } from 'lucide-react';
import axios from 'axios';

const PRESET_TAGS = ['Hot Lead', 'Interested', 'Not Interested', 'CV Received', 'Call Scheduled', 'Shortlisted'];

const STATUS_OPTIONS = [
  'pending_connection', 'connection_sent', 'connected',
  'jd_sent', 'follow_up_sent', 'replied', 'shortlisted', 'not_interested'
];

const STATUS_LABELS = {
  pending_connection: 'Pending Connection',
  connection_sent: 'Request Sent',
  connected: 'Connected',
  jd_sent: 'JD Sent',
  follow_up_sent: 'Follow-up Sent',
  replied: 'Replied',
  shortlisted: 'Shortlisted',
  not_interested: 'Excluded',
};

const TAG_COLORS = {
  'Hot Lead':       'bg-rose-500/15 text-rose-400 border-rose-500/25',
  'Interested':     'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Not Interested': 'bg-white/8 text-slate-400 border-white/10',
  'CV Received':    'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Call Scheduled': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Shortlisted':    'bg-green-500/15 text-green-400 border-green-500/25',
};

function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function LeadInfoPanel({ lead, onUpdate }) {
  const [notes, setNotes] = useState(lead?.notes || '');
  const [tags, setTags] = useState(() => {
    try { return JSON.parse(lead?.tags || '[]'); } catch { return []; }
  });
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(lead?.notes || '');
    try { setTags(JSON.parse(lead?.tags || '[]')); } catch { setTags([]); }
  }, [lead?.id]);

  async function saveNotes() {
    if (!lead) return;
    setSaving(true);
    try {
      await axios.put(`/api/leads/${lead.id}`, { notes });
      onUpdate?.();
    } finally {
      setSaving(false);
    }
  }

  async function updateTags(newTags) {
    if (!lead) return;
    setTags(newTags);
    await axios.put(`/api/inbox/leads/${lead.id}/tags`, { tags: newTags });
    onUpdate?.();
  }

  async function updateStatus(status) {
    if (!lead) return;
    await axios.put(`/api/leads/${lead.id}/status`, { status });
    onUpdate?.();
  }

  function addTag(tag) {
    if (!tag.trim() || tags.includes(tag)) return;
    updateTags([...tags, tag]);
    setNewTag('');
  }

  function removeTag(tag) {
    updateTags(tags.filter((t) => t !== tag));
  }

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center h-full border-l border-white/8 text-center p-6 w-[310px] shrink-0 select-none text-left" style={{ background: '#0D1221' }}>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-slate-500 mb-4">
          <Brain size={18} className="text-blue-400" />
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-relaxed max-w-[200px]">
          Select a conversation to view candidate intelligence
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto border-l border-white/8 p-5 space-y-5 text-left w-[310px] shrink-0 select-none" style={{ background: '#0D1221' }}>
      
      {/* ─── BIO SEGMENT ──────────────────────────────────────────────────────── */}
      <div className="text-center pb-4 border-b border-white/8 relative">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-base font-black uppercase mx-auto shadow-sm">
          {initials(lead.full_name)}
        </div>
        <h3 className="font-black text-white mt-3 text-sm leading-snug tracking-tight">{lead.full_name}</h3>
        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{lead.designation || 'Candidate Node'}</p>
        <p className="text-[10px] font-medium text-slate-500 mt-0.5">{lead.company || 'Unknown Company'}</p>
        
        {lead.linkedin_url && (
          <a 
            href={lead.linkedin_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-400 hover:underline mt-3 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-xl transition-all"
          >
            <ExternalLink size={10} />
            <span>LinkedIn Profile</span>
          </a>
        )}
      </div>

      {/* ─── AI FIT SCORE ──────────────────────────────────────────────── */}
      {lead.fit_score > 0 && (
        <div className="bg-white/4 border border-white/8 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Brain size={11} className="text-blue-400" />
              Target Match
            </span>
            <span className={`text-[10px] font-black ${lead.fit_score >= 80 ? 'text-blue-400' : 'text-slate-400'}`}>
              {lead.fit_score}%
            </span>
          </div>
          
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${lead.fit_score >= 80 ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-slate-500'}`}
              style={{ width: `${lead.fit_score}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── PIPELINE STATUS ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Pipeline Status</label>
        <select 
          value={lead.status} 
          onChange={(e) => updateStatus(e.target.value)}
          className="w-full text-xs font-bold border border-white/8 rounded-xl px-3 py-2 bg-white/5 text-white outline-none cursor-pointer focus:border-blue-500/50 transition-colors"
          style={{ colorScheme: 'dark' }}
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
      </div>

      {/* ─── TAGS & LABELS ───────────────────────────────────────────── */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Tag size={11} />
          Tags & Labels
        </label>
        
        {/* Render Active Tags */}
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span 
              key={tag} 
              className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider border ${
                TAG_COLORS[tag] || 'bg-white/5 text-slate-400 border-white/8'
              }`}
            >
              <span>{tag}</span>
              <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">
                <X size={8} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">No tags assigned</p>
          )}
        </div>
        
        {/* Preset quick actions */}
        <div className="flex flex-wrap gap-1 pt-1">
          {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <button 
              key={tag} 
              onClick={() => addTag(tag)}
              className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-dashed border-white/10 text-slate-500 hover:border-blue-500/50 hover:text-blue-400 transition-colors cursor-pointer"
            >
              + {tag}
            </button>
          ))}
        </div>

        {/* Custom Input tag */}
        <div className="flex gap-2">
          <input 
            value={newTag} 
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTag(newTag)}
            placeholder="Custom tag..."
            className="flex-1 text-[10px] font-semibold border border-white/8 rounded-xl px-3 py-1.5 bg-white/5 text-white focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600" 
          />
          <button 
            onClick={() => addTag(newTag)} 
            className="px-2.5 py-1.5 bg-white/8 hover:bg-white/12 rounded-xl text-slate-300 flex items-center justify-center cursor-pointer border border-white/8"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ─── PRIVATE NOTES ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Clipboard size={11} />
          Private Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Add candidate notes, call summary..."
          className="w-full text-xs font-medium leading-relaxed border border-white/8 rounded-xl px-3 py-2 bg-white/5 text-slate-200 resize-none focus:outline-none focus:border-blue-500/50 placeholder:text-slate-600"
        />
        {saving && (
          <p className="text-[8px] font-black uppercase text-blue-400 animate-pulse flex items-center gap-1">
            <Check size={9} strokeWidth={3} />
            Autosaving notes...
          </p>
        )}
      </div>

      {/* ─── TIMELINE LOGS ───────────────────────────────────── */}
      <div className="space-y-3 pt-3 border-t border-white/8">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <Calendar size={11} />
          Sequence Timeline
        </label>
        
        <div className="relative pl-3 space-y-3 border-l border-white/8">
          {[
            { label: 'Sequence Initialized', date: lead.connection_sent_at },
            { label: 'Connection Accepted', date: lead.accepted_at },
            { label: 'Pitch Message Sent', date: lead.jd_sent_at },
            { label: 'Follow-up 1 Delivered', date: lead.follow_up_1_sent_at },
            { label: 'Follow-up 2 Delivered', date: lead.follow_up_2_sent_at },
            { label: 'Prospect Replied', date: lead.reply_received_at },
          ].filter((e) => e.date).map((event) => (
            <div key={event.label} className="relative">
              <span className="absolute -left-[16.5px] top-1 w-2 h-2 rounded-full bg-blue-400 shadow-sm" />
              <div>
                <p className="text-[10px] font-bold text-slate-300 leading-snug">{event.label}</p>
                <p className="text-[9px] text-slate-500 mt-0.5 font-medium">{fmtDate(event.date)}</p>
              </div>
            </div>
          ))}
          {!lead.connection_sent_at && (
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">No sequence logs yet</p>
          )}
        </div>
      </div>

    </div>
  );
}
