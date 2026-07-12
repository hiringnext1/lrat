import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PlanBanner from './PlanBanner';
import { useEffect, useState } from 'react';
import socket from '../socket';
import axios from 'axios';
import { Search, X, User } from 'lucide-react';

function Toast({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((t) => {
        const isSuccess = t.type === 'success' || t.type === 'reply';
        const isInfo = t.type === 'info' || t.type === 'acceptance';
        const isWarning = t.type === 'error' || t.type === 'warning';
        
        return (
          <div key={t.id} onClick={() => onDismiss(t.id)}
            className={`flex items-start gap-3 p-4.5 rounded-2xl shadow-xl border cursor-pointer transition-all hover:scale-102 ${
              isSuccess ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300' :
              isInfo ? 'bg-blue-50 dark:bg-blue-950/90 border-blue-200 dark:border-blue-900 text-blue-800 dark:text-blue-300' :
              'bg-rose-50 dark:bg-rose-950/90 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
            }`}>
            <span className="text-base shrink-0">
              {isSuccess ? '✨' : isInfo ? 'ℹ️' : '⚠️'}
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider">{t.title}</p>
              <p className="text-[11px] font-semibold mt-0.5 opacity-90">{t.body}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!query) { setResults([]); return; }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/leads?search=${query}&limit=5`);
        setResults(res.data.data);
      } catch (err) {}
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search size={18} className="text-slate-400 mr-3" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Global Search (Press Esc to close)"
            className="flex-1 bg-transparent text-sm font-medium focus:outline-none dark:text-white placeholder:text-slate-400"
          />
          <kbd className="hidden sm:inline-block px-2 py-1 text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-md">ESC</kbd>
        </div>
        
        {results.length > 0 && (
          <div className="p-2 max-h-[60vh] overflow-y-auto">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-2 mt-2">Leads Found</div>
            {results.map(lead => (
              <div
                key={lead.id}
                onClick={() => { navigate('/dashboard/leads'); onClose(); }}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-slate-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{lead.full_name}</h4>
                  <p className="text-[11px] text-slate-500">{lead.company || 'Unknown Company'} • {lead.status.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

let toastId = 0;

export default function Layout() {
  const navigate = useNavigate();
  const [toasts, setToasts] = useState([]);
  const [showPalette, setShowPalette] = useState(false);

  function addToast(type, title, body) {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, body }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const showNotification = (title, body, type) => {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
      addToast(type, title, body);
    };

    const onReply = (data) => {
      const isPositive = data.sentiment === 'positive';
      const title = isPositive ? '🔥 Hot Lead Replied!' : `Reply from ${data.lead_name}`;
      showNotification(title, data.message_preview || 'Check your inbox', 'reply');
    };

    const onAcceptance = (data) => {
      showNotification(`🤝 ${data.lead_name} connected!`, `New network member via ${data.account_name}`, 'acceptance');
    };

    const onWarning = (data) => {
      showNotification(`⚠️ Account Warning`, `${data.account_name}: ${data.reason}`, 'warning');
    };

    socket.on('new_reply', onReply);
    socket.on('new_acceptance', onAcceptance);
    socket.on('account_warning', onWarning);

    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowPalette(true);
      }
      if (e.key === 'Escape') {
        setShowPalette(false);
      }
    };
    
    const handleCustomToast = (e) => {
      const { type, title, body } = e.detail || {};
      addToast(type || 'info', title || 'Alert', body || '');
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('show-toast', handleCustomToast);

    return () => {
      socket.off('new_reply', onReply);
      socket.off('new_acceptance', onAcceptance);
      socket.off('account_warning', onWarning);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('show-toast', handleCustomToast);
    };
  }, []);

  useEffect(() => {
    async function verifyOnboarding() {
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data?.success && res.data.data) {
          const u = res.data.data;
          
          localStorage.setItem('lrat_user', JSON.stringify({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role || 'user',
            onboarding_completed: u.onboarding_completed || 0,
            onboarding_step: u.onboarding_step || 'welcome'
          }));

          if (u.role !== 'admin' && u.onboarding_completed === 0) {
            navigate('/onboarding');
          }
        }
      } catch (err) {
        console.error('Failed to sync profile status:', err);
      }
    }
    verifyOnboarding();
  }, [navigate]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative flex flex-col">
        <PlanBanner />
        <div className="flex-1">
          <Outlet />
        </div>
      </main>
      <Toast toasts={toasts} onDismiss={dismissToast} />
      {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}
    </div>
  );
}
