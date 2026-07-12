import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Shield, Target, Users, ArrowRight, MessageSquare, 
  Bot, Globe, LayoutGrid, CheckCircle2, TrendingUp, Sparkles, 
  Terminal, Cpu, Database, Activity, Play, Lock, Clock, Check, 
  Plus, Minus, Search, Mail, ShieldCheck, BarChart3, Layers,
  ExternalLink, Share2, Network, Filter, ChevronDown, CheckCircle,
  HelpCircle, RefreshCw, Send, AlertTriangle, Key
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── ANIMS & SECTION CONTROLLERS ──────────────────────────────────────────
const Section = ({ children, id, className = "" }) => (
  <section id={id} className={`relative z-10 w-full overflow-hidden ${className}`}>
    <div className="max-w-7xl mx-auto px-6 md:px-12">
      {children}
    </div>
  </section>
);

const FadeIn = ({ children, delay = 0, y = 30 }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

// ─── STUNNING BACKGROUND ELEMENTS ──────────────────────────────────────────
function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Light slate background */}
      <div className="absolute inset-0 bg-[#fbfcfd]" />
      
      {/* Modern Grid Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.035]" 
        style={{
          backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating Glowing Blobs with HSL Color Grading */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-gradient-to-tr from-indigo-300/20 to-purple-400/20 blur-[130px] rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[20%] right-[-10%] w-[45vw] h-[45vw] bg-gradient-to-br from-blue-300/20 to-emerald-300/20 blur-[140px] rounded-full animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute top-[40%] left-[30%] w-[35vw] h-[35vw] bg-indigo-500/[0.03] blur-[100px] rounded-full" />
    </div>
  );
}

