import React, { useState, useEffect } from 'react';
import { X, ExternalLink, MapPin, Building2, MessageSquare, Trash2, AlertCircle, Clock, Brain, Tag, Sparkles, Plus, Calendar, Check } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const PRESET_TAGS = ['Hot Lead', 'Interested', 'Not Interested', 'Document Shared', 'Call Scheduled', 'Qualified'];

const STATUS_LABELS = {
  pending_connection: { label: 'Pending Connection', color: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800' },
  connection_sent: { label: 'Connection Sent', color: 'bg-blue-50 text-blue-650 border-blue-100/50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/20' },
  connected: { label: 'Connected', color: 'bg-indigo-50 text-indigo-650 border-indigo-100/50 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/20' },
  jd_sent: { label: 'Pitch Sent', color: 'bg-purple-50 text-purple-600 border-purple-100/50 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20' },
  follow_up_sent: { label: 'Follow-up Sent', color: 'bg-amber-50 text-amber-600 border-amber-100/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/20' },
  replied: { label: 'Replied', color: 'bg-emerald-50 text-emerald-650 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-emerald-900/20' },
  shortlisted: { label: 'Qualified', color: 'bg-green-50 text-green-600 border-green-100/50 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/20' },
  not_interested: { label: 'Excluded', color: 'bg-rose-50 text-rose-600 border-rose-100/50 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/20' },
};

const STATUS_PROGRESS = {
  pending_connection: 12,
  connection_sent: 30,
  connected: 50,
  jd_sent: 70,
  follow_up_sent: 85,
  replied: 100,
  shortlisted: 100,
  not_interested: 100,
};

const TAG_COLORS = {
  'Hot Lead': 'bg-rose-50 text-rose-600 border-rose-105 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30',
  'Interested': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-455 dark:border-emerald-900/30',
  'Not Interested': 'bg-slate-50 text-slate-500 border-slate-205 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800',
  'Document Shared': 'bg-blue-50 text-blue-650 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/20',
  'Call Scheduled': 'bg-purple-50 text-purple-655 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/20',
  'Qualified': 'bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/20',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function LeadDetailModal({ leadId, onClose, onUpdate }) {
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(true);

  useEffect(() => {
    fetchLeadDetails();
    fetchLeadTimeline();
  }, [leadId]);

  async function fetchLeadDetails() {
    try {
      setLoading(true);
      const res = await axios.get(`/api/leads/${leadId}`);
      if (res.data.data) {
        setLead(res.data.data);
        setNotes(res.data.data.notes || '');
        try {
          setTags(JSON.parse(res.data.data.tags || '[]'));
        } catch {
          setTags([]);
        }
      } else {
        setError('Lead not found');
      }
    } catch (err) {
      setError('Failed to load lead details');
    } finally {
      setLoading(false);
    }
  }

  async function fetchLeadTimeline() {
    try {
      setLoadingTimeline(true);
      const res = await axios.get(`/api/leads/${leadId}/timeline`);
      if (res.data?.success) {
        setTimeline(res.data.data || []);
      }
    } catch (e) {
      console.error('Failed to load timeline:', e);
    } finally {
      setLoadingTimeline(false);
    }
  }

  async function handleSaveLead() {
    try {
      setSaving(true);
      await axios.put(`/api/leads/${leadId}`, {
        notes,
        tags: tags,
        status: lead.status
      });
      onUpdate?.();
      onClose();
    } catch (err) {
      alert('Failed to update lead');
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(newStatus) {
    if (!lead) return;
    setLead(prev => ({ ...prev, status: newStatus }));
    try {
      await axios.put(`/api/leads/${leadId}/status`, { status: newStatus });
      onUpdate?.();
    } catch (err) {
      console.error(err);
    }
  }

  async function updateTagsLocally(newTags) {
    setTags(newTags);
  }

  function addTag(tag) {
    if (!tag.trim() || tags.includes(tag)) return;
    updateTagsLocally([...tags, tag]);
    setNewTag('');
  }

  function removeTag(tag) {
    updateTagsLocally(tags.filter((t) => t !== tag));
  }

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete ${lead.full_name}?`)) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/leads/${leadId}`);
      onUpdate?.();
      onClose();
    } catch (err) {
      alert('Failed to delete lead');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-2xl flex flex-col items-center border border-slate-100 dark:border-slate-800">
        <div className="w-8 h-8 border-3 border-blue-650 border-t-transparent rounded-full animate-spin mb-4 text-blue-600"></div>
        <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest animate-pulse">Syncing prospect record...</p>
      </div>
    </div>
  );

  if (error || !lead) return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] shadow-2xl max-w-sm text-center border border-slate-100 dark:border-slate-800">
        <AlertCircle size={40} className="text-rose-500 mx-auto mb-4" />
        <h3 className="text-base font-black uppercase tracking-tight text-slate-800 dark:text-slate-200">Load Failure</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 mb-6 font-semibold uppercase">{error || 'Record offline'}</p>
        <button onClick={onClose} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer">Close</button>
      </div>
    </div>
  );

  const currentStatus = STATUS_LABELS[lead.status] || { label: lead.status, color: 'bg-slate-150 text-slate-600 border-slate-200' };
  const progressPercent = STATUS_PROGRESS[lead.status] || 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800 relative text-left">
        
        {/* Glow ambient accent */}
        <div className="absolute top-0 left-0 w-44 h-44 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modern Header */}
        <div className="relative bg-slate-950 p-6 md:p-8 shrink-0">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-650 border border-slate-700 shrink-0 overflow-hidden shadow-md flex items-center justify-center text-white text-2xl font-black uppercase">
              {lead.profile_photo_url ? (
                <img src={lead.profile_photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                lead.full_name?.charAt(0)
              )}
            </div>
            
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black text-white tracking-tight truncate leading-tight">{lead.full_name}</h2>
              <p className="text-slate-400 text-xs truncate font-semibold mt-0.5">{lead.designation || 'Prospect profile'}</p>
              
              <div className="flex items-center gap-2 mt-3.5">
                {lead.linkedin_url && (
                  <a 
                    href={lead.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-all shadow-md active:scale-95"
                  >
                    <ExternalLink size={10} strokeWidth={2.5} /> 
                    <span>Open LinkedIn</span>
                  </a>
                )}
                
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest bg-white/5 border-white/10 text-slate-350">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>{currentStatus.label}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Double-Column Content Layout */}
        <div className="w-full flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-slate-950/20 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          {/* ───────────────── LEFT COLUMN (Prospect Profile Info) ───────────────── */}
          <div className="space-y-6">
            
            {/* Associated Firm & Geography */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Building2 size={12} className="text-blue-500 animate-pulse" /> 
                  <span>Associated Firm</span>
                </label>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{lead.company || '—'}</p>
              </div>
              
              <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <MapPin size={12} className="text-rose-500" /> 
                  <span>Geography</span>
                </label>
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate">{lead.location || '—'}</p>
              </div>
            </div>

            {/* AI Fit Target Match Score */}
            {lead.fit_score > 0 && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest flex items-center gap-1.5">
                    <Brain size={12} className="text-purple-500" /> 
                    <span>AI Target Match Score</span>
                  </label>
                  <span className={`text-xs font-black ${
                    lead.fit_score >= 80 ? 'text-blue-650 dark:text-blue-400' : 'text-slate-500'
                  }`}>{lead.fit_score}% Fit</span>
                </div>
                
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      lead.fit_score >= 80 ? 'bg-gradient-to-r from-blue-550 to-indigo-650' : 'bg-slate-400'
                    }`}
                    style={{ width: `${lead.fit_score}%` }}
                  />
                </div>
              </div>
            )}

            {/* AI Fit Explanation Reason */}
            {lead.ai_fit_reason && (
              <div className="bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/20 p-5 rounded-2xl space-y-2">
                <label className="text-[9px] font-black text-purple-650 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={11} className="animate-pulse" /> 
                  <span>AI Qualification Intel</span>
                </label>
                <p className="text-xs font-semibold text-slate-750 dark:text-slate-300 leading-relaxed italic">
                  "{lead.ai_fit_reason}"
                </p>
              </div>
            )}

            {/* AI Sentiment analysis */}
            {lead.ai_sentiment && (
              <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest block">AI Response Sentiment</label>
                <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md border ${
                  lead.ai_sentiment === 'positive' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30' 
                    : lead.ai_sentiment === 'negative' 
                    ? 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-455 dark:border-rose-900/30' 
                    : 'bg-slate-50 text-slate-500 border-slate-205 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800'
                }`}>
                  <Sparkles size={9} />
                  {lead.ai_sentiment} response
                </span>
              </div>
            )}
          </div>

          {/* ───────────────── RIGHT COLUMN (Recruiter Actions & Notes) ────────────── */}
          <div className="space-y-6">
            
            {/* Status Selector & Stage Progress */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">CRM pipeline state</label>
                <div className="relative">
                  <select 
                    value={lead.status} 
                    onChange={(e) => updateStatus(e.target.value)}
                    className="w-full text-xs font-black border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-205 outline-none cursor-pointer hover:border-slate-300 dark:hover:border-slate-750 transition-colors appearance-none"
                  >
                    {Object.keys(STATUS_LABELS).map((s) => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
                    ▼
                  </div>
                </div>
              </div>

              {/* Progress gauge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                  <span>STAGE PROGRESS</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>
            </div>

            {/* Canned Tags / Labels Cloud */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-3">
              <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
                <Tag size={11} className="text-slate-400" />
                <span>Prospect Labels</span>
              </label>
              
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span 
                    key={tag} 
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border transition-all ${
                      TAG_COLORS[tag] || 'bg-slate-50 text-slate-500 border-slate-150 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-850'
                    }`}
                  >
                    <span>{tag}</span>
                    <button onClick={() => removeTag(tag)} className="hover:text-rose-500 transition-colors cursor-pointer ml-1">
                      <X size={8} strokeWidth={2.5} />
                    </button>
                  </span>
                ))}
                {tags.length === 0 && (
                  <p className="text-[9px] font-bold text-slate-350 dark:text-slate-650 uppercase tracking-wider">No labels assigned</p>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1 pt-1.5">
                {PRESET_TAGS.filter((t) => !tags.includes(t)).map((tag) => (
                  <button 
                    key={tag} 
                    onClick={() => addTag(tag)}
                    className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border border-dashed border-slate-205 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    + {tag}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input 
                  value={newTag} 
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag(newTag)}
                  placeholder="Custom tag..."
                  className="flex-1 text-[10px] font-bold border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-205 focus:outline-none focus:border-blue-500 placeholder:text-slate-400" 
                />
                <button 
                  onClick={() => addTag(newTag)} 
                  className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 border border-slate-200 dark:border-slate-750 rounded-xl text-slate-600 dark:text-slate-450 flex items-center justify-center cursor-pointer"
                >
                  <Plus size={13} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Notes Notepad Area */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
                <MessageSquare size={12} className="text-amber-500" /> 
                <span>Outreach Intelligence log</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add prospect notes, document links, feedback logs..."
                className="w-full h-24 text-xs font-semibold leading-relaxed border border-slate-150 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-205 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/10 focus:border-blue-500 transition-all resize-none shadow-sm placeholder:text-slate-350"
              />
            </div>

            {/* Dotted Timeline History logs */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850/50">
              <label className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest block flex items-center gap-1.5">
                <Calendar size={11} className="text-slate-400" />
                <span>Timeline audit logs</span>
              </label>
              
              <div className="relative pl-3.5 space-y-3.5 border-l border-slate-150 dark:border-slate-800 max-h-48 overflow-y-auto pr-1">
                {timeline.map((event) => {
                  const label = (() => {
                    switch (event.action_type) {
                      case 'connection_sent': return 'Connection Request Sent';
                      case 'connection_accepted': return 'Connection Accepted';
                      case 'jd_sent': return 'Pitch / Offer Sent';
                      case 'follow_up_sent': return 'Follow-up Sent';
                      case 'reply_detected': return 'Prospect Replied';
                      case 'warning': return 'Warning / Alert';
                      default: return (event.action_type || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    }
                  })();

                  const color = (() => {
                    switch (event.action_type) {
                      case 'connection_sent': return 'bg-blue-500';
                      case 'connection_accepted': return 'bg-indigo-500';
                      case 'jd_sent': return 'bg-purple-500';
                      case 'follow_up_sent': return 'bg-amber-500';
                      case 'reply_detected': return 'bg-emerald-500';
                      case 'warning': return 'bg-rose-550';
                      default: return 'bg-slate-405';
                    }
                  })();

                  return (
                    <div key={event.id} className="relative">
                      <span className={`absolute -left-[19.5px] top-1.5 w-2 h-2 rounded-full border-2 border-white dark:border-slate-950 ${color}`} />
                      <div>
                        <p className="text-[10px] font-black text-slate-700 dark:text-slate-350 leading-none">
                          {label}
                          {event.account_name && (
                            <span className="text-[8px] font-bold text-blue-500 dark:text-blue-400"> via {event.account_name}</span>
                          )}
                        </p>
                        {event.message_preview && (
                          <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 italic font-medium">"{event.message_preview.slice(0, 80)}..."</p>
                        )}
                        {event.error_message && (
                          <p className="text-[8px] text-rose-500 dark:text-rose-400 mt-0.5">Error: {event.error_message}</p>
                        )}
                        <p className="text-[8px] font-bold text-slate-400 dark:text-slate-550 mt-1 uppercase">
                          {new Date(event.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {timeline.length === 0 && !loadingTimeline && (
                  <p className="text-[9px] font-bold text-slate-355 dark:text-slate-600 uppercase tracking-wider">No sequence logs yet</p>
                )}
                {loadingTimeline && (
                  <p className="text-[9px] font-bold text-slate-300 dark:text-slate-750 uppercase tracking-wider animate-pulse">Syncing timeline...</p>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 z-10">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <Trash2 size={13} /> 
            <span>{deleting ? 'De-coupling...' : 'Delete Node'}</span>
          </button>
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-450 hover:text-slate-650 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveLead}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Syncing...' : 'Update Lead'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
