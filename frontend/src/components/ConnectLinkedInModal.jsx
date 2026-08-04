import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ExternalLink, CheckCircle2, Loader2, RefreshCw, Shield, KeyRound, Globe, Sparkles, HelpCircle, ArrowRight, Zap, Copy, Check } from 'lucide-react';
import axios from 'axios';
import socket from '../socket';

const PROGRESS_STEPS = [
  { n: 1, title: 'Session Handshake', desc: 'Encrypted Token Generated' },
  { n: 2, title: 'Dedicated Proxy', desc: 'Indian Residential IP Active' },
  { n: 3, title: 'Authentication Check', desc: 'Verifying Credentials & Session' },
  { n: 4, title: 'GrowLeadz Sync', desc: 'Finalizing Account Setup' },
];

export default function ConnectLinkedInModal({ onClose, onConnected }) {
  const [tab, setTab] = useState('hosted'); // 'hosted' | 'cookie'
  const [phase, setPhase] = useState('idle'); // idle | connecting | waiting | success | error
  const [activeStep, setActiveStep] = useState(1);
  const [connectUrl, setConnectUrl] = useState('');
  const [cookieInput, setCookieInput] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [newAccount, setNewAccount] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [copiedGuide, setCopiedGuide] = useState(false);

  const initialCountRef = useRef(null);
  const pollRef = useRef(null);
  const stepTimerRef = useRef(null);
  const windowRef = useRef(null);

  useEffect(() => {
    prefetchUrl();

    // Listen to real-time socket event when Unipile webhook fires
    const handleSocketConnected = (data) => {
      stopPolling();
      windowRef.current?.close();
      if (data?.account) {
        setNewAccount(data.account);
      }
      setPhase('success');
      onConnected?.();
    };

    socket.on('linkedin_account_connected', handleSocketConnected);

    return () => {
      stopPolling();
      socket.off('linkedin_account_connected', handleSocketConnected);
    };
  }, []);

  async function prefetchUrl() {
    try {
      setLoadingUrl(true);
      const res = await axios.post('/api/accounts/connect-link');
      setConnectUrl(res.data.url || '');
    } catch {
      // Will retry on button click
    } finally {
      setLoadingUrl(false);
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (stepTimerRef.current) {
      clearInterval(stepTimerRef.current);
      stepTimerRef.current = null;
    }
  }

  function startStepAnimation(targetStep = 3) {
    setActiveStep(1);
    let s = 1;
    stepTimerRef.current = setInterval(() => {
      s++;
      if (s <= targetStep) {
        setActiveStep(s);
      } else {
        clearInterval(stepTimerRef.current);
      }
    }, 1500);
  }

  // ── Mode 1: Hosted Connect Flow ─────────────────────────────────────────────
  async function startHostedConnect() {
    setErrorMsg('');

    // Open popup window immediately on click to prevent browser popup blockers!
    const popup = window.open('about:blank', 'UnipileConnectWindow', 'width=620,height=720,left=200,top=100');
    windowRef.current = popup;

    let url = connectUrl;

    if (!url) {
      try {
        setLoadingUrl(true);
        const res = await axios.post('/api/accounts/connect-link');
        url = res.data.url;
        setConnectUrl(url);
      } catch (e) {
        popup?.close();
        setErrorMsg(e.response?.data?.error || 'Could not generate connect link. Check Unipile configuration.');
        setPhase('error');
        setLoadingUrl(false);
        return;
      }
      setLoadingUrl(false);
    }

    if (popup && !popup.closed) {
      popup.location.href = url;
      try { popup.focus(); } catch (_) {}
    } else {
      // Fallback if window popup was blocked
      window.open(url, '_blank');
    }

    let initialCount = 0;
    try {
      const res = await axios.get('/api/accounts');
      const list = res.data.data || [];
      initialCount = list.length;
      initialCountRef.current = initialCount;
    } catch {
      initialCountRef.current = 0;
    }

    setPhase('waiting');
    startStepAnimation(3);

    // Poll using GET /api/accounts (read-only, user-scoped) to detect new accounts
    // Falls back to /sync only after window is closed to trigger the sync logic
    let tick = 0;
    pollRef.current = setInterval(async () => {
      try {
        tick++;
        // Check if window was closed by user after completing login
        const isWindowClosed = windowRef.current && windowRef.current.closed;
        let isRedirectedSuccess = false;
        try {
          if (windowRef.current?.location?.href?.includes('connected=1')) {
            isRedirectedSuccess = true;
          }
        } catch (_) {}

        // Sync when the popup signals completion — and every ~12s regardless.
        // The popup redirect can land on a different origin (or stay open), which
        // makes the checks above unreliable, so never depend on them alone.
        if (isWindowClosed || isRedirectedSuccess || tick % 4 === 0) {
          await axios.post('/api/accounts/sync');
        }

        // Check current accounts (read-only, user-scoped)
        const res = await axios.get('/api/accounts');
        const accounts = res.data.data || [];

        // Detect if a new account appeared (more accounts than before)
        if (accounts.length > initialCountRef.current) {
          stopPolling();
          try { windowRef.current?.close(); } catch (_) {}
          setActiveStep(4);
          const newest = accounts[0];
          setNewAccount(newest);
          setPhase('success');
          onConnected?.();
        }
      } catch (e) {
        console.error('Polling check failed', e);
      }
    }, 3000);
  }

  // ── Mode 2: 1-Click Cookie (li_at) Connect Flow (3-Second Connection) ──────
  async function startCookieConnect(e) {
    e.preventDefault();
    if (!cookieInput.trim()) {
      setErrorMsg('Please paste your li_at cookie value');
      return;
    }

    setErrorMsg('');
    setPhase('connecting');
    startStepAnimation(3);

    try {
      const res = await axios.post('/api/accounts/connect-cookie', {
        cookie_value: cookieInput.trim()
      });

      if (res.data.success) {
        stopPolling();
        setActiveStep(4);
        setNewAccount(res.data.account);
        setPhase('success');
        onConnected?.();
      } else {
        setErrorMsg(res.data.error || 'Connection failed');
        setPhase('error');
      }
    } catch (err) {
      stopPolling();
      setErrorMsg(err.response?.data?.error || 'Invalid or expired li_at cookie. Please re-copy from Chrome.');
      setPhase('error');
    }
  }

  function manualCheck() {
    // Trigger sync (user-scoped) then check for new accounts
    axios.post('/api/accounts/sync').then(async () => {
      const res = await axios.get('/api/accounts');
      const accounts = res.data.data || [];
      if (accounts.length > (initialCountRef.current || 0)) {
        stopPolling();
        try { windowRef.current?.close(); } catch (_) {}
        setActiveStep(4);
        const newest = accounts[0];
        setNewAccount(newest);
        setPhase('success');
        onConnected?.();
      } else {
        alert('Syncing... Please complete login in the popup window and click again.');
      }
    }).catch(() => {
      alert('Syncing... Please complete login in the popup window and click again.');
    });
  }

  const modalJSX = (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-950/85 backdrop-blur-xl p-4 select-none">
      <div className="bg-[#0D1221] border border-white/10 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden relative text-left transition-all">
        
        {/* Glow ambient background accents */}
        <div className="absolute top-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Navigation */}
        <div className="flex items-center justify-between px-7 pt-6 pb-2 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-display">Connect LinkedIn Account</h3>
          </div>
          <button 
            onClick={() => { stopPolling(); onClose(); }}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/8 rounded-xl transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── MODE TABS ── */}
        {(phase === 'idle' || phase === 'connecting') && (
          <div className="px-7 pt-3 relative z-10">
            <div className="bg-white/5 border border-white/8 rounded-2xl p-1 grid grid-cols-2 gap-1">
              <button
                onClick={() => { setTab('hosted'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  tab === 'hosted' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Globe size={13} />
                <span>Hosted Auth (2FA)</span>
              </button>
              <button
                onClick={() => { setTab('cookie'); setErrorMsg(''); }}
                className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  tab === 'cookie' 
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Zap size={13} className="text-amber-400" />
                <span>1-Click Cookie (3 Sec)</span>
              </button>
            </div>
          </div>
        )}

        {/* ── SUCCESS PHASE ── */}
        {phase === 'success' && (
          <div className="px-8 py-10 text-center space-y-6 relative z-10">
            <div className="w-20 h-20 bg-emerald-500/15 border border-emerald-500/30 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={40} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight font-display">LinkedIn Connected! 🎉</h2>
              {newAccount && (
                <div className="mt-3 bg-white/5 border border-white/8 rounded-2xl p-4 inline-block text-left max-w-sm">
                  <div className="flex items-center gap-3">
                    {newAccount.photo_url ? (
                      <img src={newAccount.photo_url} alt="" className="w-10 h-10 rounded-xl object-cover border border-blue-500/30 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-black flex items-center justify-center text-sm shrink-0">
                        {newAccount.name?.charAt(0) || 'L'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-white truncate font-display">{newAccount.name}</p>
                      <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active & Verified
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Your profile is now synced and ready for automated AI outreach.
            </p>
            <button 
              onClick={() => { stopPolling(); onClose(); }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
            >
              Done & Start Campaigns
            </button>
          </div>
        )}

        {/* ── ERROR PHASE ── */}
        {phase === 'error' && (
          <div className="px-8 py-8 text-center space-y-5 relative z-10">
            <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <X size={28} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight font-display">Connection Failed</h2>
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 mt-3 leading-relaxed font-semibold">
                {errorMsg}
              </p>
            </div>
            <button 
              onClick={() => { setPhase('idle'); setErrorMsg(''); prefetchUrl(); }}
              className="w-full border border-white/10 text-slate-300 hover:bg-white/5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Try Connecting Again
            </button>
          </div>
        )}

        {/* ── IDLE / CONNECTING / WAITING ── */}
        {(phase === 'idle' || phase === 'waiting' || phase === 'connecting') && (
          <div className="px-7 py-6 space-y-5 relative z-10">

            {/* ── TAB 1: HOSTED CONNECT ── */}
            {tab === 'hosted' && (
              <div className="space-y-5">
                <div className="text-center space-y-1">
                  <p className="text-xs text-slate-300 font-bold">Standard Hosted Login with 2FA / OTP Support</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Opens encrypted Unipile login popup window</p>
                </div>

                {/* Animated 4-Step Progress Indicator */}
                <div className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Connection Pipeline</p>
                  <div className="grid grid-cols-4 gap-2">
                    {PROGRESS_STEPS.map((step) => {
                      const done = activeStep > step.n;
                      const active = activeStep === step.n;
                      return (
                        <div 
                          key={step.n}
                          className={`rounded-xl p-2 text-center border transition-all ${
                            active 
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-md shadow-blue-500/10' 
                              : done 
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                : 'bg-white/2 border-white/5 text-slate-600'
                          }`}
                        >
                          <div className="flex items-center justify-center mb-1">
                            {done ? (
                              <CheckCircle2 size={14} className="text-emerald-400" />
                            ) : active ? (
                              <Loader2 size={14} className="animate-spin text-blue-400" />
                            ) : (
                              <span className="text-[10px] font-black">{step.n}</span>
                            )}
                          </div>
                          <p className="text-[8px] font-black uppercase tracking-wider truncate">{step.title}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Main Action Buttons */}
                {phase === 'idle' && (
                  <button
                    type="button"
                    onClick={startHostedConnect}
                    disabled={loadingUrl}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    {loadingUrl ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    <span>{loadingUrl ? 'Preparing Secure Proxy…' : 'Launch Hosted Connect Window'}</span>
                  </button>
                )}

                {phase === 'waiting' && (
                  <div className="space-y-3">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center space-y-2">
                      <Loader2 size={20} className="animate-spin text-blue-400 mx-auto" />
                      <p className="text-xs font-black text-blue-300 uppercase tracking-wider">Awaiting LinkedIn Login in Popup…</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                        Please enter your LinkedIn credentials in the popup window. If popup was blocked or closed, click below:
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (connectUrl) {
                            window.open(connectUrl, '_blank', 'width=620,height=720,left=200,top=100');
                          } else {
                            startHostedConnect();
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-blue-500/20"
                      >
                        <ExternalLink size={12} />
                        <span>Re-open Login Popup</span>
                      </button>

                      <button 
                        type="button"
                        onClick={manualCheck}
                        className="flex items-center justify-center gap-1.5 border border-white/10 text-slate-300 hover:bg-white/5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <RefreshCw size={12} />
                        <span>Trigger Sync</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: 1-CLICK COOKIE CONNECT ── */}
            {tab === 'cookie' && (
              <form onSubmit={startCookieConnect} className="space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <KeyRound size={12} className="text-amber-400" />
                      LinkedIn Session Cookie (`li_at`)
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGuide(!showGuide)}
                      className="text-[9px] font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <HelpCircle size={11} />
                      <span>{showGuide ? 'Hide Guide' : 'How to copy? (5 Sec)'}</span>
                    </button>
                  </div>

                  <input
                    type="password"
                    value={cookieInput}
                    onChange={(e) => setCookieInput(e.target.value)}
                    placeholder="Paste li_at cookie value here (e.g. AQEDA...)"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                  />
                </div>

                {/* 1-Click Cookie Guide Dropdown */}
                {showGuide && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2 text-[10px] text-slate-300 text-left">
                    <p className="font-black text-amber-400 uppercase tracking-widest">How to copy `li_at` cookie in 5 seconds:</p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-400 leading-relaxed font-medium">
                      <li>Open <span className="text-white font-bold">LinkedIn.com</span> in Chrome/Edge.</li>
                      <li>Press <span className="text-amber-300 font-mono">F12</span> (or Right Click → Inspect).</li>
                      <li>Go to <span className="text-white font-bold">Application</span> tab → <span className="text-white font-bold">Cookies</span> → linkedin.com.</li>
                      <li>Find <span className="text-amber-300 font-mono font-bold">li_at</span>, double-click its Value & Copy!</li>
                    </ol>
                  </div>
                )}

                {errorMsg && (
                  <p className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                    {errorMsg}
                  </p>
                )}

                {/* Animated 4-Step Progress Bar during cookie connect */}
                {phase === 'connecting' && (
                  <div className="bg-white/4 border border-white/8 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Verifying Cookie Session</p>
                      <Loader2 size={12} className="animate-spin text-amber-400" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {PROGRESS_STEPS.map((step) => {
                        const done = activeStep > step.n;
                        const active = activeStep === step.n;
                        return (
                          <div 
                            key={step.n}
                            className={`rounded-xl p-2 text-center border transition-all ${
                              active 
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-md shadow-amber-500/10' 
                                : done 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                  : 'bg-white/2 border-white/5 text-slate-600'
                            }`}
                          >
                            <p className="text-[8px] font-black uppercase tracking-wider truncate">{step.title}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={phase === 'connecting' || !cookieInput.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-amber-500/20 active:scale-95"
                >
                  {phase === 'connecting' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Verifying & Connecting Cookie (3 Sec)…</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Connect Instantly in 3 Seconds</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Security Trust Footer */}
            <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-500 pt-1 uppercase tracking-widest border-t border-white/6">
              <Shield size={12} className="text-slate-400" />
              <span>AES-256 Encrypted Session</span>
              <span>·</span>
              <span>Proxy Protected</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalJSX, document.body);
}
