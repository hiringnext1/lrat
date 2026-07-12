import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, User, Megaphone, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Verification phase states
  const [step, setStep] = useState('signup'); // 'signup' or 'verify'
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Check if we redirected here from login page for an unverified account
  useEffect(() => {
    if (location.state?.step === 'verification') {
      if (location.state.email) {
        setEmail(location.state.email);
      }
      setStep('verify');
    }
  }, [location.state]);

  // Resend cooldown timer
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  async function handleResendCode() {
    if (resendCooldown > 0) return;
    try {
      setError('');
      const res = await axios.post('/api/auth/resend-verification', { email });
      if (res.data?.success) {
        setResendCooldown(60);
      } else {
        setError(res.data?.error || 'Failed to resend code');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend code');
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const res = await axios.post('/api/auth/verify-signup', { email, code });
      
      if (res.data?.success) {
        localStorage.setItem('lrat_token', res.data.token);
        localStorage.setItem('lrat_user', JSON.stringify(res.data.user));
        navigate('/dashboard');
      } else {
        setError(res.data?.error || 'Verification failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid verification code or server error.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const res = await axios.post('/api/auth/signup', { name, email, password });
      
      if (res.data?.success) {
        setStep('verify');
        setResendCooldown(60); // start a cooldown on signup code
      } else {
        setError(res.data?.error || 'Registration failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register or server offline.');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-left font-sans">
        {/* Ambient backgrounds */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center animate-fade-in">
          <div className="flex justify-center items-center gap-3">
            <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
              <Megaphone size={28} strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">LRAT SaaS</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-850 dark:text-slate-100 uppercase">
            Verify Email
          </h2>
          <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
            Enter the 6-digit confirmation code sent to {email}
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:rounded-[32px] sm:px-10 border border-slate-100 dark:border-slate-800/80">
            <form className="space-y-6" onSubmit={handleVerify}>
              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 flex items-start gap-3">
                  <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                  <p className="text-[11px] text-rose-600 dark:text-rose-450 font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="code" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                  6-Digit Verification Code
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <input
                    id="code"
                    name="code"
                    type="text"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="block w-full text-center tracking-[0.4em] font-mono text-2xl py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="000000"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-500/20 text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Log In'}
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendCooldown > 0}
                className="text-xs text-blue-600 dark:text-blue-450 font-bold uppercase tracking-wider hover:underline disabled:text-slate-400 disabled:no-underline"
              >
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
              </button>
              
              <button
                type="button"
                onClick={() => setStep('signup')}
                className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-400"
              >
                ← Edit Registration Info
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-left">
      {/* Ambient backgrounds */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center items-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
            <Megaphone size={28} strokeWidth={2.5} />
          </div>
          <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">LRAT SaaS</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-850 dark:text-slate-100 uppercase">
          Create Account
        </h2>
        <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
          Set up your team workspace in seconds
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:rounded-[32px] sm:px-10 border border-slate-100 dark:border-slate-800/80">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 flex items-start gap-3">
                <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                <p className="text-[11px] text-rose-600 dark:text-rose-450 font-bold uppercase tracking-wider leading-relaxed">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                Full Name
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={16} />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                Email Address
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                Password
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="•••••••• (Min 6 chars)"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                Confirm Password
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-500/20 text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 dark:text-blue-450 hover:underline">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
