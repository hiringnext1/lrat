import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Zap, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

/**
 * UpgradeModal — shown when user hits a plan limit.
 *
 * Usage:
 *   <UpgradeModal
 *     isOpen={showUpgrade}
 *     onClose={() => setShowUpgrade(false)}
 *     reason="Your Solo plan allows 1 LinkedIn account."
 *     currentPlan="starter"
 *     limitType="accounts"
 *   />
 */

const UPGRADE_PLANS = {
  accounts: {
    professional: {
      label: 'Agency',
      fix: '3 LinkedIn Accounts',
      priceInr: 6500,
      priceUsd: 119,
    },
    enterprise: {
      label: 'Scale',
      fix: '10 LinkedIn Accounts',
      priceInr: 19999,
      priceUsd: 349,
    },
  },
  campaigns: {
    professional: {
      label: 'Agency',
      fix: '20 Active Campaigns',
      priceInr: 6500,
      priceUsd: 119,
    },
    enterprise: {
      label: 'Scale',
      fix: 'Unlimited Campaigns',
      priceInr: 19999,
      priceUsd: 349,
    },
  },
};

export default function UpgradeModal({ isOpen, onClose, reason, currentPlan = 'trial', limitType = 'accounts' }) {
  const [loading, setLoading] = useState(null);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const plans = UPGRADE_PLANS[limitType] || UPGRADE_PLANS.accounts;

  const handleUpgrade = async (planId) => {
    try {
      setLoading(planId);
      const res = await axios.post(`${API}/api/billing/create-checkout`, { planType: planId, billingCycle: 'monthly' });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      // Fallback: go to billing page
      navigate('/dashboard/billing');
    } finally {
      setLoading(null);
    }
  };

  const region = Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Kolkata' ? 'inr' : 'usd';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 w-full max-w-md relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center">
            <Zap className="text-blue-600" size={18} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Plan Limit Reached</h3>
            <p className="text-xs text-slate-500">Upgrade to continue</p>
          </div>
        </div>

        {/* Reason */}
        {reason && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mb-5 text-xs text-amber-800 dark:text-amber-200 font-semibold">
            {reason}
          </div>
        )}

        {/* Plans */}
        <div className="space-y-3 mb-5">
          {Object.entries(plans).map(([planId, info]) => {
            const price = region === 'inr' ? `₹${info.priceInr.toLocaleString('en-IN')}` : `$${info.priceUsd}`;
            return (
              <div key={planId} className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-black text-sm text-slate-900 dark:text-white">{info.label}</div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                    <CheckCircle size={11} className="text-blue-600" />
                    {info.fix}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-slate-900 dark:text-white">{price}<span className="text-[10px] font-normal text-slate-400">/mo</span></div>
                  <button
                    onClick={() => handleUpgrade(planId)}
                    disabled={loading === planId}
                    className="mt-1.5 flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-blue-700 transition-all disabled:opacity-60"
                  >
                    {loading === planId ? <Loader2 size={11} className="animate-spin" /> : <>Upgrade <ArrowRight size={11} /></>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { onClose(); navigate('/dashboard/billing'); }}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            View all plans →
          </button>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
