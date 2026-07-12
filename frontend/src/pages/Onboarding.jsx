import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Building2, 
  Globe, 
  User, 
  Briefcase, 
  Linkedin, 
  ShieldCheck, 
  Sliders, 
  ChevronRight, 
  CheckCircle2, 
  Loader2, 
  ExternalLink, 
  RefreshCw,
  Sparkles,
  Target,
  Users,
  Compass,
  Home,
  Wrench,
  PenTool
} from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();
  
  // Current active step: 1 (Workspace), 2 (Business Context), 3 (LinkedIn), 4 (Limits), 5 (Complete)
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1 Form fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [designation, setDesignation] = useState('');

  // Step 2 Business Context fields
  const [businessType, setBusinessType] = useState('general');
  const [businessContext, setBusinessContext] = useState('');
  const [aiPersona, setAiPersona] = useState('');

  // Step 3 LinkedIn Connection variables
  const [connectPhase, setConnectPhase] = useState('idle'); // idle | waiting | success | error
  const [connectUrl, setConnectUrl] = useState('');
  const [pollCount, setPollCount] = useState(0);
  const [connectedAccount, setConnectedAccount] = useState(null);
  const pollRef = useRef(null);
  const windowRef = useRef(null);
  const initialCountRef = useRef(0);

  // Step 4 Limit variables
  const [dailyLimit, setDailyLimit] = useState(20);
  const [weeklyLimit, setWeeklyLimit] = useState(100);
  const [warmupMode, setWarmupMode] = useState(true);

  // Industry presets
  const industryPresets = [
    {
      id: 'saas_sales',
      label: 'B2B Sales & SaaS',
      icon: Target,
      context: 'We sell business software and SaaS solutions to improve efficiency and reduce costs.',
      persona: 'I am a business development representative reaching out to potential B2B software buyers.'
    },
    {
      id: 'recruitment',
      label: 'Recruitment & HR',
      icon: Users,
      context: 'We source qualified talent for open roles in technology, marketing, and leadership.',
      persona: 'I am a professional recruiter reaching out to candidates about job opportunities.'
    },
    {
      id: 'agency',
      label: 'Agency & Consulting',
      icon: Compass,
      context: 'We help businesses scale their operations, marketing, and client acquisition channels.',
      persona: 'I am a partner at a professional consulting agency reaching out to potential clients.'
    },
    {
      id: 'real_estate',
      label: 'Real Estate',
      icon: Home,
      context: 'We represent commercial and high-value residential properties.',
      persona: 'I am a real estate professional reaching out to potential buyers and investors.'
    },
    {
      id: 'freelance',
      label: 'IT Services & Tech',
      icon: Wrench,
      context: 'We provide custom software development, cloud services, and product engineering.',
      persona: 'I am a technology service provider reaching out to businesses looking to outsource IT tasks.'
    },
    {
      id: 'general',
      label: 'Custom / Other',
      icon: PenTool,
      context: '',
      persona: ''
    }
  ];

  // Load existing profile details if any
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await axios.get('/api/auth/me');
        if (res.data?.success && res.data.data) {
          const u = res.data.data;
          setName(u.name || '');
          setCompanyName(u.company_name || '');
          setCompanyWebsite(u.company_website || '');
          setDesignation(u.designation || '');
          setBusinessType(u.business_type || 'general');
          setBusinessContext(u.business_context || '');
          setAiPersona(u.ai_persona || '');
          
          if (u.onboarding_completed) {
            // Update local storage user record to keep sync
            const stored = JSON.parse(localStorage.getItem('lrat_user') || '{}');
            stored.onboarding_completed = 1;
            localStorage.setItem('lrat_user', JSON.stringify(stored));
            
            // Already completed onboarding, send to dashboard
            navigate('/dashboard');
          } else if (u.onboarding_step === 'connect_linkedin') {
            setStep(3);
          } else if (u.onboarding_step === 'limits') {
            setStep(4);
          }
        }
      } catch (err) {
        console.error('Failed to pre-load profile:', err);
      }
    }
    loadProfile();
  }, [navigate]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // API Call to update current step
  const updateOnboardingStep = async (stepName) => {
    try {
      await axios.put('/api/auth/onboarding/step', { step: stepName });
    } catch (err) {
      console.error('Failed to save step progress:', err);
    }
  };

  // Step 1 Submission
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    if (!name || !companyName) {
      setError('Please enter your name and company name.');
      return;
    }
    setError('');
    setStep(2);
  };

  // Step 2 Submission (Business Profile)
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Save profile updates to current uncompleted onboarding state
      await axios.put('/api/auth/profile', {
        name,
        company_name: companyName,
        company_website: companyWebsite,
        designation,
        business_type: businessType,
        business_context: businessContext,
        ai_persona: aiPersona
      });
      
      // Update local storage user record to keep sync
      const stored = JSON.parse(localStorage.getItem('lrat_user') || '{}');
      stored.name = name;
      localStorage.setItem('lrat_user', JSON.stringify(stored));

      await updateOnboardingStep('connect_linkedin');
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save business details');
    } finally {
      setLoading(false);
    }
  };

  // Step 3 LinkedIn Integration
  async function generateConnectLink() {
    try {
      setLoading(true);
      setError('');
      const res = await axios.post('/api/accounts/connect-link');
      return res.data.url;
    } catch (err) {
      setError('Could not generate LinkedIn sync URL. Verify API configurations.');
      setConnectPhase('error');
      setLoading(false);
      return null;
    }
  }

  async function startLinkedInSync() {
    const url = await generateConnectLink();
    if (!url) return;

    try {
      const res = await axios.get('/api/accounts');
      initialCountRef.current = (res.data.data || []).length;
    } catch {
      initialCountRef.current = 0;
    }

    setLoading(false);
    windowRef.current = window.open(url, '_blank', 'width=600,height=700,left=200,top=100');
    setConnectPhase('waiting');

    pollRef.current = setInterval(async () => {
      setPollCount(c => c + 1);
      try {
        const res = await axios.post('/api/accounts/sync');
        const accounts = res.data.data || [];
        if (accounts.length > initialCountRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          windowRef.current?.close();
          const newest = accounts[0]; 
          setConnectedAccount(newest);
          setConnectPhase('success');
        }
      } catch (e) {
        console.error('LinkedIn polling sync failed', e);
      }
    }, 4000);
  }

  function handleSkipLinkedIn() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    updateOnboardingStep('limits');
    setStep(4);
  }

  function handleNextToStep4() {
    updateOnboardingStep('limits');
    setStep(4);
  }

  // Step 4 Submission
  const handleStep4Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Complete onboarding and save details
      const res = await axios.post('/api/auth/onboarding/complete', {
        name,
        company_name: companyName,
        company_website: companyWebsite,
        designation,
        daily_limit: dailyLimit,
        business_type: businessType,
        business_context: businessContext
      });

      if (res.data?.success) {
        // Update local storage user state
        localStorage.setItem('lrat_user', JSON.stringify(res.data.user));
        setStep(5);
      } else {
        setError('Failed to complete onboarding setup.');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update safety limits');
    } finally {
      setLoading(false);
    }
  };

  const selectIndustry = (preset) => {
    setBusinessType(preset.id);
    setBusinessContext(preset.context);
    setAiPersona(preset.persona);
  };

  // Final Redirect
  const handleOnboardingFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-left">
      {/* Ambient glowing backdrops */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 dark:bg-purple-600/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Progress Top Bar */}
      <div className="w-full max-w-xl mb-8 relative z-10 px-4">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          <span>Outreach Setup Progress</span>
          <span>Step {step} of 5</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
          {[1, 2, 3, 4, 5].map(idx => (
            <div 
              key={idx} 
              className={`h-full flex-1 rounded-full transition-all duration-500 ${
                idx <= step 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600' 
                  : 'bg-slate-100 dark:bg-slate-900'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/80 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.01)] w-full max-w-xl p-8 sm:p-10 relative z-10">
        
        {/* Step 1: Workspace setup */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Create Workspace
                <Sparkles className="text-yellow-500" size={22} />
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-1">
                Tell us about yourself and your brand to custom-tailor campaigns
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-[11px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wide">
                {error}
              </div>
            )}

            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                  Your Full Name *
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-850 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                    Company Name *
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Building2 size={16} />
                    </div>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-850 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g. Acme Corp"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                    Designation
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Briefcase size={16} />
                    </div>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-855 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="e.g. Founder"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                  Company Website (Optional)
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Globe size={16} />
                  </div>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-855 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="https://acme.com"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  <span>Select Industry & Business Profile</span>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: B2B Business Profile (Industry & Context Selection) */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Business & AI Profile
                <Sparkles className="text-yellow-500" size={22} />
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-1">
                Select your industry so our AI can customize outreach prompts and tones
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-[11px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wide">
                {error}
              </div>
            )}

            <form onSubmit={handleStep2Submit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-3">
                  Select Your Main Focus Area
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {industryPresets.map((preset) => {
                    const IconComponent = preset.icon;
                    const isSelected = businessType === preset.id;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => selectIndustry(preset)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
                          isSelected 
                            ? 'border-blue-600 bg-blue-50/40 dark:bg-blue-950/15 text-blue-600 dark:text-blue-400 ring-2 ring-blue-500/20 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-50 dark:hover:bg-slate-900/40'
                        }`}
                      >
                        <IconComponent size={20} className="mb-2" />
                        <span className="text-[11px] font-black uppercase tracking-tight">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                  Describe Your Offer / Offering Brief (Context for AI)
                </label>
                <textarea
                  value={businessContext}
                  onChange={(e) => setBusinessContext(e.target.value)}
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-850 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-24 resize-none"
                  placeholder="Paste details of what you sell/offer. Example: We sell custom software development services to help logistics firms automate tracking."
                />
                <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-semibold uppercase">
                  This description is used by Llama-3.1 to dynamically personalize cold messages.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">
                  Your Outreach Role / AI Tone (Optional)
                </label>
                <input
                  type="text"
                  value={aiPersona}
                  onChange={(e) => setAiPersona(e.target.value)}
                  className="block w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/55 rounded-2xl text-slate-855 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="e.g. Sales representative booking demos"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Configure Outreach Link</span>}
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 3: Connect LinkedIn Account */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center sm:text-left">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
                <Linkedin className="text-blue-600" size={28} />
                Link LinkedIn Node
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-1">
                Link your sender profile to start launching automation campaign sequences
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-[11px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wide">
                {error}
              </div>
            )}

            {connectPhase === 'idle' && (
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 text-center space-y-5">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 rounded-2xl flex items-center justify-center mx-auto text-blue-600">
                  <Linkedin size={32} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Proxy-Gated Node connection</h4>
                  <p className="text-xs text-slate-455 dark:text-slate-500 max-w-sm mx-auto leading-relaxed">
                    We initiate a secure sandboxed window powered by Unipile to capture cookies safely. Passwords are never collected.
                  </p>
                </div>
                
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleSkipLinkedIn}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Skip & Link Later
                  </button>
                  <button
                    onClick={startLinkedInSync}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#0077b5] hover:bg-[#006097] text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98]"
                  >
                    <ExternalLink size={14} />
                    <span>Start LinkedIn Connect</span>
                  </button>
                </div>
              </div>
            )}

            {connectPhase === 'waiting' && (
              <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-3xl p-8 text-center space-y-5">
                <Loader2 size={32} className="animate-spin text-blue-500 mx-auto" />
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-blue-800 dark:text-blue-400 uppercase tracking-tight">Login Verification Pending...</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Complete authentication in the opened window. Once logged in, this page will automatically synchronize and proceed.
                  </p>
                </div>

                <div className="pt-2 max-w-xs mx-auto flex flex-col gap-2">
                  <button 
                    onClick={() => {
                      axios.post('/api/accounts/sync').then(res => {
                        const accounts = res.data.data || [];
                        if (accounts.length > initialCountRef.current) {
                          clearInterval(pollRef.current);
                          setConnectedAccount(accounts[0]);
                          setConnectPhase('success');
                        } else {
                          alert('Authentication not detected. Verify you logged in on the popup window.');
                        }
                      });
                    }}
                    className="flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <RefreshCw size={12} />
                    <span>Check Connection Status</span>
                  </button>
                  
                  <button 
                    onClick={handleSkipLinkedIn}
                    className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest hover:underline pt-2"
                  >
                    Skip LinkedIn connection
                  </button>
                </div>
              </div>
            )}

            {connectPhase === 'success' && (
              <div className="bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-3xl p-8 text-center space-y-5">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 size={32} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">LinkedIn Connected Successfully!</h4>
                  {connectedAccount && (
                    <p className="text-xs text-slate-500 dark:text-slate-450">
                      Active Node profile: <span className="font-extrabold text-blue-600">{connectedAccount.name}</span>
                    </p>
                  )}
                </div>

                <div className="pt-4 max-w-xs mx-auto">
                  <button
                    onClick={handleNextToStep4}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98]"
                  >
                    <span>Configure Limits</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}

            {connectPhase === 'error' && (
              <div className="bg-rose-50/30 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/30 rounded-3xl p-8 text-center space-y-5">
                <div className="text-rose-500 text-3xl">⚠️</div>
                <h4 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Connection Generation Failed</h4>
                <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed max-w-xs mx-auto">
                  LinkedIn API key configuration is missing or expired.
                </p>
 
                <div className="pt-2 flex gap-3 max-w-xs mx-auto">
                  <button
                    onClick={handleSkipLinkedIn}
                    className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Skip Step
                  </button>
                  <button
                    onClick={() => { setConnectPhase('idle'); startLinkedInSync(); }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Retry Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Safety limits */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                <Sliders className="text-blue-600" size={26} />
                Safety & Daily Limits
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mt-1">
                Maintain high account safety by setting boundaries for connection invites and messages
              </p>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl text-[11px] font-bold text-rose-600 dark:text-rose-450 uppercase tracking-wide">
                {error}
              </div>
            )}

            <form onSubmit={handleStep4Submit} className="space-y-6">
              <div className="space-y-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                      Max Daily Connections Limit
                    </label>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{dailyLimit} / day</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={25}
                    step={5}
                    value={dailyLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setDailyLimit(val);
                      setWeeklyLimit(val * 5);
                    }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-650"
                  />
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-semibold uppercase">Recommended limit: 15-25 daily requests</p>
                </div>

                <hr className="border-slate-100 dark:border-slate-800/80" />

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                      Max Weekly Connections Limit
                    </label>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{weeklyLimit} / week</span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={150}
                    step={10}
                    value={weeklyLimit}
                    onChange={(e) => setWeeklyLimit(parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-650"
                  />
                </div>
              </div>

              {/* Safety checkbox */}
              <label className="flex items-start gap-3.5 p-4 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/30 rounded-2xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={warmupMode}
                  onChange={(e) => setWarmupMode(e.target.checked)}
                  className="mt-1 w-4.5 h-4.5 text-blue-600 bg-slate-50 border-slate-200 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <h5 className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight flex items-center gap-1.5">
                    <ShieldCheck className="text-emerald-500" size={14} />
                    Enable Intelligent Account Warm-up (Recommended)
                  </h5>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                    Gradually increases connection targets over 14 days to prevent LinkedIn spam filters from flagging your account.
                  </p>
                </div>
              </label>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <span>Complete Registration Setup</span>}
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Complete State */}
        {step === 5 && (
          <div className="text-center space-y-7 py-4">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-650 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-blue-500/20 animate-bounce">
              <CheckCircle2 size={56} className="text-white" strokeWidth={1.5} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Setup Completed!</h2>
              <p className="text-xs font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest">Your automated outreach workspace is ready</p>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto font-medium">
              We have initialized default communication templates and optimized your safety limits. You can now build campaigns, import prospects, and automate follow-ups.
            </p>

            <button
              onClick={handleOnboardingFinish}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
            >
              <span>Launch My Dashboard</span>
              <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
