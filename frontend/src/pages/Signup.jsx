import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, User, AlertCircle, Zap, ArrowRight, Check, Eye, EyeOff, Building2, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import GrowLeadsLogo from '../components/GrowLeadsLogo';

function Background() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-[#080C18]">
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: `linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)`,
        backgroundSize: '50px 50px',
      }} />
      <div className="absolute top-[-10%] right-[-10%] w-[55vw] h-[55vw] bg-indigo-600/10 blur-[160px] rounded-full" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40vw] h-[40vw] bg-blue-600/8 blur-[130px] rounded-full" />
    </div>
  );
}

function InputField({ id, label, type = 'text', value, onChange, placeholder, icon: Icon }) {
  const [showPw, setShowPw] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</label>
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
          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors">
            {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}

function FeaturePanel() {
  const features = [
    { icon: "🚀", title: "Launch in 10 minutes", desc: "Connect LinkedIn, set up campaign, start generating leads" },
    { icon: "🤖", title: "AI-Personalized Messages", desc: "Claude AI writes unique messages for every prospect" },
    { icon: "🛡️", title: "98% Account Safety", desc: "Human-mimicking delays keep your accounts protected" },
    { icon: "📥", title: "Unified Inbox", desc: "All replies from all accounts in one dashboard" },
  ];

  return (
    <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-indigo-600/20 via-blue-600/10 to-purple-600/15 border-r border-white/8 flex-col justify-between p-12 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(99,102,241,0.12),transparent_60%)]" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full" />

      <div className="relative z-10">
        <Link to="/" className="inline-block group">
          <GrowLeadsLogo size="lg" />
        </Link>
        <p className="text-slate-400 text-xs font-medium mt-2">B2B LinkedIn Lead Generation Platform</p>
      </div>

      <div className="relative z-10 space-y-5">
        <div className="mb-2">
          <h2 className="text-3xl font-black text-white leading-tight">Start generating B2B leads today.</h2>
          <p className="text-slate-400 text-sm font-medium mt-3 leading-relaxed">Join 500+ sales teams already running automated LinkedIn outreach at scale.</p>
        </div>

        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-4 bg-white/5 border border-white/8 rounded-2xl p-4">
            <span className="text-2xl shrink-0">{f.icon}</span>
            <div>
              <p className="text-sm font-bold text-white">{f.title}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-wrap gap-2">
        {['30 Days for $5', 'Setup in 10 minutes', 'Cancel Anytime'].map((t, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium bg-white/5 border border-white/8 px-3 py-1.5 rounded-full">
            <Check size={11} className="text-emerald-400" />
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('signup');
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (location.state?.step === 'verification') {
      if (location.state.email) setEmail(location.state.email);
      setStep('verify');
    }
  }, [location.state]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    try {
      setError('');
      const res = await axios.post('/api/auth/resend-verification', { email });
      if (res.data?.success) setResendCooldown(60);
      else setError(res.data?.error || 'Failed to resend code');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!code || code.length !== 6) { setError('Please enter a valid 6-digit code.'); return; }
    try {
      setError(''); setLoading(true);
      const res = await axios.post('/api/auth/verify-signup', { email, code });
      if (res.data?.success) {
        localStorage.setItem('lrat_token', res.data.token);
        localStorage.setItem('lrat_user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      } else { setError(res.data?.error || 'Verification failed'); }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code or server error.');
    } finally { setLoading(false); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    try {
      setError(''); setLoading(true);
      const res = await axios.post('/api/auth/signup', { name, email, password });
      if (res.data?.success) { setStep('verify'); setResendCooldown(60); }
      else { setError(res.data?.error || 'Registration failed'); }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register.');
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
      <FeaturePanel />

      {/* Right: Form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative z-10 min-h-screen">
        {/* Mobile Logo */}
        <div className="lg:hidden mb-8">
          <GrowLeadsLogo size="lg" />
        </div>

        <div className="w-full max-w-sm">
          <AnimatePresence mode="wait">
            {step === 'signup' && (
              <motion.div key="signup" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-8">
                  <h1 className="text-3xl font-black text-white tracking-tight">Create your account</h1>
                  <p className="text-slate-400 text-sm mt-2 font-medium">Start generating B2B leads in 10 minutes</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <ErrorBox />
                  <InputField id="name" label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" icon={User} />
                  <InputField id="email" label="Work Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" icon={Mail} />
                  <InputField id="password" label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" icon={Lock} />
                  <InputField id="confirmPassword" label="Confirm Password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" icon={Lock} />

                  <button
                    type="submit"
                    id="signup-submit-btn"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 group mt-2"
                  >
                    {loading ? 'Creating Account...' : (
                      <>Create Free Account <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
                </form>

                <p className="text-[10px] text-slate-400 text-center mt-4 leading-relaxed">
                  By signing up you agree to our{' '}
                  <Link to="/terms" className="text-slate-300 hover:text-white underline underline-offset-2">Terms of Service</Link>
                  {' '}&{' '}
                  <Link to="/privacy" className="text-slate-300 hover:text-white underline underline-offset-2">Privacy Policy</Link>.
                </p>

                <div className="mt-6 pt-6 border-t border-white/8 text-center">
                  <p className="text-sm text-slate-400 font-medium">
                    Already have an account?{' '}
                    <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold transition-colors">
                      Sign In →
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}

            {step === 'verify' && (
              <motion.div key="verify" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="mb-8 text-center">
                  <div className="w-16 h-16 bg-blue-500/15 border border-blue-500/25 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Mail size={28} className="text-blue-400" />
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tight">Check your email</h1>
                  <p className="text-slate-400 text-sm mt-3 font-medium leading-relaxed">
                    We sent a 6-digit verification code to<br />
                    <span className="text-blue-400 font-bold">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-5">
                  <ErrorBox />
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-center">Verification Code</label>
                    <input
                      id="verify-code"
                      type="text"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-white/5 border border-white/10 rounded-xl text-white text-3xl font-mono text-center tracking-[0.6em] placeholder-slate-700 focus:outline-none focus:border-blue-500/60 transition-all py-4"
                    />
                  </div>

                  <button
                    type="submit"
                    id="verify-submit-btn"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enter Dashboard →'}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-white/8 flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-bold uppercase tracking-wider disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw size={12} className={resendCooldown > 0 ? 'animate-spin' : ''} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                  <button type="button" onClick={() => setStep('signup')} className="text-[10px] text-slate-400 hover:text-slate-200 font-bold uppercase tracking-widest transition-colors">
                    ← Edit Registration
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'); body { background: #080C18; }` }} />
    </div>
  );
}
