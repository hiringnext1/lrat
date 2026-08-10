import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, MessageSquare, UserCheck, Download, CreditCard, WifiOff, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import socket from '../socket';

/**
 * Header bell: everything that needs attention, in one place.
 *
 * Toasts only exist while the tab is open and watched, so anything that
 * happened while the user was away used to be lost. This is the catch-up view.
 */

const ICONS = {
  reply: MessageSquare,
  acceptance: UserCheck,
  account: AlertTriangle,
  campaign: AlertTriangle,
  import: Download,
  system: WifiOff,
  billing: CreditCard,
};

const SEVERITY = {
  error:   'text-rose-400 bg-rose-500/10',
  warning: 'text-amber-400 bg-amber-500/10',
  success: 'text-emerald-400 bg-emerald-500/10',
  info:    'text-blue-400 bg-blue-500/10',
};

function timeAgo(iso) {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 0) return '';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef(null);

  async function load() {
    try {
      const res = await axios.get('/api/notifications');
      setItems(res.data?.items || []);
      setUnread(res.data?.unread || 0);
    } catch (_) {
      // A failed poll must not blank an already-loaded list
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    // Live events, plus a poll so a dropped socket can't hide anything
    const refresh = () => load();
    for (const ev of ['new_reply', 'new_acceptance', 'account_warning', 'account_paused', 'import_error', 'leads_updated']) {
      socket.on(ev, refresh);
    }
    const poll = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);

    return () => {
      for (const ev of ['new_reply', 'new_acceptance', 'account_warning', 'account_paused', 'import_error', 'leads_updated']) {
        socket.off(ev, refresh);
      }
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0); // clear immediately; the request is confirmation, not the trigger
      try { await axios.post('/api/notifications/seen'); } catch (_) {}
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `${unread} new notifications` : 'Notifications'}
        className="relative p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
      >
        <Bell size={17} strokeWidth={2} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-[#080C18]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[340px] max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 shadow-2xl z-50"
             style={{ background: 'rgba(13,18,33,0.98)', backdropFilter: 'blur(12px)' }}>
          <div className="px-4 py-3 border-b border-white/8 flex items-center justify-between">
            <span className="text-[11px] font-black text-white uppercase tracking-widest">Notifications</span>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{items.length} recent</span>
          </div>

          {loading ? (
            <div className="px-4 py-8 text-center text-[11px] text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <CheckCircle2 size={22} className="mx-auto text-emerald-400/60 mb-2" />
              <p className="text-[11px] text-slate-400 font-medium">Nothing needs your attention</p>
              <p className="text-[10px] text-slate-600 mt-1">Replies and account issues will show up here</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => { setOpen(false); if (n.link) navigate(n.link); }}
                    className="w-full text-left px-4 py-3 hover:bg-white/4 transition-colors flex gap-3"
                  >
                    <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${SEVERITY[n.severity] || SEVERITY.info}`}>
                      <Icon size={13} strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold text-slate-100 leading-snug truncate">{n.title}</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider mt-1">{timeAgo(n.at)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
