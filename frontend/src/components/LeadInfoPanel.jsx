import { useState, useEffect } from 'react';
import { ExternalLink, X, Plus, Tag, Calendar, MessageSquare, Clipboard, Star, Brain, Check } from 'lucide-react';
import axios from 'axios';
import { motion } from 'framer-motion';

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
  'Hot Lead': 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
  'Interested': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-900/30',
  'Not Interested': 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
  'CV Received': 'bg-blue-50 text-blue-650 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/20',
  'Call Scheduled': 'bg-purple-50 text-purple-650 border-purple-105/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20',
  'Shortlisted': 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/20',
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
      <div className="flex flex-col items-center justify-center h-full border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 text-center p-6 w-[310px] select-none">
        <div className="w-12 h-12 rounded-[20px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4 shadow-sm">
          <Brain size={18} className="text-blue-500" />
        </div>
        <p className="text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest leading-relaxed max-w-[200px]">
          Select active conversation to view profile intelligence
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto border-l border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 p-5 space-y-6 text-left w-[310px] shrink-0 scrollbar-none select-none">
      
      {/* ─── BIO SEGMENT ──────────────────────────────────────────────────────── */}
      <div className="text-center pb-5 border-b border-slate-100 dark:border-slate-850/50 relative">
        <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-blue-500 to-indigo-650 flex items-center justify-center text-white text-lg font-black uppercase mx-auto shadow-md">
          {initials(lead.full_name)}
        </div>
        <h3 className="font-extrabold text-slate-850 dark:text-slate-100 mt-3 text-sm leading-snug tracking-tight">{lead.full_name}</h3>
        <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 mt-1 leading-snug uppercase tracking-wider">{lead.designation || 'Candidate Node'}</p>
        <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-655 mt-0.5">{lead.company || 'Unknown Company'}</p>
        
        {lead.linkedin_url && (
          <a 
            href={lead.linkedin_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-450 hover:underline mt-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/25 px-3 py-1.5 rounded-xl transition-all"
          >
            <ExternalLink size={10} /> 
            <span>LinkedIn Profile</span>
          </a>
        )}
      </div>

      {/* ─── AI FIT SCORE SEGMENT ──────────────────────────────────────────────── */}
      {lead.fit_score > 0 && (
        <div className="bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Brain size={11} className="text-blue-500" />
              <span>AI Target Match</span>
            </span>
            <span className={`text-[10px] font-black ${
              lead.fit_score >= 80 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
            }`}>{lead.fit_score}%</span>
          </div>
          
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                lead.fit_score >= 80 ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-slate-400'
              }`}
              style={{ width: `${lead.fit_score}%` }}
            />
          </div>
        </div>
      )}

      {/* ─── PIPELINE STATE SELECTOR ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block">Pipeline Status</label>
        <div className="relative">
          <select 
            value={lead.status} 
            onChange={(e) => updateStatus(e.target.value)}
            className="w-full text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors appearance-none"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            ▼
          </div>
        </div>
      </div>

      {/* ─── TAGS & LABELS SEGMENT ───────────────────────────────────────────── */}
      <div className="space-y-2.5">
        <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
          <Tag size={11} className="text-slate-400" />
          <span>Tags & Labels</span>
        </label>
        
        {/* Render Active Tags */}
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <span 
              key={tag} 
              className={`flex items-center gap-1.5 text-[9px] px-2.5 py-0.5 rounded-md font-black uppercase tracking-wider border transition-all ${
                TAG_COLORS[tag] || 'bg-slate-50 text-slate-500 border-slate-100 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-850'
              }`}
            >
              <span>{tag}</span>
              <button onClick={() => removeTag(tag)} className="hover:text-rose-500 transition-colors cursor-pointer">
                <X size={8} strokeWidth={2.5} />
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <p className="text-[9px] font-bold text-slate-350 dark:text-slate-650 uppercase tracking-wider">No labels assigned</p>
          )}
        </div>
        
        {/* Preset quick actions */}
        <div className="flex flex-wrap gap-1 pb-1 pt-1">
          {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
            <button 
              key={tag} 
              onClick={() => addTag(tag)}
              className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-450 transition-colors cursor-pointer"
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
            className="flex-1 text-[10px] font-bold border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-slate-50 dark:bg-slate-900/50 text-slate-700 dark:text-slate-200 focus:outline-none focus:border-blue-500 placeholder:text-slate-400" 
          />
          <button 
            onClick={() => addTag(newTag)} 
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-750 rounded-xl text-slate-600 dark:text-slate-400 flex items-center justify-center cursor-pointer"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* ─── PRIVATE NOTES NOTEPAD ───────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
          <Clipboard size={11} className="text-slate-400" />
          <span>Private Notes</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Add conversation notes, call summary..."
          className="w-full text-xs font-semibold leading-relaxed border border-slate-200 dark:border-slate-800 rounded-2xl px-3 py-2 bg-slate-50 dark:bg-slate-950/40 text-slate-750 dark:text-slate-200 resize-none focus:outline-none focus:border-blue-500 shadow-sm placeholder:text-slate-400"
        />
        {saving && (
          <p className="text-[8px] font-black uppercase text-blue-600 dark:text-blue-400 animate-pulse flex items-center gap-1">
            <Check size={9} strokeWidth={3} />
            <span>Autosaving notes...</span>
          </p>
        )}
      </div>

      {/* ─── DOTTED TIMELINE AUDIT HISTORY ───────────────────────────────────── */}
      <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-850/50">
        <label className="text-[9px] font-black text-slate-455 dark:text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
          <Calendar size={11} className="text-slate-400" />
          <span>Timeline Logs</span>
        </label>
        
        <div className="relative pl-3 space-y-4 border-l border-slate-100 dark:border-slate-850">
          {[
            { label: 'Sequence Initialized', date: lead.connection_sent_at },
            { label: 'Network Connection Accepted', date: lead.accepted_at },
            { label: 'Pitch JD Message Sent', date: lead.jd_sent_at },
            { label: 'Follow-up Sequence 1 Delivered', date: lead.follow_up_1_sent_at },
            { label: 'Follow-up Sequence 2 Delivered', date: lead.follow_up_2_sent_at },
            { label: 'Prospect Replied', date: lead.reply_received_at },
          ].filter((e) => e.date).map((event) => (
            <div key={event.label} className="relative">
              {/* Custom timeline bullet node */}
              <span className="absolute -left-[16.5px] top-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-950 bg-blue-500 shadow-sm" />
              <div className="min-w-0">
                <p className="text-[10px] font-black text-slate-700 dark:text-slate-350 leading-snug">{event.label}</p>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{fmtDate(event.date)}</p>
              </div>
            </div>
          ))}
          {!lead.connection_sent_at && (
            <p className="text-[9px] font-bold text-slate-350 dark:text-slate-600 uppercase tracking-wider">No sequence logs yet</p>
          )}
        </div>
      </div>

    </div>
  );
}
