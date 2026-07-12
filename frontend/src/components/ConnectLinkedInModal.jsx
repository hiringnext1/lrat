import { useState, useEffect, useRef } from 'react';
import { X, ExternalLink, CheckCircle2, Loader2, RefreshCw, Linkedin, Shield } from 'lucide-react';
import axios from 'axios';

const STEPS = [
  { n: 1, label: 'Initialize connect session' },
  { n: 2, label: 'Authorize with LinkedIn credentials' },
  { n: 3, label: 'System detects connection live ✨' },
];

export default function ConnectLinkedInModal({ onClose, onConnected }) {
  const [phase, setPhase] = useState('idle'); // idle | opening | waiting | success | error
  const [connectUrl, setConnectUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [newAccount, setNewAccount] = useState(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  const initialCountRef = useRef(null);
  const pollRef = useRef(null);
  const windowRef = useRef(null);

  useEffect(() => {
    prefetchUrl();
    return () => stopPolling();
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
  }

  async function startConnect() {
    let url = connectUrl;
    if (!url) {
      try {
        setLoadingUrl(true);
        const res = await axios.post('/api/accounts/connect-link');
        url = res.data.url;
        setConnectUrl(url);
      } catch (e) {
        setErrorMsg('Could not generate connect link. Check your Unipile token in Settings.');
        setPhase('error');
        setLoadingUrl(false);
        return;
      }
      setLoadingUrl(false);
    }

    try {
      const res = await axios.get('/api/accounts');
      initialCountRef.current = (res.data.data || []).length;
    } catch {
      initialCountRef.current = 0;
    }

    windowRef.current = window.open(url, '_blank', 'width=600,height=700,left=200,top=100');
    setPhase('waiting');

    pollRef.current = setInterval(async () => {
      setPollCount(c => c + 1);
      try {
        const res = await axios.post('/api/accounts/sync');
        const accounts = res.data.data || [];
        if (accounts.length > initialCountRef.current) {
          stopPolling();
          windowRef.current?.close();
          const newest = accounts[0]; 
          setNewAccount(newest);
          setPhase('success');
          onConnected?.();
        }
      } catch (e) {
        console.error('Polling sync failed', e);
      }
    }, 4000);
  }

  function manualCheck() {
    setPollCount(c => c + 1);
    axios.post('/api/accounts/sync').then(res => {
      const accounts = res.data.data || [];
      if (accounts.length > (initialCountRef.current ?? 0)) {
        stopPolling();
        windowRef.current?.close();
        const newest = accounts[0];
        setNewAccount(newest);
        setPhase('success');
        onConnected?.();
      }
    }).catch(() => {
      alert('Still waiting for LinkedIn... Please ensure you completed the login in the popup.');
    });
  }

  const currentStep = phase === 'idle' ? 1 : phase === 'waiting' ? 2 : 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative text-left transition-all">
        
        {/* Glow ambient accent */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Close */}
        <div className="flex justify-end px-6 pt-5 relative z-10">
          <button 
            onClick={() => { stopPolling(); onClose(); }}
            className="p-2 text-slate-400 hover:text-slate-650 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── SUCCESS PHASE ── */}
        {phase === 'success' && (
          <div className="px-8 pb-8 text-center space-y-6 relative z-10">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/50 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} className="text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">LinkedIn Connected!</h2>
              {newAccount && (
                <p className="text-slate-500 dark:text-slate-400 mt-2 text-xs font-semibold uppercase tracking-wider">
                  Profile: <span className="font-extrabold text-blue-600 dark:text-blue-400 normal-case">{newAccount.name}</span> has synced successfully.
                </p>
              )}
            </div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 italic max-w-xs mx-auto leading-relaxed">
              Your profile is verified and active. You can now build target outreach campaigns.
            </p>
            <button 
              onClick={() => { stopPolling(); onClose(); }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
            >
              Start Campaigns
            </button>
          </div>
        )}

        {/* ── ERROR PHASE ── */}
        {phase === 'error' && (
          <div className="px-8 pb-8 text-center space-y-5 relative z-10">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 rounded-full flex items-center justify-center mx-auto">
              <X size={24} className="text-rose-500" />
            </div>
            <h2 className="text-lg font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Sync Authorization Failed</h2>
            <p className="text-xs text-rose-600 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 rounded-2xl p-4 leading-relaxed font-semibold">
              {errorMsg}
            </p>
            <button 
              onClick={() => { setPhase('idle'); setErrorMsg(''); prefetchUrl(); }}
              className="w-full border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
            >
              Try Session Again
            </button>
          </div>
        )}

        {/* ── IDLE / WAITING ── */}
        {(phase === 'idle' || phase === 'waiting' || phase === 'opening') && (
          <div className="px-8 pb-8 space-y-6 relative z-10">
            {/* Logo Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-[#0077b5] rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/10">
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-white">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-3">Link LinkedIn Node</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">Synchronize profile securely in a few clicks</p>
            </div>

            {/* Steps Visual List */}
            <div className="space-y-2.5">
              {STEPS.map(({ n, label }) => {
                const done = currentStep > n;
                const active = currentStep === n;
                return (
                  <div 
                    key={n} 
                    className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                      active 
                        ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/40 shadow-sm' 
                        : done 
                          ? 'opacity-60 border-transparent' 
                          : 'opacity-40 border-transparent'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
                      done 
                        ? 'bg-emerald-500 text-white shadow-sm' 
                        : active 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550'
                    }`}>
                      {done ? <CheckCircle2 size={13} strokeWidth={2.5} /> : n}
                    </div>
                    
                    <span className={`text-xs font-semibold uppercase tracking-wider ${active ? 'text-blue-700 dark:text-blue-400' : 'text-slate-500'}`}>
                      {label}
                    </span>

                    {active && n === 2 && (
                      <div className="ml-auto flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                          <div 
                            key={i} 
                            className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} 
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Main Action Buttons */}
            {phase === 'idle' && (
              <button
                type="button"
                onClick={startConnect}
                disabled={loadingUrl}
                className="w-full flex items-center justify-center gap-2 bg-[#0077b5] hover:bg-[#006097] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shadow-md"
              >
                {loadingUrl ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                <span>{loadingUrl ? 'Generating Node URL…' : 'Open LinkedIn Bridge'}</span>
              </button>
            )}

            {phase === 'waiting' && (
              <div className="space-y-3">
                <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-2xl p-4 text-center space-y-2.5">
                  <Loader2 size={20} className="animate-spin text-blue-500 mx-auto" />
                  <p className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">Awaiting User Login Verification…</p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold leading-relaxed">
                    Please log into your LinkedIn profile in the popup window. We will automatically capture the active cookies.
                  </p>
                </div>

                <button 
                  onClick={manualCheck}
                  className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <RefreshCw size={12} />
                  <span>Manually Trigger Sync</span>
                </button>
              </div>
            )}

            {/* Trust footer info */}
            <div className="flex items-center justify-center gap-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 pt-1 uppercase tracking-widest">
              <Shield size={12} className="text-slate-350" />
              <span>Passwords are never saved</span>
              <span>·</span>
              <span>Proxy Gated (Unipile)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
