import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, ChevronDown, CheckCheck, Loader2, Megaphone, Check, Smile, FolderClosed, Info, UserCheck2 } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import socket from '../socket';

function timeStr(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!conversation) return;
    setMessages([]);
    setSuggestions([]);
    setLoadingMessages(true);
    axios.get(`/api/inbox/conversations/${conversation.id}/messages`)
      .then((r) => {
        const msgs = r.data.data || [];
        setMessages(msgs);
        
        // Auto-fetch suggestions if latest message is from the prospect
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

  async function approveDraft() {
    if (!conversation?.lead?.id || !draftReply) return;
    setSending(true);
    try {
      await axios.post(`/api/inbox/conversations/${conversation.id}/approve-draft`, {
        lead_id: conversation.lead.id,
        message: draftReply
      });
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: draftReply,
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
    } catch (e) {
      console.error(e);
    }
  }

  async function editDraft() {
    if (!draftReply) return;
    setInput(draftReply);
    rejectDraft();
  }

  async function send() {
    if (!input.trim() || !conversation) return;
    setSending(true);
    try {
      await axios.post(`/api/inbox/conversations/${conversation.id}/reply`, { message: input });
      setMessages((prev) => [...prev, {
        id: Date.now(),
        text: input,
        is_from_me: true,
        created_at: new Date().toISOString(),
      }]);
      setInput('');
      setSuggestions([]);
    } catch (e) {
      console.error(e);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function markReplied() {
    if (!conversation?.lead?.id) return;
    await axios.post(`/api/leads/${conversation.lead.id}/mark-replied`);
    onMarkedReplied?.();
  }

  // Filter canned responses
  const filteredCanned = (cannedMessages || []).filter(cm => 
    cm.title.toLowerCase().includes(searchTermCanned.toLowerCase()) || 
    cm.content.toLowerCase().includes(searchTermCanned.toLowerCase())
  );

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#fbfcfd] dark:bg-slate-950 text-center p-8 relative">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] dark:opacity-[0.05] pointer-events-none" />
        <div className="w-16 h-16 rounded-[24px] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-5 shadow-sm">
          <Send size={22} className="rotate-45 text-blue-550 dark:text-blue-450" />
        </div>
        <h3 className="font-black text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Recruiter Workspace</h3>
        <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-2 uppercase font-bold tracking-widest max-w-[240px] leading-relaxed">
          Select a candidate profile from the left sidebar panel to begin conversation
        </p>
      </div>
    );
  }

  const lead = conversation.lead;

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden relative text-left">
      <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.015] pointer-events-none" />

      {/* ─── HEADER PANEL ────────────────────────────────────────────────────── */}
      <div className="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md z-10">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="font-extrabold text-slate-850 dark:text-slate-100 text-sm tracking-tight truncate">
              {lead?.full_name || conversation.attendee_name || 'Prospect'}
            </h3>
            {lead?.campaign_id && (
              <span className="flex items-center gap-1 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100/50 dark:border-blue-900/20 text-blue-600 dark:text-blue-450 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">
                <Megaphone size={9} />
                <span>Campaign Lead</span>
              </span>
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-450 dark:text-slate-500 mt-1 truncate max-w-[420px] uppercase tracking-wider">
            {lead?.designation || 'LinkedIn Candidate'} {lead?.company ? `• ${lead.company}` : ''}
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          {lead?.reply_received ? (
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <CheckCheck size={11} strokeWidth={2.5} /> 
              <span>Converted Lead</span>
            </span>
          ) : (
            <button 
              onClick={markReplied} 
              className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-500 border border-blue-150 dark:border-blue-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Mark Replied
            </button>
          )}
        </div>
      </div>

      {/* ─── MESSAGES TIMELINE STREAM ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/30 dark:bg-slate-950/10">
        
        {loadingMessages && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 size={20} className="animate-spin text-blue-600" />
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest animate-pulse">Syncing timeline...</p>
          </div>
        )}
        
        {!loadingMessages && messages.length === 0 && (
          <div className="text-center py-24 border border-dashed border-slate-150 dark:border-slate-800 rounded-3xl p-6 max-w-sm mx-auto bg-white/50 dark:bg-slate-900/40">
            <Info size={18} className="mx-auto text-slate-350 dark:text-slate-650 mb-2" />
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-550 uppercase tracking-widest">No Message History Logged</p>
            <p className="text-[9px] text-slate-350 dark:text-slate-650 mt-1 uppercase font-semibold">Messages will show up when sequence runs or responses arrive</p>
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
            
            // Check if message is automated (e.g. initial template matches or empty manual sender)
            const isAutomated = fromMe && (msg.text && (msg.text.includes('Hi') || msg.text.includes('Hello')) && lead?.jd_sent_at);

            return (
              <div key={msg.id} className={`flex flex-col ${fromMe ? 'items-end' : 'items-start'}`}>
                
                {/* Optional Automated Status Tag */}
                {isAutomated && (
                  <span className="text-[8px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-1 mr-1 flex items-center gap-1.5">
                    <Sparkles size={8} />
                    Automated outreach
                  </span>
                )}

                <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-[0_2px_8px_rgba(0,0,0,0.015)] relative ${
                  fromMe 
                    ? 'bg-gradient-to-tr from-blue-600 to-indigo-650 dark:from-blue-650 dark:to-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-150 rounded-tl-none border border-slate-100 dark:border-slate-800/80'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.text || msg.content || ''}</p>
                  
                  <div className="flex items-center justify-between gap-3 mt-2 shrink-0">
                    <span className={`text-[8px] font-bold ${fromMe ? 'text-blue-200/80' : 'text-slate-400 dark:text-slate-550'}`}>
                      {timeStr(msg.created_at || msg.timestamp)}
                    </span>
                    
                    {fromMe && (
                      <span className="text-blue-200">
                        <CheckCheck size={11} strokeWidth={2.5} />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          });
        })()}
        <div ref={bottomRef} />
      </div>

      {/* ─── AI AUTO-DRAFT REVIEW PANEL ────────────────────────────────────────── */}
      <AnimatePresence>
        {draftStatus === 'pending_review' && draftReply && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-950/20 dark:to-indigo-950/20 flex flex-col gap-3.5 z-10 shadow-[0_-4px_16px_rgba(147,51,234,0.04)] text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-purple-650 dark:text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles size={14} className="animate-pulse text-purple-500" />
                <span>AI Auto-Draft Reply Ready</span>
              </span>
              <span className="text-[8px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded">
                Pending Approval
              </span>
            </div>

            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-900/60 border border-purple-100/60 dark:border-purple-900/30 p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.01)] relative">
              <p className="whitespace-pre-wrap leading-relaxed">{draftReply}</p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={approveDraft}
                disabled={sending}
                className="text-[9px] font-black uppercase tracking-wider bg-purple-650 hover:bg-purple-750 text-white px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm shadow-purple-500/10 flex items-center gap-1.5"
              >
                {sending ? <Loader2 size={11} className="animate-spin text-white" /> : <Check size={11} strokeWidth={3} />}
                <span>Approve & Send</span>
              </button>

              <button
                onClick={editDraft}
                className="text-[9px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-350 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <span>Edit Draft</span>
              </button>

              <button
                onClick={rejectDraft}
                className="text-[9px] font-black uppercase tracking-wider bg-transparent text-rose-600 hover:text-rose-700 dark:text-rose-450 hover:bg-rose-950/20 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ml-auto"
              >
                <span>Dismiss</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── AI REPLY SUGGESTIONS BAR ────────────────────────────────────────── */}
      <AnimatePresence>
        {suggestions.length > 0 && draftStatus !== 'pending_review' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="px-6 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900 flex gap-2 flex-wrap items-center z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.02)]"
          >
            <span className="text-[9px] font-black text-purple-650 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5 mr-1 shrink-0">
              <Sparkles size={12} className="animate-pulse" /> 
              <span>AI Reply Wizard:</span>
            </span>
            
            {suggestions.map((s) => (
              <button 
                key={s.type} 
                onClick={() => { setInput(s.text); setSuggestions([]); }}
                className="text-[9px] font-black uppercase tracking-widest bg-purple-50/70 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30 px-3.5 py-1.5 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                {s.type.replace(/_/g, ' ')}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── INPUT PANEL & TOOLBARS ──────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0 bg-white dark:bg-slate-900">
        <div className="flex items-end gap-3.5">
          
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type message... (Enter to send, Shift+Enter for new line)"
              rows={2}
              className="w-full text-xs font-semibold leading-relaxed border border-slate-200 dark:border-slate-800 rounded-2xl pl-4 pr-24 py-3 bg-slate-50 dark:bg-slate-950/30 focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 text-slate-700 dark:text-slate-200 transition-all resize-none shadow-[0_2px_8px_rgba(0,0,0,0.01)] placeholder:text-slate-400"
            />
            
            {/* Quick response & AI triggers inside input panel */}
            <div className="absolute bottom-3 right-3 flex items-center gap-1">
              
              {/* Canned Messages Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setShowCanned(!showCanned)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350 transition-colors rounded-lg hover:bg-slate-100/60 dark:hover:bg-slate-800"
                  title="Canned templates"
                >
                  <FolderClosed size={13} />
                </button>
                
                <AnimatePresence>
                  {showCanned && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                      className="absolute bottom-9 right-0 w-64 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl shadow-xl z-20 max-h-64 overflow-hidden flex flex-col p-1.5"
                    >
                      {/* Search Canned Messages */}
                      <input 
                        value={searchTermCanned}
                        onChange={(e) => setSearchTermCanned(e.target.value)}
                        placeholder="Search templates..."
                        className="w-full text-[10px] font-bold border border-slate-100 dark:border-slate-800 rounded-xl px-2.5 py-1.5 mb-1.5 bg-slate-50 dark:bg-slate-950/40 text-slate-700 dark:text-slate-200 outline-none"
                      />
                      
                      <div className="flex-1 overflow-y-auto max-h-44 space-y-0.5">
                        {filteredCanned.length === 0 ? (
                          <div className="p-4 text-center text-[9px] font-black uppercase text-slate-400 dark:text-slate-650">No matches</div>
                        ) : (
                          filteredCanned.map((cm) => (
                            <button 
                              key={cm.id} 
                              onClick={() => { setInput(cm.content); setShowCanned(false); setSearchTermCanned(''); }}
                              className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-750 dark:text-slate-300 transition-colors text-ellipsis overflow-hidden"
                            >
                              <p className="font-extrabold text-[10px] uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                                <Check size={10} strokeWidth={3} />
                                {cm.title}
                              </p>
                              <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate mt-0.5 leading-normal">{cm.content}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI reply suggestion generator button */}
              <button 
                onClick={getAISuggestions} 
                disabled={loadingSuggestions}
                className="p-1.5 text-purple-650 hover:text-purple-750 hover:bg-purple-50 dark:hover:bg-purple-950/20 rounded-lg disabled:opacity-50 transition-all flex items-center justify-center cursor-pointer" 
                title="Trigger AI Reply suggestions"
              >
                {loadingSuggestions ? <Loader2 size={13} className="animate-spin text-purple-500" /> : <Sparkles size={13} />}
              </button>
            </div>
          </div>

          {/* Send Action Button */}
          <button 
            onClick={send} 
            disabled={sending || !input.trim()}
            className="p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl disabled:opacity-50 transition-all shadow-md shadow-blue-500/10 active:scale-95 shrink-0 flex items-center justify-center cursor-pointer"
          >
            <Send size={15} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
