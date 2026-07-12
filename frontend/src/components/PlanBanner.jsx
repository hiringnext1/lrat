import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, XCircle, Zap, X, ArrowRight } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

/**
 * PlanBanner — sticky top banner shown when trial is expiring,
 * payment is past due, or subscription is canceled.
 * Shows nothing when plan is fully active.
 */
export default function PlanBanner() {
  const [plan, setPlan] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('lrat_token');
    if (!token) return;

    axios.get(`${API}/api/billing/status`)
      .then(res => setPlan(res.data.data?.plan))
      .catch(() => {});
  }, []);

  if (!plan || dismissed) return null;

  const { type, status, trialDaysLeft, trialExpired, cancelAtPeriodEnd, currentPeriodEnd } = plan;

  // Determine what to show
  let bannerConfig = null;

  if (status === 'canceled' || trialExpired) {
    bannerConfig = {
      bg: 'bg-red-600',
      icon: XCircle,
      text: trialExpired
        ? 'Your free trial has expired. Upgrade to keep your automation running.'
        : 'Your subscription has been canceled. Your data is preserved — reactivate anytime.',
      cta: 'Reactivate Now',
    };
  } else if (status === 'past_due') {
    bannerConfig = {
      bg: 'bg-amber-500',
      icon: AlertTriangle,
      text: 'Payment failed. Please update your payment method to avoid automation being paused.',
      cta: 'Update Payment',
    };
  } else if (type === 'trial' && trialDaysLeft <= 3 && trialDaysLeft > 0) {
    bannerConfig = {
      bg: 'bg-blue-600',
      icon: Zap,
      text: `⏱️ ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left in your trial. Upgrade now to keep everything running.`,
      cta: 'Upgrade Now',
    };
  } else if (cancelAtPeriodEnd && currentPeriodEnd) {
    bannerConfig = {
      bg: 'bg-slate-700',
      icon: AlertTriangle,
      text: `Your plan will be canceled on ${new Date(currentPeriodEnd).toLocaleDateString()}. Renew to continue.`,
      cta: 'Renew Plan',
    };
  }

  if (!bannerConfig) return null;

  const { bg, icon: Icon, text, cta } = bannerConfig;

  return (
    <div className={`${bg} text-white px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold`}>
      <div className="flex items-center gap-2 flex-1">
        <Icon size={14} className="shrink-0" />
        <span>{text}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => navigate('/dashboard/billing')}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all"
        >
          {cta} <ArrowRight size={11} />
        </button>
        <button onClick={() => setDismissed(true)} className="opacity-70 hover:opacity-100 transition-opacity">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