// ─── FLOATING PILL NAVIGATION ──────────────────────────────────────────────
function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-6 pt-5 transition-all duration-300">
      <div className={`max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between rounded-full border transition-all duration-500 ${
        scrolled 
          ? 'bg-white/80 backdrop-blur-xl border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)]' 
          : 'bg-white/40 backdrop-blur-md border-slate-200/40 shadow-none'
      }`}>
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:rotate-12 transition-all duration-500">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tighter text-slate-900 uppercase">LRAT</span>
        </div>
        
        <div className="hidden md:flex items-center gap-7">
          {['Playgrounds', 'Playbooks', 'Security', 'ROI-Calculator', 'Pricing', 'FAQs'].map(label => (
            <a 
              key={label} 
              href={`#${label.toLowerCase()}`} 
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors uppercase tracking-wider"
              id={`nav-link-${label.toLowerCase()}`}
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/dashboard">
            <button 
              id="nav-launch-console-btn"
              className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 shadow-md shadow-slate-950/10"
            >
              Launch Console
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── INTERACTIVE SANDBOX PLAYGROUND ────────────────────────────────────────
const prospects = [
  {
    name: "Aman Gupta",
    role: "VP of Growth at Razorpay",
    prevRole: "Head of Marketing at Flipkart",
    skills: "Enterprise Sales, Account Management, Revenue Ops",
    interests: "B2B partnerships, Fintech APIs",
    avatar: "AG"
  },
  {
    name: "Sarah Chen",
    role: "Head of Sales at Stripe",
    prevRole: "Sales Lead at Google Pay",
    skills: "Merchant Acquisition, Payment Rails, API Integrations",
    interests: "B2B SaaS growth, CRM pipelines",
    avatar: "SC"
  },
  {
    name: "Vikram Malhotra",
    role: "CEO & Founder at stealth-startup (ex-YC)",
    prevRole: "VP of Business Development at OpenAI",
    skills: "Partnerships, Enterprise Deals, Strategic Alliances",
    interests: "Seed funding, Sales tooling",
    avatar: "VM"
  }
];

const playbooks = [
  {
    name: "Personalized Outreach Pitch",
    template: "Hey [Name], loved your background at [PrevRole] and now leading growth at [Company]. I saw you are deeply interested in [Interest]. We've built an outbound automation platform that matches your focus on [Skill]. Let's connect?"
  },
  {
    name: "Quick Synergy Hook",
    template: "Hi [Name] — noticed you went from [PrevRole] to [Company]. Quick question: how is your team handling [Skill] to boost your client acquisition this quarter? Cheers!"
  }
];

function InteractiveSandbox() {
  const [selectedProspect, setSelectedProspect] = useState(prospects[0]);
  const [selectedPlaybook, setSelectedPlaybook] = useState(playbooks[0]);
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [output, setOutput] = useState("");

  const simulatePersonalization = () => {
    setGenerating(true);
    setStep(1);
    setOutput("");
    
    setTimeout(() => {
      setStep(2);
      setTimeout(() => {
        setStep(3);
        setTimeout(() => {
          const company = selectedProspect.role.split("at ")[1] || "current company";
          let message = selectedPlaybook.template
            .replace("[Name]", selectedProspect.name.split(" ")[0])
            .replace("[PrevRole]", selectedProspect.prevRole)
            .replace("[Company]", company)
            .replace("[Interest]", selectedProspect.interests)
            .replace("[Skill]", selectedProspect.skills.split(",")[0]);

          setOutput(message);
          setGenerating(false);
          setStep(4);
        }, 1200);
      }, 1000);
    }, 800);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-[40px] p-6 md:p-8 shadow-xl shadow-slate-100/50">
      <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NVIDIA Llama-3.1 Playground</span>
        </div>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-slate-200" />
          <div className="w-3 h-3 rounded-full bg-slate-200" />
          <div className="w-3 h-3 rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="space-y-6">
        {/* Step 1: Select Candidate */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
            1. Select Target Prospect
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {prospects.map((c, idx) => (
              <button
                key={idx}
                id={`prospect-sandbox-${idx}`}
                onClick={() => {
                  setSelectedProspect(c);
                  setStep(0);
                  setOutput("");
                }}
                className={`flex flex-col p-3 rounded-2xl border text-left transition-all ${
                  selectedProspect.name === c.name 
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="text-xs font-bold text-slate-800 truncate">{c.name}</span>
                <span className="text-[9px] text-slate-500 font-medium truncate mt-0.5">{c.role.split("at")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prospect Info Details Card */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left">
          <div className="flex items-center gap-3 mb-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center font-bold text-indigo-700 text-xs shadow-sm">
              {selectedProspect.avatar}
            </div>
            <div>
              <h5 className="text-xs font-bold text-slate-900">{selectedProspect.name}</h5>
              <p className="text-[10px] text-slate-500">{selectedProspect.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50 text-[10px] font-medium text-slate-600">
            <div>
              <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider">Scraped Skills</span>
              <span className="truncate block font-semibold text-slate-800">{selectedProspect.skills}</span>
            </div>
            <div>
              <span className="block text-[8px] text-slate-400 uppercase font-black tracking-wider">Interests</span>
              <span className="truncate block font-semibold text-slate-800">{selectedProspect.interests}</span>
            </div>
          </div>
        </div>

        {/* Step 2: Select Template */}
        <div>
          <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2.5">
            2. Choose Campaign Sequence
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {playbooks.map((p, idx) => (
              <button
                key={idx}
                id={`playbook-sandbox-${idx}`}
                onClick={() => {
                  setSelectedPlaybook(p);
                  setStep(0);
                  setOutput("");
                }}
                className={`p-3 rounded-2xl border text-left text-xs font-bold transition-all ${
                  selectedPlaybook.name === p.name 
                    ? 'border-blue-600 bg-blue-50/40 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-blue-600">
                  <Play size={10} className="fill-blue-600" />
                  <span>{p.name.split(" ")[0]} Flow</span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium line-clamp-1">{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Trigger personalization */}
        <button
          disabled={generating}
          onClick={simulatePersonalization}
          id="sandbox-trigger-btn"
          className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold uppercase text-[11px] tracking-widest hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 active:scale-98"
        >
          {generating ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Cpu size={14} />
          )}
          {generating ? 'Processing NIM Pipelines...' : 'Personalize Connection Note'}
        </button>

        {/* Animated Terminal Outputs */}
        <div className="relative">
          <div className="bg-slate-950 rounded-2xl p-5 text-left text-xs font-mono text-slate-300 min-h-[160px] flex flex-col justify-between shadow-inner">
            <div className="space-y-2">
              {step >= 1 && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <span>✔</span>
                  <span>[STEP 1] View Prospect Profile & Scrape Metadata (35s Safe Gating)</span>
                </div>
              )}
              {step >= 2 && (
                <div className="flex items-center gap-2 text-blue-400">
                  <RefreshCw size={10} className="animate-spin" />
                  <span>[STEP 2] Formatting Prompt for Llama-3.1-70B-Instruct...</span>
                </div>
              )}
              {step >= 3 && (
                <div className="flex items-center gap-2 text-indigo-400">
                  <span>✔</span>
                  <span>[STEP 3] Executing NVIDIA NIM Personalization Call (200ms latency)</span>
                </div>
              )}
              {step === 4 && (
                <div className="pt-3 border-t border-slate-800 text-slate-100">
                  <p className="text-[10px] font-black text-slate-500 mb-1 uppercase tracking-widest">NIM Generated outreach:</p>
                  <p className="leading-relaxed text-xs italic bg-white/5 p-3 rounded-xl border border-white/5">"{output}"</p>
                </div>
              )}
            </div>

            {step === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                <Terminal size={24} className="mb-2 opacity-50" />
                <p className="text-[10px] text-center font-bold tracking-wider uppercase">Logs will print here...</p>
              </div>
            )}
            
            <div className="flex justify-between items-center text-[9px] text-slate-600 pt-3 border-t border-slate-900 mt-4">
              <span>MODEL: Llama-3.1 70B</span>
              <span>PROVIDER: NVIDIA NIM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HERO SECTION ──────────────────────────────────────────────────────────
function Hero() {
  const [logs, setLogs] = useState([
    { id: 1, text: "Proxy assigned: 185.190.140.22 (Karnataka, IN)", type: "info" },
    { id: 2, text: "Profile view gating initialized for SC-Stripe (35s delay)", type: "success" },
  ]);

  useEffect(() => {
    const feeds = [
      "Simulating profile click & scroll on target profile",
      "Running Fit Score analytics: Prospect Score 94%",
      "Personalizing Connection invite: Llama-3.1 NIM active",
      "Invite sent safely! Action cooldown locked: 18 minutes",
      "Lead Webhook received: Rahul S. accepted connection",
      "Websocket alert: Replied 'Hot Lead' status captured",
    ];
    let i = 0;
    const interval = setInterval(() => {
      setLogs(prev => [
        ...prev.slice(-3),
        { id: Date.now(), text: feeds[i % feeds.length], type: i % 2 === 0 ? "success" : "info" }
      ]);
      i++;
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <Section id="playgrounds" className="pt-36 md:pt-44 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Side: Pitch and Metrics */}
        <div className="lg:col-span-6 space-y-8 text-left">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200/50 text-blue-600 text-[10px] font-black uppercase tracking-wider">
              <Sparkles size={12} className="animate-pulse" />
              Stealth LinkedIn Outreach & Lead Gen Software
            </div>
            
            {/* Primary SEO H1 Tag */}
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 tracking-tighter leading-[1.05] mt-6">
              Close Leads 10x Faster Without <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
                LinkedIn Restrictions.
              </span>
            </h1>
            
            <p className="text-lg text-slate-500 font-medium leading-relaxed mt-6 max-w-xl">
              Scale 10+ professional accounts safely. Deploy custom visual playbooks with residential proxies, human view gating, and hyper-personalized outreach generated under 200ms using NVIDIA Llama-3.1 NIM.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-6 py-6 border-y border-slate-200/60 mt-10 text-left">
              <div>
                <span className="block text-3xl font-black text-slate-900 tracking-tight">25 / day</span>
                <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mt-1">Smart Connection Cap</span>
              </div>
              <div>
                <span className="block text-3xl font-black text-blue-600 tracking-tight">98.2%</span>
                <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mt-1">Delivery Success</span>
              </div>
              <div>
                <span className="block text-3xl font-black text-slate-900 tracking-tight">&lt; 1s</span>
                <span className="block text-[9px] text-slate-400 font-black uppercase tracking-wider mt-1">AI Personalization</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
              <Link to="/dashboard" className="w-full sm:w-auto">
                <button 
                  id="hero-primary-cta"
                  className="w-full bg-blue-600 text-white px-8 py-4.5 rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 group hover:scale-103"
                >
                  Start Automating Free
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <a href="#pricing" className="w-full sm:w-auto">
                <button 
                  id="hero-secondary-cta"
                  className="w-full bg-white border border-slate-200 hover:border-slate-300 text-slate-800 px-8 py-4.5 rounded-2xl font-bold uppercase text-[11px] tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Shield size={14} className="text-slate-600" />
                  View Flexible Plans
                </button>
              </a>
            </div>
          </FadeIn>
        </div>

        {/* Right Side: Interactive Sandbox Playground */}
        <div className="lg:col-span-6 relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/5 to-purple-500/5 blur-[120px] rounded-[50px] -z-10" />
          <FadeIn delay={0.2}>
            <InteractiveSandbox />
          </FadeIn>
        </div>
      </div>

      {/* Brand Trust Section */}
      <div className="mt-20 pt-10 border-t border-slate-200/50 text-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Integrated seamlessly with your stack
        </span>
        <div className="flex flex-wrap justify-center items-center gap-12 mt-6 opacity-40 hover:opacity-60 transition-opacity duration-300">
          <span className="text-sm font-black tracking-tight text-slate-900">Hubspot CRM</span>
          <span className="text-sm font-black tracking-tight text-slate-900">Salesforce</span>
          <span className="text-sm font-black tracking-tight text-slate-900">Clay.run</span>
          <span className="text-sm font-black tracking-tight text-slate-900">Apollo.io</span>
          <span className="text-sm font-black tracking-tight text-slate-900">Unipile API</span>
          <span className="text-sm font-black tracking-tight text-slate-900">NVIDIA NIM AI</span>
        </div>
      </div>
    </Section>
  );
}

// ─── VISUAL ACCOUNT CLUSTERING ──────────────────────────────────────────────
function AccountCluster() {
  return (
    <Section className="py-24 bg-slate-50/50 border-y border-slate-200/60 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Visual Diagram */}
        <div className="lg:col-span-7 relative">
          <div className="absolute inset-0 bg-blue-400/5 blur-[100px] rounded-full" />
          
          <div className="bg-white border border-slate-200/80 rounded-[40px] p-8 shadow-xl shadow-slate-100/50 text-left">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Network size={14} className="text-blue-500" />
              Active Account Clustering (Stealth Group)
            </h4>
            
            {/* Senders Grid */}
            <div className="space-y-4">
              {[
                { name: "Sender #1: Rohit Sharma (B2B Sales Development)", status: "Active (Gated)", proxy: "Proxy #1 (mumbai.res.proxy)", color: "bg-emerald-500", progress: 65, num: "16/25" },
                { name: "Sender #2: Priyanka Sen (Director)", status: "Active (Cooldown)", proxy: "Proxy #2 (delhi.res.proxy)", color: "bg-blue-500", progress: 40, num: "10/25" },
                { name: "Sender #3: John Doe (Growth Partner)", status: "Warmup (Week 2)", proxy: "Proxy #3 (bangalore.res.proxy)", color: "bg-amber-500", progress: 10, num: "3/15" },
              ].map((s, idx) => (
                <div key={idx} className="bg-slate-50/60 border border-slate-100 p-4.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                      <span className="text-xs font-extrabold text-slate-800">{s.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-semibold">{s.proxy}</span>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-24 text-right">
                      <div className="flex justify-between text-[9px] font-black text-slate-500 mb-1">
                        <span>LIMITS</span>
                        <span>{s.num}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full ${s.color}`} style={{ width: `${s.progress}%` }} />
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[8.5px] font-extrabold uppercase ${
                      s.status.includes('Active') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle size={12} className="text-emerald-500" />
                IP Leak Guard & Cookie Rotation Enabled
              </span>
              <span className="text-[9px] bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full uppercase">
                Stealth Protocol active
              </span>
            </div>
          </div>
        </div>

        {/* Right Info pitch */}
        <div className="lg:col-span-5 text-left space-y-6">
          <FadeIn>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              Multi-Account Cluster
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mt-3">
              Manage multiple profiles without risk.
            </h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mt-4">
              LRAT assigns distinct Residential Proxies, isolated fingerprint configurations, and safety timers to each professional profile. This prevents accounts from linking to each other and shields them from LinkedIn limits.
            </p>
            
            <div className="space-y-4 pt-4">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                  <Check size={10} className="text-blue-600" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Warmup schedules automatically enforced</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Slowly scales connection caps week-by-week so accounts don't trigger red flags.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5 border border-blue-200">
                  <Check size={10} className="text-blue-600" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Global Duplication Guard</h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">Two senders will never contact the same prospect, avoiding double outreach embarrassment.</p>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </Section>
  );
}

// ─── INTERACTIVE PLAYBOOK BUILDER FLOW SHOWCASE ───────────────────────────
function VisualPlaybookShowcase() {
  const [activeNode, setActiveNode] = useState('invite');

  const nodes = [
    {
      id: 'import',
      title: '1. Ingest Leads',
      subtitle: 'CSV or Search URL',
      icon: Search,
      desc: 'Upload prospect spreadsheets or paste raw search URLs. LRAT automatically extracts titles, companies, locations, and LinkedIn member IDs. It filters them against the Duplication Guard database.',
      technical: 'Native SQLite bulk transaction blocks eliminate table locks and scale speed 100x.'
    },
    {
      id: 'gate',
      title: '2. Profile Gating',
      subtitle: '35s Human Mimicry',
      icon: Shield,
      desc: 'Before sending any outreach, LRAT initiates a mandatory 35-second profile view. It simulates mouse movements, clicks, and page scrolls to ensure LinkedIn registration filters register standard human actions.',
      technical: 'Enforced safety gating delays avoid browser-native API triggers.'
    },
    {
      id: 'ai',
      title: '3. NIM AI scoring',
      subtitle: 'NVIDIA Llama-3.1 70B',
      icon: Cpu,
      desc: 'The backend parses prospect experience data against your campaign\'s offer summary. It assigns a prospect Fit Score (0-100) and writes a hyper-targeted personal icebreaker note.',
      technical: 'Sub-second server-less generation using NVIDIA NIM Llama endpoints.'
    },
    {
      id: 'invite',
      title: '4. Dispatch Outreach',
      subtitle: 'Proxy Cooldown Delays',
      icon: Send,
      desc: 'The invite is sent using designated local proxies. An action-locked timer (15-28 mins cooldown) triggers immediately upon a successful outreach, securing the daily limits.',
      technical: 'Warmup logic starts with 5 connections/day, scaling safely to 25/day.'
    },
    {
      id: 'sync',
      title: '5. Webhook Reply Sync',
      subtitle: 'Unified Inbox Console',
      icon: MessageSquare,
      desc: 'When a prospect accepts or replies, Unipile webhooks intercept the message. Active campaign sequences automatically pause. Senders view the prospect under "Hot Leads" in the inbox.',
      technical: 'HMAC-SHA256 signature verification blocks spoofed incoming request payloads.'
    }
  ];

  const currentNode = nodes.find(n => n.id === activeNode) || nodes[0];

  return (
    <Section id="playbooks" className="py-24 bg-white border-b border-slate-200/60 text-left">
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Visual Campaign Engine</span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">The Automated Outreach Pipeline.</h2>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">
          See how LRAT's playbook builder maps out actions in visual flowchart steps, executing outreach cleanly, safely, and dynamically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Side: Pipeline Steps map */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Campaign Flow Nodes</span>
          
          <div className="relative pl-6 border-l-2 border-slate-100 space-y-4">
            {nodes.map((node) => {
              const Icon = node.icon;
              const isSelected = activeNode === node.id;
              return (
                <button
                  key={node.id}
                  id={`playbook-node-${node.id}`}
                  onClick={() => setActiveNode(node.id)}
                  className={`w-full text-left p-4.5 rounded-2xl border transition-all flex items-start gap-4 relative ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/30 shadow-sm' 
                      : 'border-slate-200/60 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute left-[-27px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                  )}
                  <div className={`p-2.5 rounded-xl border ${
                    isSelected ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white border-slate-200 text-slate-500'
                  }`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">{node.title}</h4>
                    <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{node.subtitle}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Visual Flowchart Detailed Cards */}
        <div className="lg:col-span-7">
          <div className="bg-slate-950 rounded-[40px] p-8 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.08),transparent_50%)]" />
            
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Node Status Inspection</span>
                <span className="text-[9px] bg-white/10 text-slate-300 px-3 py-1 rounded-full uppercase font-bold">Stealth active</span>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Active Step Description</span>
                <h3 className="text-2xl font-extrabold tracking-tight text-white uppercase">{currentNode.title}</h3>
                <p className="text-xs font-medium text-slate-400 leading-relaxed">
                  {currentNode.desc}
                </p>
              </div>

              <div className="p-5 bg-white/5 border border-white/5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-[10px] uppercase tracking-wider">
                  <Terminal size={14} />
                  <span>Technical Execution Parameter</span>
                </div>
                <p className="text-[11px] font-mono text-slate-300 leading-relaxed">
                  {currentNode.technical}
                </p>
              </div>

              <div className="flex justify-between items-center text-[9px] text-slate-500 pt-4 border-t border-white/10">
                <span>Playbook Engine v6.0</span>
                <span>Active Campaign Guard</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── INTEGRATION MARQUEE ────────────────────────────────────────────────────
function Ecosystem() {
  const platforms = [
    { n: "Clay.run", t: "Ingestion Source" },
    { n: "Salesforce", t: "CRM sync" },
    { n: "Hubspot", t: "Deals pipelines" },
    { n: "Apollo.io", t: "Lead database" },
    { n: "Instantly.ai", t: "Multi-channel" },
    { n: "Unipile API", t: "LinkedIn Provider" },
    { n: "Nvidia NIM", t: "LLM Server" },
  ];
  return (
    <section id="ecosystem" className="py-20 bg-white border-b border-slate-200/50 overflow-hidden relative">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GTM Stack Integrations</span>
        <h3 className="text-2xl font-extrabold text-slate-900 mt-3 tracking-tight">Syncs seamlessly with your workspace</h3>
      </div>
      
      <div className="relative w-full flex overflow-x-hidden">
        {/* Marquee Body */}
        <div className="flex animate-marquee gap-8 whitespace-nowrap">
          {platforms.concat(platforms).map((p, i) => (
            <div 
              key={i} 
              className="bg-slate-50 border border-slate-200/50 px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-sm shrink-0"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-extrabold text-slate-900">{p.n}</span>
              <span className="text-[9px] bg-slate-200/80 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {p.t}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── STEALTH TIMELINE OUTREACH ──────────────────────────────────────────────
function StealthTimeline() {
  const steps = [
    {
      title: "1. Profile Scan & Scrape",
      desc: "System performs a simulated profile view with click gestures, parsing skills & experiences.",
      wait: "35 Seconds mandatory delay",
      icon: Search
    },
    {
      title: "2. Personalization Scoring",
      desc: "Nvidia Llama-3.1 grades prospect match (0-100) and drafts hyper-targeted connection messages.",
      wait: "Sub-second generation",
      icon: Cpu
    },
    {
      title: "3. Safe Invitation Delivery",
      desc: "Invitation delivered via Unipile proxy. An action-locked timer cooldown starts immediately.",
      wait: "15 to 28 Minutes wait",
      icon: Lock
    },
    {
      title: "4. Instant Conversion Check",
      desc: "Webhooks verify acceptances every 5 minutes and follow-up templates are prepared.",
      wait: "24/7 sync logs",
      icon: RefreshCw
    }
  ];

  return (
    <Section id="security" className="py-28 bg-[#fbfcfd]">
      <div className="text-center max-w-2xl mx-auto space-y-4 mb-20">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Outreach Life-Cycle</span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">The Safe Outreach Sequence.</h2>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">
          LinkedIn restrictions occur when systems perform fast actions. LRAT uses an advanced pipeline that waits between actions just like a human.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
        {/* Connection Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200/50 hidden md:block -translate-y-12 -z-10" />
        
        {steps.map((s, idx) => (
          <FadeIn key={idx} delay={idx * 0.15}>
            <div className="bg-white border border-slate-200/60 p-6.5 rounded-3xl text-left relative hover:shadow-lg hover:shadow-slate-100/50 transition-all group shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                <s.icon size={20} className="text-slate-600 group-hover:text-white" />
              </div>
              
              <h4 className="text-xs font-extrabold text-slate-950 mb-2">{s.title}</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium mb-4">{s.desc}</p>
              
              <span className="inline-block text-[9px] bg-blue-50 text-blue-600 font-extrabold uppercase px-2.5 py-1 rounded-full tracking-wider border border-blue-200/30">
                {s.wait}
              </span>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ─── INTERACTIVE ROI & SAFETY CALCULATOR ────────────────────────────────────
function InteractiveCalculator() {
  // ROI Slider state
  const [accounts, setAccounts] = useState(5);
  const [dailyInvites, setDailyInvites] = useState(15);
  
  // Safety Toggle state
  const [warmupEnabled, setWarmupEnabled] = useState(true);
  const [residentialProxy, setResidentialProxy] = useState(true);
  const [smartGating, setSmartGating] = useState(true);
  const [aiPersonalized, setAiPersonalized] = useState(true);

  // Calculations
  const monthlyOutreach = accounts * dailyInvites * 20; // 20 working days in a month
  const responseRate = 0.32; // 32% response rate with AI personalization
  const warmReplies = Math.round(monthlyOutreach * responseRate);
  const hoursSaved = Math.round((monthlyOutreach * 4.5) / 60);

  // Safety Score calculation
  let safetyScore = 20;
  if (warmupEnabled) safetyScore += 20;
  if (residentialProxy) safetyScore += 30;
  if (smartGating) safetyScore += 15;
  if (aiPersonalized) safetyScore += 15;
  if (dailyInvites > 20) safetyScore -= 10;
  if (!residentialProxy && accounts > 2) safetyScore -= 20;
  safetyScore = Math.max(10, Math.min(100, safetyScore));

  const getSafetyStatus = (score) => {
    if (score >= 80) return { text: "STEALTH SAFE (No Ban Risk)", color: "text-emerald-700 bg-emerald-50 border-emerald-200", barColor: "bg-emerald-500" };
    if (score >= 60) return { text: "MODERATE RISK (Caution)", color: "text-amber-700 bg-amber-50 border-amber-200", barColor: "bg-amber-500" };
    return { text: "CRITICAL DANGER (Account Ban likely)", color: "text-rose-700 bg-rose-50 border-rose-200", barColor: "bg-rose-500" };
  };

  const status = getSafetyStatus(safetyScore);

  return (
    <Section id="roi-calculator" className="py-24 bg-white border-t border-slate-200/60 text-left">
      <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">ROI & Security Estimator</span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Grade Your Outreach Metrics.</h2>
        <p className="text-slate-500 font-medium text-sm leading-relaxed">
          Test your outreach goals. Calculate the hours saved, warm replies generated, and check if your setup meets LinkedIn account safety guidelines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Side: ROI Sliders */}
        <div className="lg:col-span-6 bg-slate-50 border border-slate-200/60 rounded-[40px] p-6 md:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">1. Outreach ROI Estimator</h3>
            
            <div className="space-y-6">
              {/* Accounts Slider */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 uppercase">
                  <span>Connected LinkedIn Profiles</span>
                  <span className="text-blue-600 text-sm font-black">{accounts} Accounts</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  value={accounts}
                  onChange={(e) => setAccounts(parseInt(e.target.value))}
                  id="slider-accounts"
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              {/* Invites Slider */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 uppercase">
                  <span>Invites per account / day</span>
                  <span className="text-blue-600 text-sm font-black">{dailyInvites} Connection requests</span>
                </div>
                <input 
                  type="range" 
                  min="5" 
                  max="25" 
                  value={dailyInvites}
                  onChange={(e) => setDailyInvites(parseInt(e.target.value))}
                  id="slider-invites"
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* ROI Outputs */}
          <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200/60 mt-8">
            <div>
              <span className="block text-2xl font-black text-slate-900">{monthlyOutreach}</span>
              <span className="block text-[8px] text-slate-400 font-extrabold uppercase mt-1">Invites / Mo</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-blue-600">{warmReplies}</span>
              <span className="block text-[8px] text-slate-400 font-extrabold uppercase mt-1">Warm Replies / Mo</span>
            </div>
            <div>
              <span className="block text-2xl font-black text-slate-900">{hoursSaved} Hrs</span>
              <span className="block text-[8px] text-slate-400 font-extrabold uppercase mt-1">Time Saved / Mo</span>
            </div>
          </div>
        </div>

        {/* Right Side: Safety Switchboard */}
        <div className="lg:col-span-6 bg-slate-50 border border-slate-200/60 rounded-[40px] p-6 md:p-8 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">2. Safety Health Estimator</h3>
            
            <div className="space-y-4">
              {/* Warmup Switch */}
              <div className="flex justify-between items-center p-3 rounded-2xl bg-white border border-slate-150">
                <div>
                  <span className="block text-xs font-extrabold text-slate-800">Enforce Warmup Schedules</span>
                  <span className="block text-[9px] text-slate-400 font-medium">Auto-scales new profiles slowly</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={warmupEnabled}
                  onChange={(e) => setWarmupEnabled(e.target.checked)}
                  id="checkbox-warmup"
                  className="w-5 h-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Residential Proxy Switch */}
              <div className="flex justify-between items-center p-3 rounded-2xl bg-white border border-slate-150">
                <div>
                  <span className="block text-xs font-extrabold text-slate-800">Isolated Residential Proxies</span>
                  <span className="block text-[9px] text-slate-400 font-medium">Strictly assigns unique IP per account</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={residentialProxy}
                  onChange={(e) => setResidentialProxy(e.target.checked)}
                  id="checkbox-proxy"
                  className="w-5 h-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* Gating Switch */}
              <div className="flex justify-between items-center p-3 rounded-2xl bg-white border border-slate-150">
                <div>
                  <span className="block text-xs font-extrabold text-slate-800">35s Gated Profile Views</span>
                  <span className="block text-[9px] text-slate-400 font-medium">Enforces mouse click view delay</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={smartGating}
                  onChange={(e) => setSmartGating(e.target.checked)}
                  id="checkbox-gating"
                  className="w-5 h-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                />
              </div>

              {/* AI Switch */}
              <div className="flex justify-between items-center p-3 rounded-2xl bg-white border border-slate-150">
                <div>
                  <span className="block text-xs font-extrabold text-slate-800">NVIDIA NIM AI Personalization</span>
                  <span className="block text-[9px] text-slate-400 font-medium">Avoids repetitive template warnings</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={aiPersonalized}
                  onChange={(e) => setAiPersonalized(e.target.checked)}
                  id="checkbox-ai"
                  className="w-5 h-5 rounded border-slate-350 text-blue-600 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Safety Gauge */}
          <div className="pt-6 border-t border-slate-200/60 mt-6 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Safety Score</span>
              <span className="text-slate-900 font-black text-sm">{safetyScore} / 100</span>
            </div>
            
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
              <div className={`h-full ${status.barColor}`} style={{ width: `${safetyScore}%` }} />
            </div>

            <span className={`block px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase text-center tracking-wider ${status.color}`}>
              {status.text}
            </span>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── UNIFIED INBOX VISUAL ───────────────────────────────────────────────────
function UnifiedInboxVisual() {
  const [messages, setMessages] = useState([
    { name: "Rahul Saxena", msg: "Hey! Yes, I am actively looking for a new tool. Can we connect tomorrow?", time: "2 min ago", type: "hot" },
    { name: "Jessica Lim", msg: "Hi, thanks for reaching out. What is the pricing structure?", time: "15 min ago", type: "warm" },
    { name: "Kunal Shah", msg: "Let's schedule a call this Friday at 4 PM IST to discuss integration.", time: "1 hour ago", type: "hot" },
  ]);

  const [activeChat, setActiveChat] = useState(messages[0]);
  const [suggestions, setSuggestions] = useState([
    "Suggest Calendly link for tomorrow afternoon",
    "Share pitch deck with pricing model details",
    "Request work email and contact information"
  ]);

  return (
    <Section className="py-24 bg-slate-50/50 border-t border-slate-200/60 relative text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
        {/* Left Side: Pitch */}
        <div className="lg:col-span-5 text-left space-y-6">
          <FadeIn>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
              Unified Outreach Inbox
            </span>
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mt-3">
              One Unified Console. Every Conversation.
            </h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed mt-4">
              Stop switching Chrome profiles or logging in and out. Manage incoming B2B leads from all active campaigns inside one interface. Use AI suggestion prompts to respond within seconds.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4 text-left">
              <div className="space-y-1">
                <span className="text-3xl font-black text-slate-900 tracking-tight">85%</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Faster Response Latency</p>
              </div>
              <div className="space-y-1">
                <span className="text-3xl font-black text-indigo-600 tracking-tight">AI Agent</span>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sentiment Analysis</p>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* Right Side: Mock Inbox Interface */}
        <div className="lg:col-span-7 relative">
          <div className="absolute inset-0 bg-blue-600/5 blur-[120px] rounded-full" />
          
          <div className="bg-white border border-slate-200/80 rounded-[40px] shadow-xl shadow-slate-100/50 overflow-hidden text-left flex flex-col md:flex-row min-h-[460px]">
            {/* Conversations list sidebar */}
            <div className="w-full md:w-5/12 border-r border-slate-150 p-4 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 mb-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Inbox (3 Active)</span>
                <span className="text-[8px] bg-slate-200 text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full uppercase">8 Senders</span>
              </div>

              {messages.map((m, idx) => (
                <div 
                  key={idx}
                  id={`inbox-chat-preview-${idx}`}
                  onClick={() => setActiveChat(m)}
                  className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                    activeChat.name === m.name 
                      ? 'border-blue-600 bg-white shadow-sm' 
                      : 'border-transparent hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-800">{m.name}</span>
                    <span className="text-[8px] text-slate-400 font-semibold">{m.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate italic">"{m.msg}"</p>
                  
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[7.5px] font-extrabold uppercase ${
                      m.type === 'hot' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {m.type === 'hot' ? '🔥 Hot Lead' : 'Interested'}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Conversation Window */}
            <div className="w-full md:w-7/12 p-6 flex flex-col justify-between">
              {/* Chat Header */}
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h5 className="text-xs font-extrabold text-slate-900">{activeChat.name}</h5>
                <span className="text-[9px] text-slate-400 block mt-0.5">LinkedIn Chat Sync: Secured Connection</span>
              </div>

              {/* Chat message bubbles */}
              <div className="flex-1 space-y-4 text-xs">
                <div className="bg-slate-50 p-3.5 rounded-2xl rounded-tl-none text-slate-700 border border-slate-100 max-w-[85%]">
                  <p className="font-semibold text-[10px] text-slate-400 uppercase tracking-wide mb-1">Prospect:</p>
                  {activeChat.msg}
                </div>
                
                {/* Simulated AI suggestion box */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50/50 p-4 rounded-2xl border border-indigo-100 mt-4 text-left">
                  <div className="flex items-center gap-1.5 mb-2.5 text-indigo-700 font-bold text-[9px] uppercase tracking-wider">
                    <Sparkles size={12} className="animate-bounce" />
                    <span>Llama-3.1 Suggests Reply:</span>
                  </div>
                  
                  <div className="space-y-2">
                    {suggestions.map((s, i) => (
                      <button 
                        key={i} 
                        id={`inbox-suggestion-btn-${i}`}
                        className="w-full text-left bg-white hover:bg-indigo-100/30 border border-slate-200/60 p-2.5 rounded-xl text-[10.5px] font-bold text-slate-700 transition-colors line-clamp-1 block shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reply message bar */}
              <div className="pt-4 border-t border-slate-150 flex items-center gap-2 mt-4">
                <input 
                  type="text" 
                  placeholder={`Send reply to ${activeChat.name.split(" ")[0]}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
                <button className="bg-slate-900 hover:bg-blue-600 text-white p-2.5 rounded-xl transition-colors">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

// ─── PRICING SECTIONS WITH ANNUAL TOGGLE ───────────────────────────────────
function Pricing() {
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [region, setRegion] = useState('us'); // 'in', 'us'

  const regionalPlans = {
    us: {
      currency: '$',
      plans: [
        {
          name: "Starter Playbook",
          price: 39,
          accountLabel: "1 LinkedIn Account",
          sub: "For sales & B2B teams",
          btn: "Access Console Free",
          features: [
            "1 Connected Sender Profile",
            "25 Daily Connections Cap",
            "Residential Proxy Setup Support",
            "Nvidia NIM Llama-3.1 Base AI",
            "Local SQLite Analytics Sync",
          ],
          pop: false,
        },
        {
          name: "Professional Engine",
          price: 119,
          accountLabel: "3 LinkedIn Accounts",
          sub: "For high-growth agencies",
          btn: "Start 7-Day Free Trial",
          features: [
            "3 Connected Sender Profiles",
            "Warmup schedules week-by-week",
            "100% Gated Profile Views",
            "Automatic IP proxy rotation",
            "Multi-Account Campaign Inbox",
            "Priority Email & Slack Support",
          ],
          pop: true,
        },
        {
          name: "Enterprise Cluster",
          price: 349,
          accountLabel: "10 LinkedIn Accounts",
          sub: "For volume sales agencies",
          btn: "Schedule Architect Demo",
          features: [
            "10 Connected Sender Profiles",
            "Dedicated residential proxy pool",
            "Fully managed AI prompt models",
            "Direct REST API export sync",
            "Custom Playbook automation builder",
            "24/7 SLA uptime guarantee",
          ],
          pop: false,
        }
      ]
    }
  };

  const activeRegion = regionalPlans[region] || regionalPlans.us;
  const currencySymbol = activeRegion.currency;

  const getDisplayPrice = (basePrice) => {
    if (billingCycle === 'yearly') {
      const discounted = Math.round(basePrice * 0.8);
      return `${currencySymbol}${discounted.toLocaleString('en-IN')}`;
    }
    return `${currencySymbol}${basePrice.toLocaleString('en-IN')}`;
  };

  return (
    <Section id="pricing" className="py-28 bg-white border-t border-slate-200/60 text-left">
      <div className="text-center space-y-4 mb-16">
        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Flexible Scale Plans</span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight">Flexible plans for high-growth teams.</h2>
        
        {/* Toggle selectors container */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-6">
          {/* Monthly/Yearly toggle */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setBillingCycle('monthly')}
              id="pricing-billing-monthly-btn"
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all ${
                billingCycle === 'monthly' 
                  ? 'bg-slate-950 text-white shadow-md' 
                  : 'bg-slate-100 text-slate-650 hover:bg-slate-200'
              }`}
            >
              Monthly
            </button>
            
            <button 
              onClick={() => setBillingCycle('yearly')}
              id="pricing-billing-yearly-btn"
              className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly' 
                  ? 'bg-slate-950 text-white shadow-md' 
                  : 'bg-slate-105 text-slate-650 hover:bg-slate-200'
              }`}
            >
              <span>Annually</span>
              <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {activeRegion.plans.map((p, idx) => (
          <FadeIn key={idx} delay={idx * 0.1}>
            <div className={`p-1 rounded-[40px] h-full flex flex-col justify-between ${
              p.pop 
                ? 'bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-2xl shadow-blue-500/20 scale-[1.02]' 
                : 'bg-slate-200/60'
            }`}>
              <div className="bg-white rounded-[36px] p-8 md:p-10 flex flex-col justify-between h-full text-left">
                <div className="space-y-8">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-extrabold text-blue-600 uppercase tracking-wider">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">{p.sub}</p>
                    </div>
                    {p.pop && (
                      <span className="bg-slate-950 text-white text-[8px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                        Most Popular
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-5xl font-black text-slate-950 tracking-tighter">
                      {getDisplayPrice(p.price)}
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      /month <span className="text-blue-600 font-extrabold ml-1">/ {p.accountLabel}</span>
                    </span>
                  </div>

                  <ul className="space-y-4 pt-4 border-t border-slate-100">
                    {p.features.map((f, fIdx) => (
                      <li key={fIdx} className="flex items-center gap-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        <Check size={14} className="text-blue-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link to="/dashboard" className="block mt-12">
                  <button 
                    id={`pricing-card-btn-${idx}`}
                    className={`w-full py-4.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      p.pop 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/10 hover:scale-103' 
                        : 'bg-slate-950 text-white hover:bg-slate-800'
                    }`}
                  >
                    {p.btn}
                  </button>
                </Link>
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </Section>
  );
}

// ─── FAQ ACCORDIONS ────────────────────────────────────────────────────────
const faqsList = [
  {
    q: "How does LRAT ensure my LinkedIn accounts don't get banned?",
    a: "LRAT does three main things to ensure safety: 1) Individual residential proxies are assigned so accounts never share IPs. 2) The system forces a 35s profile scan delay (visiting details page, looking at skills) before sending invitations to mimic human actions. 3) Random action cooldowns (15 to 28 mins) are enforced between outreach tasks, keeping connections strictly under 25 per day."
  },
  {
    q: "What API keys are required for setup?",
    a: "To run LRAT, you need a Unipile API Key & API URL (for LinkedIn message sync and outreach delivery) and an NVIDIA API Key (for sub-second Llama-3.1 prospect fit-scoring and icebreaker drafting). You can input both easily inside the Settings dashboard console."
  },
  {
    q: "Can I use custom templates or only AI personalizations?",
    a: "You have complete control! You can design custom plain text templates, use tags (like [Name], [Company], [Role]), or enable NVIDIA NIM AI parameters inside the Campaign sequence builder. You can also mix both styles."
  },
  {
    q: "How does the webhook system handle prospect replies?",
    a: "Whenever a prospect replies on LinkedIn, Unipile pushes a webhook event (`message.received`) to LRAT. The system automatically shifts the prospect status to 'replied', suspends further automated follow-up messages in that campaign, and marks them as a 'Hot Lead' with alerts on your CRM inbox."
  }
];

function FAQs() {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <Section id="faqs" className="py-24 bg-slate-50/50 border-t border-slate-200/60 text-left">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
        {/* Left pitch */}
        <div className="lg:col-span-5 space-y-4">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Common Enquiries</span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1]">
            Everything you need to know.
          </h2>
          <p className="text-slate-500 font-medium text-sm leading-relaxed">
            Have questions about system proxies, API access, or limits? Here are answers to the most frequently asked questions.
          </p>
        </div>

        {/* Accordions */}
        <div className="lg:col-span-7 space-y-4">
          {faqsList.map((faq, idx) => (
            <div 
              key={idx} 
              className="bg-white border border-slate-200/80 rounded-3xl p-5 md:p-6 transition-all"
            >
              <button 
                onClick={() => setOpenIdx(openIdx === idx ? -1 : idx)}
                id={`faq-accordion-btn-${idx}`}
                className="w-full flex items-center justify-between text-left font-bold text-slate-900 text-xs md:text-sm uppercase tracking-wider"
              >
                <span>{faq.q}</span>
                <ChevronDown 
                  size={16} 
                  className={`text-slate-500 transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} 
                />
              </button>
              
              <AnimatePresence initial={false}>
                {openIdx === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    className="overflow-hidden text-xs md:text-sm leading-relaxed text-slate-500 font-medium border-t border-slate-100 pt-4"
                  >
                    {faq.a}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

// ─── FINAL CTA ──────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <Section className="py-24 bg-white">
      <FadeIn>
        <div className="bg-slate-900 rounded-[50px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-blue-500/20 blur-[130px] rounded-full -z-10" />
          
          <div className="relative z-10 space-y-8 max-w-2xl mx-auto">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Instant Launch</span>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-[1.05] uppercase">
              Ready to automate your B2B outreach pipeline?
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-semibold uppercase tracking-wider">
              Start sourcing leads safely in minutes. Zero upfront credit cards required.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link to="/dashboard" className="w-full sm:w-auto">
                <button 
                  id="final-cta-btn"
                  className="w-full bg-white hover:bg-slate-100 text-slate-900 px-10 py-5 rounded-2xl font-bold uppercase text-[11px] tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  Launch Command Center Free
                </button>
              </Link>
            </div>
          </div>
        </div>
      </FadeIn>
    </Section>
  );
}

// ─── FOOTER ─────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 py-16 relative z-10 text-left">
      <div className="max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg shadow-slate-900/10">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span className="text-lg font-black tracking-tighter text-slate-900 uppercase">LRAT</span>
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider leading-relaxed max-w-sm">
            Architecting high-conversion, proxy-gated LinkedIn outreach workflows. Made for professional growth teams.
          </p>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Core Engine</h4>
          <ul className="space-y-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            <li><a href="#playgrounds" className="hover:text-blue-600 transition-colors">NIM Playground</a></li>
            <li><a href="#ecosystem" className="hover:text-blue-600 transition-colors">Integrations</a></li>
            <li><a href="#pricing" className="hover:text-blue-600 transition-colors">Licensing plans</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">System Security</h4>
          <ul className="space-y-3 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            <li><a href="#security" className="hover:text-blue-600 transition-colors">Safety Gating</a></li>
            <li><a href="#" className="hover:text-blue-600 transition-colors">Proxy configuration</a></li>
            <li><a href="#" className="hover:text-blue-600 transition-colors">Compliance Audit</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 mt-16 pt-8 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">
        <span>© 2026 LRAT AUTOMATION SYSTEMS. ALL RIGHTS RESERVED.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-slate-800 transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-slate-800 transition-colors">Terms of service</a>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN LANDING PAGE COMPONENT ───────────────────────────────────────────
export default function Landing() {
  useEffect(() => { 
    window.scrollTo(0, 0); 
    
    // 1. Dynamically Inject SEO Titles and Meta Descriptions
    document.title = "LRAT — Safe LinkedIn Outreach Automation & B2B AI Tool";
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = "Automate LinkedIn outreach safely with LRAT. Powered by NVIDIA Llama-3.1 NIM AI personalized messages, smart human-mimicking delays, and residential proxy integration. Start converting prospects on autopilot today.";

    // 2. Inject structured schema markup JSON-LD for rich snippets in Google search results
    const schemaId = 'lrat-structured-data';
    let schemaScript = document.getElementById(schemaId);
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = schemaId;
      schemaScript.type = 'application/ld+json';
      schemaScript.innerHTML = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "LRAT",
        "operatingSystem": "All",
        "applicationCategory": "BusinessApplication",
        "offers": {
          "@type": "Offer",
          "price": "49.00",
          "priceCurrency": "USD"
        },
        "description": "Automate LinkedIn outreach safely with Llama-3.1 AI personalizations, residential proxies, and human-like safety gating delays.",
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "4.9",
          "ratingCount": "124"
        }
      });
      document.head.appendChild(schemaScript);
    }

    return () => {
      // Clean up the dynamically added script on unmount
      const existingScript = document.getElementById(schemaId);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);
  
  return (
    <div className="bg-[#fbfcfd] min-h-screen text-slate-900 font-sans selection:bg-blue-600 selection:text-white antialiased overflow-x-hidden">
      <AmbientBackground />
      <Navigation />
      
      <main>
        <Hero />
        <AccountCluster />
        <VisualPlaybookShowcase />
        <StealthTimeline />
        <InteractiveCalculator />
        <UnifiedInboxVisual />
        <Ecosystem />
        <Pricing />
        <FAQs />
        <FinalCTA />
      </main>
      
      <Footer />

      {/* Styled inject to use Plus Jakarta Sans & Outfit for premium font scaling */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Outfit:wght@500;700;800;900&display=swap');
        
        body { 
          font-family: 'Plus Jakarta Sans', sans-serif; 
          scroll-behavior: smooth; 
        }
        
        h1, h2, h3, h4, h5, h6 {
          font-family: 'Outfit', sans-serif;
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee { 
          animation: marquee 30s linear infinite; 
        }
      `}} />
    </div>
  );
}
