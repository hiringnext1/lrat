import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Megaphone, AlertCircle, KeyRound, ChevronLeft } from 'lucide-react';
import axios from 'axios';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password recovery flow states
  const [mode, setMode] = useState('login'); // 'login' | 'forgot' | 'reset'
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    try {
      setError('');
      setLoading(true);
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
        // Redirect to signup page in verification step with email
        navigate('/signup', { state: { step: 'verification', email: errorData.email } });
      } else {
        setError(errorData?.error || 'Invalid credentials or server offline.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    if (!resetEmail) {
      setError('Please enter your email address.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const res = await axios.post('/api/auth/forgot-password', { email: resetEmail });
      if (res.data?.success) {
        setMode('reset');
      } else {
        setError(res.data?.error || 'Failed to send recovery code');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send recovery code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!resetCode || !newPassword || !confirmNewPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    try {
      setError('');
      setLoading(true);
      const res = await axios.post('/api/auth/reset-password', {
        email: resetEmail,
        code: resetCode,
        new_password: newPassword
      });
      if (res.data?.success) {
        setError('');
        alert('Password reset successful! Please log in with your new password.');
        setMode('login');
        setPassword('');
        setEmail(resetEmail);
      } else {
        setError(res.data?.error || 'Failed to reset password');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden text-left font-sans">
      {/* Ambient backgrounds */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {mode === 'login' && (
        <>
          <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center animate-fade-in">
            <div className="flex justify-center items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                <Megaphone size={28} strokeWidth={2.5} />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">LRAT SaaS</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-850 dark:text-slate-100 uppercase">
              Welcome Back
            </h2>
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              Log in to manage your automated campaigns
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:rounded-[32px] sm:px-10 border border-slate-100 dark:border-slate-800/80">
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 flex items-start gap-3">
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] text-rose-600 dark:text-rose-450 font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                  </div>
                )}

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
                      className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label htmlFor="password" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setError('');
                        setResetEmail(email);
                        setMode('forgot');
                      }}
                      className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-450 tracking-wider hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
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
                      className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-500/20 text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Logging in...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  New to LRAT?{' '}
                  <Link to="/signup" className="text-blue-600 dark:text-blue-450 hover:underline">
                    Create an Account
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === 'forgot' && (
        <>
          <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center animate-fade-in">
            <div className="flex justify-center items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                <KeyRound size={28} />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Recover Password</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-850 dark:text-slate-100 uppercase">
              Forgot Password
            </h2>
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              Enter your email to receive a recovery code
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:rounded-[32px] sm:px-10 border border-slate-100 dark:border-slate-800/80">
              <form className="space-y-6" onSubmit={handleForgotPassword}>
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 flex items-start gap-3">
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] text-rose-600 dark:text-rose-450 font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="resetEmail" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                    Email Address
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </div>
                    <input
                      id="resetEmail"
                      name="resetEmail"
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-500/20 text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Sending Code...' : 'Send Recovery Code'}
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                >
                  <ChevronLeft size={14} /> Back to Sign In
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {mode === 'reset' && (
        <>
          <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center animate-fade-in">
            <div className="flex justify-center items-center gap-3">
              <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
                <Lock size={28} />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Reset Password</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-black tracking-tight text-slate-850 dark:text-slate-100 uppercase">
              Set New Password
            </h2>
            <p className="mt-2 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
              Enter the recovery code sent to {resetEmail}
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 animate-fade-in">
            <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl py-8 px-4 shadow-[0_8px_30px_rgb(0,0,0,0.02)] sm:rounded-[32px] sm:px-10 border border-slate-100 dark:border-slate-800/80">
              <form className="space-y-5" onSubmit={handleResetPassword}>
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100/50 dark:border-rose-900/30 flex items-start gap-3">
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[11px] text-rose-600 dark:text-rose-450 font-bold uppercase tracking-wider leading-relaxed">{error}</p>
                  </div>
                )}

                <div>
                  <label htmlFor="resetCode" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                    6-Digit Recovery Code
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <input
                      id="resetCode"
                      name="resetCode"
                      type="text"
                      required
                      maxLength={6}
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                      className="block w-full text-center tracking-[0.4em] font-mono text-xl py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="000000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                    New Password
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="•••••••• (Min 6 chars)"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmNewPassword" className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </div>
                    <input
                      id="confirmNewPassword"
                      name="confirmNewPassword"
                      type="password"
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-500/20 text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </button>
                </div>
              </form>

              <div className="mt-6 border-t border-slate-100 dark:border-slate-800/80 pt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setMode('forgot');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                >
                  <ChevronLeft size={14} /> Back to Recovery Code
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
