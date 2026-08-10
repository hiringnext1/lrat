import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, AlertCircle, KeyRound, ChevronLeft, Zap, ArrowRight, Check, Shield, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import GrowLeadsLogo from '../components/GrowLeadsLogo';

// ─── DARK BACKGROUND ────────────────────────────────────────────────────────
function Background() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#080C18]">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />
      <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] bg-blue-600/10 blur-[160px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] bg-purple-600/8 blur-[140px] rounded-full" />
    </div>
  );
}

// ─── INPUT FIELD ────────────────────────────────────────────────────────────
function InputField({ id, label, type = 'text', value, onChange, placeholder, icon: Icon, rightElement }) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Icon size={15} className="text-slate-500" />
          </div>
        )}
        <input
          id={id}
          type={isPassword && showPw ? 'text' : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500/60 focus:bg-white/8 transition-all py-3.5 pl-11 pr-11"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
          >
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SOCIAL PROOF SIDEBAR ───────────────────────────────────────────────────
function SocialProofPanel({ title, subtitle }) {
  // Facts about the product, not customer counts we cannot evidence
  const stats = [
    { value: "10+", label: "Accounts / workspace" },
    { value: "25/day", label: "Per-account cap" },
    { value: "AI", label: "Personalised copy" },
    { value: "1", label: "Unified inbox" },
  ];

  return (
    <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-blue-600/20 via-indigo-600/10 to-purple-600/15 border-r border-white/8 flex-col justify-between p-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(59,130,246,0.15),transparent_60%)]" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 blur-3xl rounded-full" />

      {/* Logo */}
      <div className="relative z-10">
        <Link to="/" className="inline-block group">
          <GrowLeadsLogo size="lg" />
        </Link>
        <p className="text-slate-400 text-xs font-medium mt-2">B2B LinkedIn Lead Generation Platform</p>
      </div>

      {/* Heading */}
      <div className="relative z-10 space-y-6">
        <div>
          <h2 className="text-3xl font-black text-white leading-tight">{title}</h2>
          <p className="text-slate-400 text-sm font-medium mt-3 leading-relaxed">{subtitle}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* How the safety layer works — verifiable, unlike a testimonial */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
          <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Built-in account safety</p>
          <p className="text-sm text-slate-300 leading-relaxed">
            Randomised delays between every action, per-account daily caps, working-hour windows and warmup ramps for
            newly connected accounts — each account on its own independent schedule.
          </p>
        </div>
      </div>

      {/* Trust badges */}
      <div className="relative z-10 flex flex-wrap gap-2">
        {['No Credit Card', '30 Days for $5', 'Cancel Anytime'].map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium bg-white/5 border border-white/8 px-3 py-1.5 rounded-full">
            <Check size={11} className="text-emerald-400" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    try {
      setError(''); setLoading(true);
      const res = await axios.post('/api/auth/login', { email, password });
      if (res.data?.success) {
        localStorage.setItem('lrat_token', res.data.token);
        localStorage.setItem('lrat_user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      } else {
        setError(res.data?.error || 'Failed to authenticate');
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.requiresVerification) {
        navigate('/signup', { state: { step: 'verification', email: errorData.email } });
      } else {
        setError(errorData?.error || 'Invalid credentials or server offline.');
      }
    } finally { setLoading(false); }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!resetEmail) { setError('Please enter your email address.'); return; }
    try {
      setError(''); setLoading(true);
      const res = await axios.post('/api/auth/forgot-password', { email: resetEmail });
      if (res.data?.success) { setMode('reset'); }
      else { setError(res.data?.error || 'Failed to send recovery code'); }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send recovery code');
    } finally { setLoading(false); }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetCode || !newPassword || !confirmNewPassword) { setError('Please fill in all fields.'); return; }
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match.'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    try {
      setError(''); setLoading(true);
      const res = await axios.post('/api/auth/reset-password', { email: resetEmail, code: resetCode, new_password: newPassword });
      if (res.data?.success) {
        setError('');
        alert('Password reset successful! Please log in.');
        setMode('login'); setPassword(''); setEmail(resetEmail);
      } else { setError(res.data?.error || 'Failed to reset password'); }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally { setLoading(false); }
  }

  const ErrorBox = () => error ? (
    <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/25 rounded-xl">
      <AlertCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
      <p className="text-xs text-red-400 font-semibold leading-relaxed">{error}</p>
    </div>
  ) : null;

  return (
    <div className="min-h-screen flex text-left font-sans overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Background />

      {/* Left: Social Proof */}
      <SocialProofPanel
        title="Turn LinkedIn into your #1 B2B pipeline machine."
        subtitle="Automate LinkedIn outreach across every account you manage — safely, on autopilot."
      />

      {/* Right: Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10 min-h-screen">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8">
          <GrowLeadsLogo size="lg" />
        </div>

        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.div key="login" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-8">
                  <h1 className="text-3xl font-black text-white tracking-tight">Welcome back</h1>
                  <p className="text-slate-400 text-sm mt-2 font-medium">Sign in to your GrowLeadz dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <ErrorBox />
                  <InputField id="email" label="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" icon={Mail} />
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label htmlFor="password" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Password</label>
                      <button type="button" onClick={() => { setError(''); setResetEmail(email); setMode('forgot'); }} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider">
                        Forgot?
                      </button>
                    </div>
                    <InputField id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" icon={Lock} />
                  </div>

                  <button
                    type="submit"
                    id="login-submit-btn"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group mt-2"
                  >
                    {loading ? 'Signing In...' : (
                      <>Sign In <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/8 text-center">
                  <p className="text-sm text-slate-500 font-medium">
                    New to GrowLeadz?{' '}
                    <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                      Create free account →
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}

            {mode === 'forgot' && (
              <motion.div key="forgot" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-8">
                  <button onClick={() => { setError(''); setMode('login'); }} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-4 transition-colors">
                    <ChevronLeft size={14} /> Back to Sign In
                  </button>
                  <h1 className="text-3xl font-black text-white tracking-tight">Forgot password?</h1>
                  <p className="text-slate-400 text-sm mt-2 font-medium">Enter your email to receive a recovery code</p>
                </div>

                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <ErrorBox />
                  <InputField id="resetEmail" label="Email Address" type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} placeholder="name@company.com" icon={Mail} />
                  <button type="submit" id="forgot-submit-btn" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-2">
                    {loading ? 'Sending...' : 'Send Recovery Code'}
                  </button>
                </form>
              </motion.div>
            )}

            {mode === 'reset' && (
              <motion.div key="reset" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-8">
                  <button onClick={() => { setError(''); setMode('forgot'); }} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider mb-4 transition-colors">
                    <ChevronLeft size={14} /> Back
                  </button>
                  <h1 className="text-3xl font-black text-white tracking-tight">Reset password</h1>
                  <p className="text-slate-400 text-sm mt-2">Code sent to <span className="text-blue-400 font-semibold">{resetEmail}</span></p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <ErrorBox />
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">6-Digit Recovery Code</label>
                    <input
                      id="resetCode"
                      type="text"
                      maxLength={6}
                      value={resetCode}
                      onChange={e => setResetCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-2xl font-mono text-center tracking-[0.5em] placeholder-slate-700 focus:outline-none focus:border-blue-500/60 transition-all py-3.5"
                    />
                  </div>
                  <InputField id="newPassword" label="New Password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 6 characters" icon={Lock} />
                  <InputField id="confirmNewPassword" label="Confirm Password" type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} placeholder="••••••••" icon={Lock} />
                  <button type="submit" id="reset-submit-btn" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 mt-2">
                    {loading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); body { background: #080C18; }` }} />
    </div>
  );
}
