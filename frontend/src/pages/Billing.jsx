import { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Zap, CheckCircle, AlertTriangle, XCircle, ExternalLink, Download, Loader2, ArrowRight, RefreshCw } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3002';

const PLAN_COLORS = {
  trial:        { bg: 'bg-slate-100', text: 'text-slate-700', badge: 'bg-slate-200 text-slate-700' },
  starter:      { bg: 'bg-blue-50',   text: 'text-blue-700',  badge: 'bg-blue-100 text-blue-700' },
  professional: { bg: 'bg-indigo-50', text: 'text-indigo-700',badge: 'bg-indigo-100 text-indigo-700' },
  enterprise:   { bg: 'bg-purple-50', text: 'text-purple-700',badge: 'bg-purple-100 text-purple-700' },
  free:         { bg: 'bg-emerald-50',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700' },
};

const STATUS_ICONS = {
  active:    { icon: CheckCircle,   color: 'text-emerald-500', label: 'Active' },
  trialing:  { icon: Zap,          color: 'text-blue-500',    label: 'Trial' },
  past_due:  { icon: AlertTriangle, color: 'text-amber-500',  label: 'Past Due' },
  canceled:  { icon: XCircle,      color: 'text-red-500',     label: 'Canceled' },
  incomplete:{ icon: AlertTriangle, color: 'text-amber-500',  label: 'Incomplete' },
};

const PRICING_PLANS = [
  {
    id: 'starter',
    name: 'Starter Playbook',
    description: 'For sales & B2B teams',
    priceUsd: 39,
    accountsLimit: 1,
    features: [
      '1 Connected Sender Profile',
      '25 Daily Connections Cap',
      'Residential Proxy Setup Support',
      'Nvidia NIM Llama-3.1 Base AI',
      'Local SQLite Analytics Sync',
    ],
  },
  {
    id: 'professional',
    name: 'Professional Engine',
    description: 'For high-growth agencies',
    priceUsd: 119,
    accountsLimit: 3,
    features: [
      '3 Connected Sender Profiles',
      'Warmup schedules week-by-week',
      '100% Gated Profile Views',
      'Automatic IP proxy rotation',
      'Multi-Account Campaign Inbox',
      'Priority Email & Slack Support',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Cluster',
    description: 'For volume sales teams',
    priceUsd: 349,
    accountsLimit: 10,
    features: [
      '10 Connected Sender Profiles',
      'Dedicated residential proxy pool',
      'Fully managed AI prompt models',
      'Direct REST API export sync',
      'Custom Playbook automation builder',
      '24/7 SLA uptime guarantee',
    ],
  },
];

function UsageBar({ used, limit, label }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-600';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="font-semibold text-slate-600">{label}</span>
        <span className="font-bold text-slate-900">{used} / {limit}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Billing() {
  const [status, setStatus] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [region, setRegion] = useState('usd');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    // Check URL params for post-checkout status
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'success') showToast('🎉 Subscription activated! Welcome aboard.');
    if (params.get('status') === 'canceled') showToast('Checkout was canceled.', 'error');

    fetchStatus();
    fetchInvoices();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/billing/status`);
      setStatus(res.data.data);
    } catch (err) {
      console.error('Billing status error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await axios.get(`${API}/api/billing/invoices`);
      setInvoices(res.data.data || []);
    } catch (_) {}
  };

  const handleCheckout = async (planId) => {
    try {
      setCheckoutLoading(planId);
      const priceKey = `VITE_STRIPE_PRICE_${planId.toUpperCase()}_${billingCycle.toUpperCase()}`;
      const res = await axios.post(`${API}/api/billing/create-checkout`, {
        planType: planId,
        billingCycle,
      });
      if (res.data.checkout_url) {
        window.location.href = res.data.checkout_url;
      } else {
        showToast('Failed to create checkout session', 'error');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Checkout failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const res = await axios.post(`${API}/api/billing/create-portal`);
      if (res.data.portal_url) window.location.href = res.data.portal_url;
      else showToast('Could not open billing portal.', 'error');
    } catch (err) {
      showToast(err.response?.data?.error || 'Portal error.', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const plan = status?.plan || {};
  const usage = status?.usage || {};
  const planColors = PLAN_COLORS[plan.type] || PLAN_COLORS.trial;
  const statusInfo = STATUS_ICONS[plan.status] || STATUS_ICONS.trialing;
  const StatusIcon = statusInfo.icon;

  const isPaidPlan = ['starter', 'professional', 'enterprise'].includes(plan.type);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-bold transition-all ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Billing & Plan</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your subscription, usage, and invoices.</p>
      </div>

      {/* Current Plan Card */}
      <div className={`rounded-3xl p-6 border ${plan.status === 'past_due' ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20' : plan.status === 'canceled' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${planColors.bg}`}>
              <CreditCard className={planColors.text} size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  {status?.limits?.label || 'Free Trial'} Plan
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${planColors.badge}`}>
                  {plan.type}
                </span>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-white border ${statusInfo.color}`}>
                  <StatusIcon size={10} />
                  {statusInfo.label}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {plan.type === 'trial' && plan.trialDaysLeft > 0
                  ? `Trial ends in ${plan.trialDaysLeft} day${plan.trialDaysLeft !== 1 ? 's' : ''} — upgrade to keep access`
                  : plan.cancelAtPeriodEnd
                  ? `Cancels on ${new Date(plan.currentPeriodEnd).toLocaleDateString()}`
                  : plan.currentPeriodEnd
                  ? `Renews on ${new Date(plan.currentPeriodEnd).toLocaleDateString()}`
                  : 'No active subscription'}
              </p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {isPaidPlan && (
              <button
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-all disabled:opacity-60"
              >
                {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Manage Billing
              </button>
            )}
            <button
              onClick={fetchStatus}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl hover:bg-slate-200 transition-all"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Usage bars */}
        {usage.accounts && (
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UsageBar used={usage.accounts.used} limit={usage.accounts.limit} label="LinkedIn Accounts" />
            {usage.campaigns && (
              <UsageBar used={usage.campaigns.used} limit={usage.campaigns.limit} label="Active Campaigns" />
            )}
          </div>
        )}
      </div>

      {/* Plans Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              {isPaidPlan ? 'Change Plan' : 'Upgrade to a Paid Plan'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Get more LinkedIn accounts and campaign slots.</p>
          </div>

          {/* Billing cycle toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${billingCycle === 'yearly' ? 'bg-white dark:bg-slate-800 shadow text-slate-900 dark:text-white' : 'text-slate-500'}`}
            >
              Yearly
              <span className="bg-emerald-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">-20%</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PRICING_PLANS.map((p) => {
            const isCurrent = plan.type === p.id;
            const basePrice = p.priceUsd;
            const displayPrice = billingCycle === 'yearly' ? Math.round(basePrice * 0.8) : basePrice;
            const currency = '$';

            return (
              <div
                key={p.id}
                className={`relative rounded-2xl border p-5 transition-all ${
                  p.popular
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : isCurrent
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                {p.popular && !isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    Most Popular
                  </span>
                )}
                {isCurrent && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
                    Current Plan
                  </span>
                )}

                <div className="mb-4">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">{p.name}</h4>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">{p.description}</p>
                </div>

                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 dark:text-white">{currency}{displayPrice.toLocaleString('en-IN')}</span>
                  <span className="text-xs text-slate-400">/mo</span>
                </div>

                <ul className="space-y-2 mb-5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                      <CheckCircle size={12} className="text-blue-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && handleCheckout(p.id)}
                  disabled={isCurrent || checkoutLoading === p.id}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    isCurrent
                      ? 'bg-emerald-100 text-emerald-600 cursor-default'
                      : p.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-700'
                  } disabled:opacity-60`}
                >
                  {checkoutLoading === p.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <CheckCircle size={14} /> Current Plan
                    </>
                  ) : (
                    <>
                      {isPaidPlan ? 'Switch to' : 'Upgrade to'} {p.name}
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoice History */}
      {invoices.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-sm font-black text-slate-900 dark:text-white mb-4">Invoice History</h3>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{inv.number || inv.id}</p>
                  <p className="text-[10px] text-slate-400">{new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {inv.status}
                  </span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    {inv.currency} {inv.amount.toLocaleString('en-IN')}
                  </span>
                  {inv.pdf && (
                    <a href={inv.pdf} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                      <Download size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stripe not configured notice */}
      {!status?.hasStripe && isPaidPlan === false && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200">Stripe not configured</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
              Add your <code className="font-mono">STRIPE_SECRET_KEY</code> to <code className="font-mono">.env</code> to enable payment processing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
