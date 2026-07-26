import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, CheckCheck, Loader2, Megaphone, Check, FolderClosed, Info, Calendar, Star, PhoneCall, Ban, Zap } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';

function timeStr(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFirstName(fullName) {
  if (!fullName) return 'there';
  return fullName.trim().split(' ')[0];
}

export default function ChatWindow({ conversation, onMarkedReplied, cannedMessages }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTermCanned, setSearchTermCanned] = useState('');
  const [draftReply, setDraftReply] = useState('');
  const [draftStatus, setDraftStatus] = useState('none');
  const [leadStatus, setLeadStatus] = useState(conversation?.lead?.status || '');
  const bottomRef = useRef(null);

  const lead = conversation?.lead;
  const firstName = getFirstName(lead?.full_name || conversation?.attendee_name);

  useEffect(() => {
    if (!conversation) return;
    setMessages([]);
    setSuggestions([]);
    setLoadingMessages(true);
    setLeadStatus(conversation.lead?.status || '');

    axios.get(`/api/inbox/conversations/${conversation.id}/messages`)
      .then((r) => {
        const msgs = r.data.data || [];
        setMessages(msgs);
        
        const last = [...msgs].reverse().find((m) => !m.is_from_me);
        if (last && conversation.lead) {
          setLoadingSuggestions(true);
          axios.post('/api/inbox/ai-reply-suggestions', {
            lead_id: conversation.lead.id,
            last_message: last.text || '',
            conversation_history: msgs.slice(-10)
          })
          .then(res => setSuggestions(res.data.data || []))
          .catch(err => console.error('Auto suggestions error:', err))
          .finally(() => setLoadingSuggestions(false));
        }
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));

    if (conversation.lead) {
      setDraftReply(conversation.lead.ai_draft_reply || '');
      setDraftStatus(conversation.lead.ai_draft_status || 'none');
    } else {
      setDraftReply('');
      setDraftStatus('none');
    }
  }, [conversation?.id, conversation?.lead?.id]);

  useEffect(() => {
    const handleNewReply = (data) => {
      if (conversation?.id && data.lead_id === conversation.lead?.id) {
        axios.get(`/api/inbox/conversations/${conversation.id}/messages`)
          .then((r) => setMessages(r.data.data || []));
        if (data.ai_draft_reply) {
          setDraftReply(data.ai_draft_reply);
          setDraftStatus(data.ai_draft_status || 'pending_review');
        }
      }
    };
    socket.on('new_reply', handleNewReply);
    return () => socket.off('new_reply', handleNewReply);
  }, [conversation?.id, conversation?.lead?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function insertCanned(templateContent) {
    const parsedText = templateContent.replace(/\{\{\s*name\s*\}\}/gi, firstName);
    setInput(parsedText);
    setShowCanned(false);
    setSearchTermCanned('');
  }

  async function updateLeadPipelineStatus(newStatus) {
    if (!lead?.id) return;
    setLeadStatus(newStatus);
    try {
      await axios.put(`/api/leads/${lead.id}/status`, { status: newStatus });
      onMarkedReplied?.();
    } catch (e) { console.error(e); }
  }

  async function approveDraft() {
    if (!conversation?.lead?.id || !draftReply) return;
    setSending(true);
    const textToSend = draftReply;
    try {
      await axios.post(`/api/inbox/conversations/${conversation.id}/approve-draft`, {
        lead_id: conversation.lead.id,
        message: textToSend
      });
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: textToSend,
        is_from_me: true,
        created_at: new Date().toISOString(),
      }]);
      setDraftReply('');
      setDraftStatus('approved');
      setSuggestions([]);
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  async function rejectDraft() {
    if (!conversation?.lead?.id) return;
    try {
      await axios.post(`/api/inbox/leads/${conversation.lead.id}/reject-draft`);
      setDraftReply('');
      setDraftStatus('rejected');
    } catch (e) { console.error(e); }
  }

  function editDraft() {
    if (!draftReply) return;
    setInput(draftReply);
    rejectDraft();
  }

  async function send() {
    if (!input.trim() || !conversation) return;
    const textToSend = input;
    setInput('');
    
    const optimisticMsg = {
      id: 'opt-' + Date.now(),
      text: textToSend,
      is_from_me: true,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setSending(true);

    try {
      await axios.post(`/api/inbox/conversations/${conversation.id}/reply`, { message: textToSend });
      setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? { ...m, pending: false } : m));
      setSuggestions([]);
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
      setInput(textToSend);
    } finally {
      setSending(false);
    }
  }

  async function getAISuggestions() {
    if (!conversation?.lead?.id) return;
    const lastFromThem = [...messages].reverse().find((m) => !m.is_from_me);
    if (!lastFromThem) return;
    setLoadingSuggestions(true);
    try {
      const res = await axios.post('/api/inbox/ai-reply-suggestions', {
        lead_id: conversation.lead.id,
        last_message: lastFromThem.text || '',
        conversation_history: messages.slice(-10),
      });
      setSuggestions(res.data.data || []);
    } catch (e) { console.error(e); }
    finally { setLoadingSuggestions(false); }
  }

  // Quick Smart Response Chips (1-Click Templates)
  const smartChips = [
    { label: '📅 Send Calendar', text: `Hi ${firstName}, here is my booking link to pick a convenient slot: https://calendly.com/your-team` },
    { label: '📄 Send Info Brief', text: `Hi ${firstName}, I've attached our overview details. Let me know if you have any questions!` },
    { label: '📞 Request Phone', text: `Hi ${firstName}, thanks for connecting! What is the best phone number or email to reach you?` },
  ];

  const filteredCanned = (cannedMessages || []).filter(cm => 
    cm.title.toLowerCase().includes(searchTermCanned.toLowerCase()) || 
    cm.content.toLowerCase().includes(searchTermCanned.toLowerCase())
  );

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center" style={{ background: '#080C18' }}>
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center text-slate-500 mb-4">
          <Send size={24} className="rotate-45 text-blue-400" />
        </div>
        <h3 className="font-black text-white text-sm uppercase tracking-wider">Recruiter Workspace</h3>
        <p className="text-[10px] text-slate-500 mt-2 uppercase font-bold tracking-widest max-w-[240px] leading-relaxed">
          Select a candidate profile from the left sidebar to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative text-left" style={{ background: '#080C18' }}>

      {/* ─── HEADER PANEL WITH QUICK PIPELINE ACTION PILLS ──────────────────── */}
      <div className="px-6 py-3 border-b border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0" style={{ background: 'rgba(13,18,33,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-white text-sm tracking-tight truncate">
              {lead?.full_name || conversation.attendee_name || 'Prospect'}
            </h3>
            {lead?.campaign_id && (
              <span className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">
                <Megaphone size={9} /> Campaign
              </span>
            )}
          </div>
          <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate uppercase tracking-wider">
            {lead?.designation || 'Candidate'} {lead?.company ? `• ${lead.company}` : ''}
          </p>
        </div>
        
        {/* 1-Click Pipeline Status Pill Bar */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button
            onClick={() => updateLeadPipelineStatus('replied')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 ${
              leadStatus === 'replied'
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'border-white/8 bg-white/4 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10'
            }`}
            title="Mark as Replied"
          >
            <Zap size={10} /> Replied
          </button>

          <button
            onClick={() => updateLeadPipelineStatus('shortlisted')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 ${
              leadStatus === 'shortlisted'
                ? 'bg-purple-500/20 border-purple-500/40 text-purple-400'
                : 'border-white/8 bg-white/4 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10'
            }`}
            title="Shortlist Lead"
          >
            <Star size={10} /> Shortlist
          </button>

          <button
            onClick={() => updateLeadPipelineStatus('not_interested')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all flex items-center gap-1 ${
              leadStatus === 'not_interested'
                ? 'bg-red-500/20 border-red-500/40 text-red-400'
                : 'border-white/8 bg-white/4 text-slate-400 hover:text-red-400 hover:bg-red-500/10'
            }`}
            title="Exclude Lead"
          >
            <Ban size={10} /> Exclude
          </button>
        </div>
      </div>

      {/* ─── MESSAGES TIMELINE STREAM ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loadingMessages && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <Loader2 size={18} className="animate-spin text-blue-400" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Loading timeline...</p>
          </div>
        )}
        
        {!loadingMessages && messages.length === 0 && (
          <div className="text-center py-20 border border-white/6 rounded-2xl p-6 max-w-sm mx-auto" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <Info size={18} className="mx-auto text-slate-600 mb-2" />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">No Messages Logged</p>
            <p className="text-[9px] text-slate-600 mt-1 uppercase font-semibold">Messages show once sequence starts or response arrives</p>
          </div>
        )}
        
        {(() => {
          const sortedMessages = [...messages].sort((a, b) => {
            const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
            const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
            return timeA - timeB;
          });
          return sortedMessages.map((msg) => {
            const fromMe = msg.is_from_me || msg.from_me;
            const isAutomated = fromMe && (msg.text && (msg.text.includes('Hi') || msg.text.includes('Hello')) && lead?.jd_sent_at);

            return (
              <div key={msg.id} className={`flex flex-col ${fromMe ? 'items-end' : 'items-start'}`}>
                {isAutomated && (
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                    <Sparkles size={8} /> Automated Sequence
                  </span>
                )}

                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm relative ${
                  fromMe 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white/6 border border-white/8 text-slate-200 rounded-tl-none'
                } ${msg.pending ? 'opacity-70' : ''}`}>
                  <p className="whitespace-pre-wrap break-words">{msg.text || msg.content || ''}</p>
                  
                  <div className="flex items-center justify-between gap-3 mt-2 shrink-0">
                    <span className={`text-[8px] font-bold ${fromMe ? 'text-blue-200/80' : 'text-slate-500'}`}>
                      {timeStr(msg.created_at || msg.timestamp)} {msg.pending && '• Sending...'}
                    </span>
                    {fromMe && <CheckCheck size={11} className="text-blue-200 shrink-0" />}
                  </div>
                </div>
              </div>
            );
          });
        })()}
        <div ref={bottomRef} />
      </div>

      {/* ─── AI AUTO-DRAFT BANNER ────────────────────────────────────────── */}
      <AnimatePresence>
        {draftStatus === 'pending_review' && draftReply && (
          <motion.div
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
            className="px-6 py-4 border-t border-purple-500/20 flex flex-col gap-3 z-10 text-left"
            style={{ background: 'rgba(147,51,234,0.08)', backdropFilter: 'blur(12px)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={13} className="animate-pulse text-purple-400" />
                AI Auto-Draft Reply Ready
              </span>
              <span className="text-[8px] font-black text-purple-300 uppercase tracking-wider bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                Pending Approval
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-200 bg-white/5 border border-purple-500/20 p-3 rounded-xl">
              <p className="whitespace-pre-wrap leading-relaxed">{draftReply}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={approveDraft} disabled={sending}
                className="text-[9px] font-black uppercase tracking-wider bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
              >
                {sending ? <Loader2 size={11} className="animate-spin text-white" /> : <Check size={11} strokeWidth={3} />}
                Approve & Send
              </button>
              <button onClick={editDraft} className="text-[9px] font-black uppercase tracking-wider bg-white/8 hover:bg-white/12 text-slate-300 border border-white/10 px-3.5 py-2 rounded-xl transition-all cursor-pointer">
                Edit Draft
              </button>
              <button onClick={rejectDraft} className="text-[9px] font-black uppercase tracking-wider text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all cursor-pointer ml-auto">
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI INTENT CHIPS & SUGGESTIONS BAR ───────────────────────────── */}
      <div className="px-6 py-2 border-t border-white/8 flex gap-2 flex-wrap items-center z-10" style={{ background: '#0D1221' }}>
        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1 shrink-0">
          <Zap size={10} /> Quick Actions:
        </span>

        {smartChips.map(chip => (
          <button
            key={chip.label}
            onClick={() => setInput(chip.text)}
            className="text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 text-slate-300 border border-white/8 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
          >
            {chip.label}
          </button>
        ))}

        {suggestions.map((s) => {
          const parsedText = s.text.replace(/\{\{\s*name\s*\}\}/gi, firstName);
          return (
            <button 
              key={s.type} 
              onClick={() => { setInput(parsedText); setSuggestions([]); }}
              className="text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-lg hover:bg-purple-500/20 transition-all cursor-pointer"
            >
              {s.type.replace(/_/g, ' ')}
            </button>
          );
        })}
      </div>

      {/* ─── INPUT PANEL ──────────────────────────────────────────── */}
      <div className="px-6 py-3.5 border-t border-white/8 shrink-0" style={{ background: '#0D1221' }}>
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || !e.shiftKey)) { e.preventDefault(); send(); } }}
              placeholder="Type message... (Enter to send, Shift+Enter for newline)"
              rows={2}
              className="w-full text-xs font-medium leading-relaxed border border-white/8 rounded-2xl pl-4 pr-20 py-2.5 bg-white/5 focus:outline-none focus:border-blue-500/50 text-white placeholder-slate-600 transition-all resize-none"
            />
            
            <div className="absolute bottom-2.5 right-3 flex items-center gap-1">
              <div className="relative">
                <button 
                  onClick={() => setShowCanned(!showCanned)}
                  className="p-1.5 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-white/8 transition-colors"
                  title="Canned templates"
                >
                  <FolderClosed size={14} />
                </button>
                
                <AnimatePresence>
                  {showCanned && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute bottom-9 right-0 w-64 border border-white/10 rounded-2xl z-30 max-h-64 overflow-hidden flex flex-col p-2"
                      style={{ background: '#0D1221', backdropFilter: 'blur(16px)' }}
                    >
                      <input 
                        value={searchTermCanned}
                        onChange={(e) => setSearchTermCanned(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full text-[10px] font-bold border border-white/8 rounded-xl px-2.5 py-1.5 mb-1.5 bg-white/5 text-white outline-none placeholder-slate-600"
                      />
                      
                      <div className="flex-1 overflow-y-auto max-h-44 space-y-1">
                        {filteredCanned.length === 0 ? (
                          <div className="p-4 text-center text-[9px] font-bold uppercase text-slate-500">No templates found</div>
                        ) : (
                          filteredCanned.map((cm) => (
                            <button 
                              key={cm.id} 
                              onClick={() => insertCanned(cm.content)}
                              className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/8 text-slate-300 transition-colors"
                            >
                              <p className="font-bold text-[10px] uppercase tracking-wider text-blue-400 flex items-center gap-1">
                                <Check size={10} /> {cm.title}
                              </p>
                              <p className="text-[9px] text-slate-500 truncate mt-0.5">{cm.content.replace(/\{\{\s*name\s*\}\}/gi, firstName)}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={() => getAISuggestions()} 
                disabled={loadingSuggestions}
                className="p-1.5 text-purple-400 hover:bg-purple-500/10 rounded-lg disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer" 
                title="Generate AI Reply"
              >
                {loadingSuggestions ? <Loader2 size={13} className="animate-spin text-purple-400" /> : <Sparkles size={13} />}
              </button>
            </div>
          </div>

          <button 
            onClick={send} 
            disabled={sending || !input.trim()}
            className="p-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl disabled:opacity-40 transition-all shadow-lg shadow-blue-500/20 shrink-0 cursor-pointer"
          >
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
