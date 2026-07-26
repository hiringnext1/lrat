import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Zap, Shield, Target, Users, ArrowRight, MessageSquare,
  Bot, Globe, CheckCircle2, TrendingUp, Sparkles,
  Terminal, Cpu, Database, Activity, Lock, Clock, Check,
  Search, Mail, ShieldCheck, BarChart3, Layers,
  Share2, Network, Filter, ChevronDown, CheckCircle,
  RefreshCw, Send, AlertTriangle, Key, Play, Inbox,
  LineChart, Building2, Briefcase, Star, Quote,
  MousePointer, Rocket, Timer, Gauge, CalendarCheck,
  PhoneCall, PieChart, Megaphone, UserCheck, Flame
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── ANIMATION HELPERS ──────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0, y = 40, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

const FadeInLeft = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -50 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

const FadeInRight = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: 50 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    {children}
  </motion.div>
);

// ─── ANIMATED COUNTER ──────────────────────────────────────────────────────
function AnimatedCounter({ end, suffix = "", prefix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let startTime;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// ─── DARK BACKGROUND ──────────────────────────────────────────────────────
function DarkBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-[#080C18]" />
      {/* Radial grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(59,130,246,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.8) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
      {/* Glowing orbs */}
      <div className="absolute top-[-5%] left-[-10%] w-[55vw] h-[55vw] bg-blue-600/10 blur-[160px] rounded-full" />
      <div className="absolute top-[30%] right-[-15%] w-[45vw] h-[45vw] bg-purple-600/8 blur-[140px] rounded-full" />
      <div className="absolute bottom-[10%] left-[20%] w-[35vw] h-[35vw] bg-indigo-500/6 blur-[120px] rounded-full" />
    </div>
  );
}

// ─── NAVIGATION ────────────────────────────────────────────────────────────
function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'ROI Calculator', href: '#roi-calculator' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faqs' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${scrolled ? 'py-3' : 'py-5'}`}>
      <div className={`max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between rounded-2xl border transition-all duration-500 mx-4 ${
        scrolled
          ? 'bg-[#0D1221]/90 backdrop-blur-xl border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.4)]'
          : 'bg-transparent border-transparent'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <span className="text-lg font-black tracking-tight text-white uppercase">LRAT</span>
          <span className="hidden sm:block text-[9px] font-bold text-blue-400 border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">B2B Lead Gen</span>
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(link => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link to="/login" className="hidden sm:block">
            <button className="text-slate-400 hover:text-white text-xs font-semibold px-4 py-2 transition-colors">
              Sign In
            </button>
          </Link>
          <Link to="/signup">
            <button
              id="nav-cta-btn"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/25 transition-all hover:scale-105 active:scale-95"
            >
              Start Free →
            </button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── HERO SECTION ──────────────────────────────────────────────────────────
function Hero() {
  const stats = [
    { value: 500, suffix: "+", label: "B2B Teams Active" },
    { value: 3, suffix: "x", prefix: "", label: "More Replies vs Manual" },
    { value: 40, suffix: "hrs", label: "Saved Per Month" },
    { value: 98, suffix: "%", label: "Account Safety Rate" },
  ];

  const liveFeeds = [
    { icon: "🔗", text: "New connection accepted — Arjun Mehta, VP Sales @ Freshworks", delay: 0 },
    { icon: "💬", text: "Reply received — 'Would love to explore this further!'", delay: 3000 },
    { icon: "🔥", text: "Hot lead flagged — Priya Shah, Head of Growth @ Razorpay", delay: 6000 },
    { icon: "📨", text: "Follow-up sent automatically — Day 3 sequence triggered", delay: 9000 },
    { icon: "✅", text: "Meeting booked — Vikram Nair, CEO @ Series-A startup", delay: 12000 },
  ];

  const [feedItems, setFeedItems] = useState([liveFeeds[0]]);

  useEffect(() => {
    let idx = 1;
    const interval = setInterval(() => {
      setFeedItems(prev => [...prev.slice(-3), liveFeeds[idx % liveFeeds.length]]);
      idx++;
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hero" className="relative z-10 pt-32 pb-20 px-6 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

          {/* Left: Copy */}
          <div className="lg:col-span-6 text-left space-y-8">
            <FadeIn delay={0}>
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                #1 B2B LinkedIn Lead Generation Platform
              </div>

              {/* Headline */}
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.0] tracking-tight mt-6">
                Turn LinkedIn Into Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                  B2B Pipeline
                </span>{' '}
                Machine.
              </h1>

              {/* Subheadline */}
              <p className="text-lg text-slate-400 leading-relaxed mt-6 max-w-lg">
                Automate outreach across 10+ LinkedIn accounts. AI-personalized messages, anti-ban safety, unified inbox — everything your sales team needs to book more meetings, faster.
              </p>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-4 mt-4">
                {['No credit card required', 'Setup in 10 minutes', '98% Account Safety'].map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                    <Check size={14} className="text-emerald-400" />
                    {t}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Link to="/signup">
                  <button
                    id="hero-primary-cta"
                    className="w-full sm:w-auto group bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Start Generating Leads Free
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <a href="#how-it-works">
                  <button
                    id="hero-secondary-cta"
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/15 text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                  >
                    <Play size={14} className="text-blue-400 fill-blue-400" />
                    Watch 2-min Demo
                  </button>
                </a>
              </div>
            </FadeIn>
          </div>

          {/* Right: Live Activity Dashboard */}
          <div className="lg:col-span-6 relative">
            <FadeIn delay={0.2}>
              {/* Glow */}
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-purple-500/10 blur-[80px] rounded-3xl" />

              <div className="relative bg-[#0D1526]/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live Campaign Dashboard</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Running: 3 campaigns</span>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Connections Sent Today", value: "127", change: "+23%", color: "text-blue-400" },
                    { label: "Replies Received", value: "41", change: "+31%", color: "text-emerald-400" },
                    { label: "Hot Leads", value: "12", change: "🔥 Active", color: "text-orange-400" },
                    { label: "Meetings Booked", value: "4", change: "This week", color: "text-purple-400" },
                  ].map((m, i) => (
                    <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-4">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{m.label}</p>
                      <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                      <p className="text-[10px] text-slate-500 mt-1">{m.change}</p>
                    </div>
                  ))}
                </div>

                {/* Live Feed */}
                <div className="bg-black/30 rounded-2xl p-4 space-y-2 min-h-[130px]">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">⚡ Live Activity Feed</p>
                  <AnimatePresence mode="popLayout">
                    {feedItems.slice(-3).map((item, i) => (
                      <motion.div
                        key={`${item.text}-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="flex items-start gap-2 text-[11px] text-slate-300 font-medium"
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.text}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Bottom accounts */}
                <div className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {['RK', 'PS', 'VM', 'AS', 'JL'].map((a, i) => (
                      <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-[#0D1526] flex items-center justify-center text-[8px] font-black text-white">
                        {a}
                      </div>
                    ))}
                    <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-[#0D1526] flex items-center justify-center text-[8px] font-bold text-slate-400">
                      +5
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-semibold">10 accounts running</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-emerald-400 font-bold">All Safe</span>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Stats Bar */}
        <FadeIn delay={0.4}>
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-px bg-white/8 rounded-2xl overflow-hidden border border-white/8">
            {stats.map((stat, i) => (
              <div key={i} className="bg-[#0D1526]/60 backdrop-blur-sm px-8 py-6 text-center">
                <p className="text-3xl md:text-4xl font-black text-white">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} prefix={stat.prefix || ""} />
                </p>
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── SOCIAL PROOF LOGOS ─────────────────────────────────────────────────────
function SocialProof() {
  const companies = [
    "Razorpay", "Freshworks", "Zoho", "Chargebee", "LeadSquared",
    "BrowserStack", "Unacademy", "Cred", "Clevertap", "Postman",
    "Razorpay", "Freshworks", "Zoho", "Chargebee", "LeadSquared",
  ];

  return (
    <section className="relative z-10 py-16 border-y border-white/8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
          Trusted by 500+ B2B Sales Teams & Agencies
        </p>
      </div>
      <div className="flex overflow-x-hidden">
        <motion.div
          animate={{ x: [0, -50 + "%"] }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="flex gap-8 whitespace-nowrap"
        >
          {companies.concat(companies).map((company, i) => (
            <div
              key={i}
              className="bg-white/5 border border-white/8 px-6 py-3 rounded-xl flex items-center gap-2.5 shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-bold text-slate-300">{company}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── PAIN → SOLUTION ────────────────────────────────────────────────────────
function PainSolution() {
  const pains = [
    {
      icon: Clock,
      pain: "Manual LinkedIn outreach eats 40+ hours/month",
      solution: "Full automation handles prospecting, outreach & follow-ups while you focus on closing.",
      color: "from-red-500/20 to-orange-500/10",
      border: "border-red-500/20",
      solutionColor: "text-emerald-400",
    },
    {
      icon: AlertTriangle,
      pain: "Automation tools get your accounts banned",
      solution: "Human-mimicking delays, residential proxies & warmup sequences keep accounts 98% safe.",
      color: "from-orange-500/20 to-yellow-500/10",
      border: "border-orange-500/20",
      solutionColor: "text-emerald-400",
    },
    {
      icon: MessageSquare,
      pain: "Generic templates get ignored & ghosted",
      solution: "Claude AI writes hyper-personalized messages based on each prospect's profile in <1 second.",
      color: "from-yellow-500/20 to-amber-500/10",
      border: "border-yellow-500/20",
      solutionColor: "text-emerald-400",
    },
  ];

  return (
    <section id="pain-solution" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Why LRAT?</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight leading-[1.1]">
              Your LinkedIn outreach is{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">broken.</span>
              <br />We fix it.
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pains.map((item, i) => {
            const Icon = item.icon;
            return (
              <FadeIn key={i} delay={i * 0.15}>
                <div className={`relative bg-gradient-to-br ${item.color} border ${item.border} rounded-3xl p-8 h-full`}>
                  <div className="bg-red-500/15 w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border border-red-500/20">
                    <Icon size={20} className="text-red-400" />
                  </div>

                  {/* Pain */}
                  <div className="mb-6">
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-2">❌ The Problem</span>
                    <p className="text-base font-bold text-white leading-snug">{item.pain}</p>
                  </div>

                  <div className="h-px bg-white/10 mb-6" />

                  {/* Solution */}
                  <div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-2">✅ LRAT Solves This</span>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{item.solution}</p>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── FEATURES SHOWCASE ──────────────────────────────────────────────────────
function Features() {
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      id: 'multi-account',
      icon: Users,
      label: 'Multi-Account Management',
      badge: 'Up to 20 accounts',
      title: 'Run 10-20 LinkedIn accounts from one dashboard.',
      desc: 'Assign unique residential proxies, isolated browser fingerprints, and warmup schedules to each account. Full duplication guard ensures two senders never contact the same prospect.',
      points: ['Unique proxy per account', 'Auto warmup schedules', 'Global duplication guard', 'Stealth browser isolation'],
      visual: <MultiAccountVisual />,
    },
    {
      id: 'ai-outreach',
      icon: Cpu,
      label: 'AI-Personalized Outreach',
      badge: 'Claude AI Powered',
      title: 'Messages so personal, prospects think you wrote them.',
      desc: 'LRAT uses Claude AI to analyze each prospect\'s LinkedIn profile — their role, skills, company, and interests — and writes a hyper-targeted connection note in under 1 second.',
      points: ['Profile scraping & scoring', 'Sub-1s AI generation', 'Custom tone & templates', '3x higher reply rates'],
      visual: <AIOutreachVisual />,
    },
    {
      id: 'campaigns',
      icon: Target,
      label: 'Campaign Automation',
      badge: 'Full sequence builder',
      title: 'Set it. Forget it. Watch meetings roll in.',
      desc: 'Build multi-step campaign sequences: connect → accept → send JD → follow-up day 3 → follow-up day 6. Each step is automated with human-like delays and safety gating.',
      points: ['Visual sequence builder', 'Smart follow-up triggers', 'Acceptance detection', 'Per-campaign analytics'],
      visual: <CampaignVisual />,
    },
    {
      id: 'inbox',
      icon: Inbox,
      label: 'Unified Inbox',
      badge: 'All accounts, one view',
      title: 'Every reply. Every account. One place.',
      desc: 'Stop juggling Chrome profiles. All replies from all LinkedIn accounts land in one inbox. AI suggests the perfect response. One-click reply across all accounts.',
      points: ['All accounts unified', 'AI reply suggestions', 'Hot lead detection', 'Instant reply alerts'],
      visual: <InboxVisual />,
    },
    {
      id: 'safety',
      icon: Shield,
      label: 'Anti-Ban Safety System',
      badge: '98% safety rate',
      title: 'Built-in protection that LinkedIn can\'t detect.',
      desc: 'Every action mimics human behavior: 35-second profile views, randomized cooldown timers, daily limits, and warmup ramps. LRAT keeps your accounts safe, always.',
      points: ['35s profile view gating', '15-28 min cooldowns', 'Daily cap enforcement', 'Warmup ramp schedules'],
      visual: <SafetyVisual />,
    },
    {
      id: 'analytics',
      icon: BarChart3,
      label: 'Analytics & Reporting',
      badge: 'Full pipeline visibility',
      title: 'Know exactly what\'s working. At all times.',
      desc: 'Track connection rates, reply rates, follow-up conversion, and account health in real-time. Export reports for your clients or leadership team in one click.',
      points: ['Real-time dashboards', 'Per-account metrics', 'Campaign performance', 'Export CSV reports'],
      visual: <AnalyticsVisual />,
    },
  ];

  const active = features[activeFeature];

  return (
    <section id="features" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Platform Features</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight leading-[1.1]">
              Everything you need to dominate{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">LinkedIn outreach.</span>
            </h2>
          </div>
        </FadeIn>

        {/* Feature Tabs */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <button
                key={f.id}
                id={`feature-tab-${f.id}`}
                onClick={() => setActiveFeature(i)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                  activeFeature === i
                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/8'
                }`}
              >
                <Icon size={13} />
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Feature Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeFeature}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center"
          >
            {/* Left: Text */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-wider">
                <active.icon size={11} />
                {active.badge}
              </div>

              <h3 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
                {active.title}
              </h3>

              <p className="text-slate-400 text-sm leading-relaxed font-medium">
                {active.desc}
              </p>

              <ul className="space-y-3">
                {active.points.map((pt, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                      <Check size={11} className="text-blue-400" />
                    </div>
                    {pt}
                  </li>
                ))}
              </ul>

              <Link to="/signup">
                <button className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group">
                  Try {active.label}
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>

            {/* Right: Visual */}
            <div className="lg:col-span-7 relative">
              <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-3xl" />
              <div className="relative bg-[#0D1526]/70 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl min-h-[380px] flex items-center justify-center">
                {active.visual}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

// ─── FEATURE VISUALS ────────────────────────────────────────────────────────
function MultiAccountVisual() {
  const accounts = [
    { name: "Rohit Sharma", role: "Sales Dev Rep", proxy: "Mumbai.res.proxy", status: "Active", progress: 65, color: "bg-emerald-500" },
    { name: "Priya Singh", role: "Director, BD", proxy: "Delhi.res.proxy", status: "Cooldown", progress: 40, color: "bg-blue-500" },
    { name: "Amit Kumar", role: "Growth Lead", proxy: "Bangalore.res.proxy", status: "Warmup", progress: 20, color: "bg-amber-500" },
  ];
  return (
    <div className="w-full space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Network size={12} className="text-blue-400" /> Active Account Cluster
      </p>
      {accounts.map((acc, i) => (
        <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${acc.color} ${acc.status === 'Active' ? 'animate-pulse' : ''}`} />
            <div>
              <p className="text-xs font-bold text-white">{acc.name}</p>
              <p className="text-[10px] text-slate-500 font-medium">{acc.proxy}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-20">
              <div className="flex justify-between text-[8px] text-slate-500 mb-1 font-bold">
                <span>DAILY</span><span>{Math.round(acc.progress * 0.25)}/25</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${acc.color}`} style={{ width: `${acc.progress}%` }} />
              </div>
            </div>
            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
              acc.status === 'Active' ? 'bg-emerald-500/15 text-emerald-400' :
              acc.status === 'Cooldown' ? 'bg-blue-500/15 text-blue-400' :
              'bg-amber-500/15 text-amber-400'
            }`}>{acc.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function AIOutreachVisual() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % 4), 1500);
    return () => clearInterval(t);
  }, []);
  const steps = [
    { label: "Scraping LinkedIn Profile...", color: "text-blue-400", done: step >= 1 },
    { label: "Analyzing role & interests...", color: "text-indigo-400", done: step >= 2 },
    { label: "Claude AI generating message...", color: "text-purple-400", done: step >= 3 },
    { label: "Personalized note ready ✓", color: "text-emerald-400", done: step >= 3 },
  ];
  return (
    <div className="w-full">
      <div className="bg-black/40 rounded-2xl p-5 font-mono text-sm mb-4">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 py-1.5 text-[11px] transition-all ${i <= step ? s.color : 'text-slate-600'}`}>
            {i < step ? <Check size={12} /> : i === step ? <RefreshCw size={12} className="animate-spin" /> : <span className="w-3" />}
            {s.label}
          </div>
        ))}
      </div>
      {step >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4"
        >
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider mb-2">✨ AI Generated Message:</p>
          <p className="text-xs text-slate-300 italic leading-relaxed">
            "Hey Arjun! Loved your transition from Flipkart to leading growth at Freshworks. Your focus on enterprise partnerships caught my eye — we've built something that's helped teams like yours 3x their outbound pipeline. Would love to connect?"
          </p>
        </motion.div>
      )}
    </div>
  );
}

function CampaignVisual() {
  const steps = [
    { label: "1. Import ICP Leads", icon: Search, color: "blue", time: "Day 0" },
    { label: "2. Send Connection", icon: Send, color: "indigo", time: "Day 0" },
    { label: "3. Accept → Send JD", icon: CheckCircle, color: "emerald", time: "On Accept" },
    { label: "4. Follow-up #1", icon: MessageSquare, color: "purple", time: "Day 3" },
    { label: "5. Follow-up #2", icon: Megaphone, color: "orange", time: "Day 6" },
  ];
  return (
    <div className="w-full">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">Campaign Sequence Flow</p>
      <div className="relative pl-4 border-l border-white/10 space-y-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4 relative"
            >
              <div className={`absolute -left-[21px] w-3 h-3 rounded-full bg-${s.color}-500 border-2 border-[#0D1526]`} />
              <div className={`w-8 h-8 rounded-xl bg-${s.color}-500/15 border border-${s.color}-500/25 flex items-center justify-center`}>
                <Icon size={14} className={`text-${s.color}-400`} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-white">{s.label}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/8">{s.time}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function InboxVisual() {
  const convs = [
    { name: "Arjun M.", msg: "Yes, would love to explore this!", tag: "🔥 Hot", tagColor: "text-orange-400 bg-orange-500/10" },
    { name: "Priya S.", msg: "What's the pricing structure?", tag: "💬 Warm", tagColor: "text-blue-400 bg-blue-500/10" },
    { name: "Vikram N.", msg: "Let's schedule a call Friday!", tag: "🔥 Hot", tagColor: "text-orange-400 bg-orange-500/10" },
  ];
  const [active, setActive] = useState(0);
  return (
    <div className="w-full flex gap-4 h-[300px]">
      <div className="w-2/5 space-y-2">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Inbox (3 Active)</p>
        {convs.map((c, i) => (
          <button key={i} onClick={() => setActive(i)} className={`w-full text-left p-3 rounded-xl border transition-all ${active === i ? 'border-blue-500/40 bg-blue-500/8' : 'border-white/8 hover:bg-white/5'}`}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-white">{c.name}</p>
              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${c.tagColor}`}>{c.tag}</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">{c.msg}</p>
          </button>
        ))}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 bg-white/5 rounded-xl p-3 mb-2">
          <p className="text-[10px] text-slate-500 mb-2">From: {convs[active].name}</p>
          <p className="text-xs text-slate-300 italic">"{convs[active].msg}"</p>
          <div className="mt-3 p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <p className="text-[9px] font-black text-purple-400 mb-1">✨ AI Suggestion:</p>
            <p className="text-[10px] text-slate-400">Share Calendly link + deck</p>
          </div>
        </div>
        <div className="flex gap-2">
          <input className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none" placeholder="Type reply..." />
          <button className="bg-blue-600 p-2 rounded-lg"><Send size={13} className="text-white" /></button>
        </div>
      </div>
    </div>
  );
}

function SafetyVisual() {
  return (
    <div className="w-full space-y-4">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <Shield size={12} className="text-emerald-400" /> Safety Score: 98/100 — Stealth Safe
      </p>
      {[
        { label: "35s Profile View Gating", status: "Active", color: "emerald" },
        { label: "Residential Proxy Isolation", status: "Enabled", color: "emerald" },
        { label: "Action Cooldown Timers", status: "15-28 min", color: "blue" },
        { label: "Warmup Schedule Ramp", status: "Week 3/8", color: "indigo" },
        { label: "Daily Connection Cap", status: "25 max", color: "emerald" },
        { label: "Global Duplication Guard", status: "Protected", color: "purple" },
      ].map((s, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/8 rounded-xl">
          <p className="text-xs font-semibold text-slate-300">{s.label}</p>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full bg-${s.color}-500/15 text-${s.color}-400 border border-${s.color}-500/20`}>{s.status}</span>
        </div>
      ))}
    </div>
  );
}

function AnalyticsVisual() {
  const bars = [65, 82, 74, 91, 88, 95, 79];
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return (
    <div className="w-full space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Connection Rate", value: "68%", trend: "+12%" },
          { label: "Reply Rate", value: "32%", trend: "+8%" },
          { label: "Meeting Rate", value: "11%", trend: "+5%" },
        ].map((m, i) => (
          <div key={i} className="bg-white/5 border border-white/8 rounded-2xl p-3 text-center">
            <p className="text-lg font-black text-white">{m.value}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider">{m.label}</p>
            <p className="text-[9px] text-emerald-400 font-bold mt-1">{m.trend}</p>
          </div>
        ))}
      </div>
      <div className="bg-white/5 border border-white/8 rounded-2xl p-4">
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Weekly Connections Sent</p>
        <div className="flex items-end gap-2 h-20">
          {bars.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="w-full bg-gradient-to-t from-blue-600 to-indigo-500 rounded-sm"
                style={{ height: `${h}%` }}
              />
              <span className="text-[8px] text-slate-600 font-medium">{days[i]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── HOW IT WORKS ────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      number: "01",
      icon: Search,
      title: "Import Your ICP Leads",
      desc: "Upload a CSV or paste a LinkedIn search URL. LRAT automatically extracts names, companies, roles and filters duplicates across all your accounts.",
      time: "< 2 minutes",
      color: "blue",
    },
    {
      number: "02",
      icon: Rocket,
      title: "Launch AI-Powered Campaigns",
      desc: "Set your campaign sequence. Claude AI personalizes every message. Safety protocols ensure human-like behavior on every action — zero risk of bans.",
      time: "10 min setup",
      color: "indigo",
    },
    {
      number: "03",
      icon: CalendarCheck,
      title: "Close Deals from Your Inbox",
      desc: "All replies land in your unified inbox. Hot leads are flagged automatically. AI suggests the perfect follow-up. Book meetings without switching tabs.",
      time: "Ongoing autopilot",
      color: "purple",
    },
  ];

  return (
    <section id="how-it-works" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-20">
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">How LRAT Works</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight leading-[1.1]">
              From zero to booked meetings{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">in 3 simple steps.</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-blue-600/0 via-blue-600/40 to-purple-600/0 hidden md:block" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <FadeIn key={i} delay={i * 0.2}>
                <div className="relative bg-[#0D1526]/60 border border-white/10 rounded-3xl p-8 hover:border-blue-500/30 transition-all group hover:shadow-xl hover:shadow-blue-500/5 text-left">
                  {/* Step Number */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-5xl font-black text-white/8 group-hover:text-white/15 transition-colors leading-none">
                      {step.number}
                    </span>
                    <div className={`w-12 h-12 rounded-2xl bg-${step.color}-500/15 border border-${step.color}-500/25 flex items-center justify-center group-hover:bg-${step.color}-500/25 transition-colors`}>
                      <Icon size={22} className={`text-${step.color}-400`} />
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-white mb-3 leading-tight">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed font-medium mb-6">{step.desc}</p>

                  <div className="flex items-center gap-2">
                    <Timer size={12} className="text-blue-400" />
                    <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider">{step.time}</span>
                  </div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── ROI CALCULATOR ──────────────────────────────────────────────────────────
function ROICalculator() {
  const [accounts, setAccounts] = useState(5);
  const [dailyInvites, setDailyInvites] = useState(15);
  const [avgDealSize, setAvgDealSize] = useState(5000);

  const monthlyOutreach = accounts * dailyInvites * 20;
  const connectionRate = 0.35;
  const replyRate = 0.32;
  const meetingRate = 0.15;

  const connections = Math.round(monthlyOutreach * connectionRate);
  const replies = Math.round(monthlyOutreach * replyRate);
  const meetings = Math.round(monthlyOutreach * meetingRate);
  const pipeline = meetings * avgDealSize;
  const hoursSaved = Math.round((monthlyOutreach * 4.5) / 60);

  return (
    <section id="roi-calculator" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">ROI Calculator</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight leading-[1.1]">
              Calculate your pipeline potential.
            </h2>
            <p className="text-slate-400 mt-4 text-sm font-medium">
              Adjust the sliders to see how LRAT impacts your B2B sales numbers.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Inputs */}
          <FadeInLeft>
            <div className="bg-[#0D1526]/70 border border-white/10 rounded-3xl p-8 space-y-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Your Outreach Setup</h3>

              {[
                { label: "LinkedIn Accounts", value: accounts, setter: setAccounts, min: 1, max: 20, suffix: " accounts", id: "roi-accounts" },
                { label: "Daily Invites per Account", value: dailyInvites, setter: setDailyInvites, min: 5, max: 25, suffix: " invites/day", id: "roi-invites" },
                { label: "Average Deal Size", value: avgDealSize, setter: setAvgDealSize, min: 1000, max: 50000, step: 1000, suffix: " USD", id: "roi-deal-size" },
              ].map((slider) => (
                <div key={slider.id} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">{slider.label}</label>
                    <span className="text-sm font-black text-blue-400">
                      {slider.id === 'roi-deal-size' ? `$${slider.value.toLocaleString()}` : slider.value}{slider.id !== 'roi-deal-size' ? slider.suffix : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    id={slider.id}
                    min={slider.min}
                    max={slider.max}
                    step={slider.step || 1}
                    value={slider.value}
                    onChange={e => slider.setter(Number(e.target.value))}
                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] text-slate-600 font-bold">
                    <span>{slider.min}{slider.id === 'roi-deal-size' ? ' USD' : ''}</span>
                    <span>{slider.max}{slider.id === 'roi-deal-size' ? ' USD' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </FadeInLeft>

          {/* Results */}
          <FadeInRight>
            <div className="space-y-4">
              {/* Monthly Outreach */}
              <div className="bg-gradient-to-br from-blue-600/15 to-indigo-600/10 border border-blue-500/20 rounded-3xl p-6">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Monthly Outreach Volume</p>
                <p className="text-5xl font-black text-white">{monthlyOutreach.toLocaleString()}</p>
                <p className="text-slate-400 text-xs mt-1">connection requests per month</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Connections Made", value: connections.toLocaleString(), color: "blue" },
                  { label: "Warm Replies", value: replies.toLocaleString(), color: "indigo" },
                  { label: "Meetings Booked", value: meetings.toLocaleString(), color: "purple" },
                  { label: "Hours Saved", value: `${hoursSaved}h`, color: "emerald" },
                ].map((m, i) => (
                  <div key={i} className={`bg-${m.color}-500/10 border border-${m.color}-500/20 rounded-2xl p-5`}>
                    <p className={`text-2xl font-black text-${m.color}-400`}>{m.value}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Pipeline */}
              <div className="bg-gradient-to-br from-emerald-600/15 to-green-600/10 border border-emerald-500/25 rounded-3xl p-6">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">💰 Monthly Pipeline Generated</p>
                <p className="text-4xl font-black text-white">${pipeline.toLocaleString()}</p>
                <p className="text-slate-400 text-xs mt-1">Based on {meetings} meetings × ${avgDealSize.toLocaleString()} avg deal</p>
              </div>
            </div>
          </FadeInRight>
        </div>
      </div>
    </section>
  );
}

// ─── TESTIMONIALS ────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    {
      name: "Rahul Verma",
      role: "Head of Sales, Series-B SaaS",
      company: "TechFlow India",
      avatar: "RV",
      quote: "LRAT completely transformed our outbound. We went from 20 manual messages a day to 500+ automated ones across 10 accounts — with a 3x higher reply rate. Closed 8 deals in first month.",
      metrics: { value: "3x", label: "Reply Rate Increase" },
      color: "blue",
    },
    {
      name: "Priya Krishnaswamy",
      role: "Founder, B2B Lead Gen Agency",
      company: "GrowthLabs",
      avatar: "PK",
      quote: "My clients pay ₹2L/month for LinkedIn outreach services. LRAT automates 80% of the work. The anti-ban system is bulletproof — not a single account restricted in 6 months.",
      metrics: { value: "₹2L", label: "Monthly Client Revenue" },
      color: "indigo",
    },
    {
      name: "Arjun Malhotra",
      role: "VP Business Development",
      company: "Enterprise Ventures",
      avatar: "AM",
      quote: "The unified inbox is a game-changer. I manage 15 LinkedIn accounts from one screen. AI reply suggestions save me 2 hours a day. ROI within the first week.",
      metrics: { value: "15", label: "Accounts Managed" },
      color: "purple",
    },
  ];

  return (
    <section id="testimonials" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Customer Stories</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight leading-[1.1]">
              Real results from real{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">B2B teams.</span>
            </h2>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <FadeIn key={i} delay={i * 0.15}>
              <div className={`bg-[#0D1526]/60 border border-white/10 rounded-3xl p-8 hover:border-${t.color}-500/30 transition-all group h-full flex flex-col justify-between`}>
                <div>
                  {/* Stars */}
                  <div className="flex gap-1 mb-5">
                    {[...Array(5)].map((_, si) => (
                      <Star key={si} size={14} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>

                  {/* Quote */}
                  <Quote size={24} className={`text-${t.color}-500/40 mb-3`} />
                  <p className="text-sm text-slate-300 leading-relaxed font-medium italic mb-6">
                    "{t.quote}"
                  </p>
                </div>

                <div>
                  {/* Metric highlight */}
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-${t.color}-500/10 border border-${t.color}-500/20 mb-5`}>
                    <span className={`text-2xl font-black text-${t.color}-400`}>{t.metrics.value}</span>
                    <span className="text-xs text-slate-400 font-semibold">{t.metrics.label}</span>
                  </div>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-5 border-t border-white/8">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-${t.color}-500 to-${t.color}-700 flex items-center justify-center text-xs font-black text-white`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{t.name}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{t.role} · {t.company}</p>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── PRICING ─────────────────────────────────────────────────────────────────
function Pricing() {
  const [billing, setBilling] = useState('monthly');

  const plans = [
    {
      name: "Starter",
      price: { monthly: 39, yearly: 31 },
      desc: "Perfect for solo salespeople & SDRs",
      accounts: "1 LinkedIn Account",
      btn: "Start Free Trial",
      pop: false,
      features: [
        "1 Connected LinkedIn Account",
        "25 Daily Connection Cap",
        "AI-Personalized Messages (Claude)",
        "Campaign Sequence Builder",
        "Basic Analytics Dashboard",
        "Email Support",
      ],
    },
    {
      name: "Professional",
      price: { monthly: 119, yearly: 95 },
      desc: "For growing sales teams & agencies",
      accounts: "3 LinkedIn Accounts",
      btn: "Start 7-Day Free Trial",
      pop: true,
      features: [
        "3 Connected LinkedIn Accounts",
        "Warmup Schedules (auto-enforced)",
        "35s Human Profile View Gating",
        "Residential Proxy Integration",
        "Unified Multi-Account Inbox",
        "Hot Lead Detection & Alerts",
        "AI Reply Suggestions",
        "Priority Slack Support",
      ],
    },
    {
      name: "Enterprise",
      price: { monthly: 349, yearly: 279 },
      desc: "For high-volume agencies & enterprises",
      accounts: "10+ LinkedIn Accounts",
      btn: "Book Demo Call",
      pop: false,
      features: [
        "10+ Connected LinkedIn Accounts",
        "Dedicated Residential Proxy Pool",
        "Custom AI Prompt Models",
        "REST API Access & Webhooks",
        "White-label Ready",
        "Custom Campaign Automation",
        "Advanced Analytics & Reports",
        "24/7 SLA Support",
      ],
    },
  ];

  return (
    <section id="pricing" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <FadeIn>
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Pricing Plans</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 tracking-tight leading-[1.1]">
              Simple pricing.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Massive ROI.</span>
            </h2>
            <p className="text-slate-400 mt-4 text-sm font-medium">
              Start free. Upgrade when you're ready. Cancel anytime.
            </p>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                id="pricing-monthly-btn"
                onClick={() => setBilling('monthly')}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${billing === 'monthly' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button
                id="pricing-yearly-btn"
                onClick={() => setBilling('yearly')}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${billing === 'yearly' ? 'bg-blue-600 text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
              >
                Annual
                <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full">Save 20%</span>
              </button>
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {plans.map((plan, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className={`relative rounded-3xl h-full flex flex-col ${plan.pop ? 'p-px bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-600' : ''}`}>
                <div className={`${plan.pop ? 'bg-[#0A0F1E] rounded-3xl' : 'bg-[#0D1526]/60 border border-white/10 rounded-3xl'} p-8 h-full flex flex-col`}>
                  {plan.pop && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-sm font-black text-blue-400 uppercase tracking-wider">{plan.name}</h3>
                    <p className="text-[11px] text-slate-500 font-semibold mt-1">{plan.desc}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-white">${billing === 'monthly' ? plan.price.monthly : plan.price.yearly}</span>
                      <span className="text-slate-400 text-sm font-medium">/mo</span>
                    </div>
                    <p className="text-[11px] text-blue-400 font-bold mt-1">{plan.accounts}</p>
                    {billing === 'yearly' && (
                      <p className="text-[10px] text-emerald-400 font-bold mt-1">Save ${(plan.price.monthly - plan.price.yearly) * 12}/year</p>
                    )}
                  </div>

                  <ul className="space-y-3 flex-1 mb-8">
                    {plan.features.map((f, fi) => (
                      <li key={fi} className="flex items-start gap-3 text-xs font-medium text-slate-300">
                        <Check size={14} className="text-blue-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link to="/signup" className="block">
                    <button
                      id={`pricing-btn-${i}`}
                      className={`w-full py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        plan.pop
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 hover:scale-105'
                          : 'bg-white/8 hover:bg-white/12 border border-white/12 text-white hover:border-blue-500/30'
                      }`}
                    >
                      {plan.btn}
                    </button>
                  </Link>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Money-back guarantee */}
        <FadeIn delay={0.3}>
          <div className="mt-10 text-center flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold">
            <Shield size={14} className="text-emerald-400" />
            30-day money-back guarantee · No contracts · Cancel anytime
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────
function FAQs() {
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    {
      q: "Will my LinkedIn accounts get banned using LRAT?",
      a: "LRAT is engineered from the ground up with account safety as the #1 priority. Every action uses human-mimicking delays (35-second profile views, 15-28 minute cooldowns between invites), residential proxies per account, warmup schedules for new accounts, and a hard 25 connections/day cap. Our customers report a 98%+ account safety rate over 6+ months of use.",
    },
    {
      q: "How does the AI personalization work?",
      a: "LRAT uses Claude AI (Anthropic) to analyze each prospect's LinkedIn profile — their current role, previous companies, skills, and interests. It then writes a hyper-targeted connection message tailored to each individual in under 1 second. Messages are so personalized that prospects rarely suspect automation.",
    },
    {
      q: "How many LinkedIn accounts can I manage?",
      a: "Our Starter plan supports 1 account, Professional supports 3, and Enterprise supports 10+ accounts. Each account gets its own dedicated residential proxy, isolated browser fingerprint, and independent warmup schedule to prevent any cross-account linkage.",
    },
    {
      q: "What integrations does LRAT support?",
      a: "LRAT integrates with Unipile for LinkedIn message syncing, Claude AI for personalization, and webhooks for real-time reply detection. You can export leads to CSV for CRM import (Salesforce, HubSpot, etc.) and our REST API is available on the Enterprise plan for custom integrations.",
    },
    {
      q: "Do I need technical knowledge to use LRAT?",
      a: "No coding required. The onboarding wizard walks you through connecting your LinkedIn accounts, setting up your first campaign, and configuring safety settings in under 15 minutes. Our support team is available to help with any setup questions.",
    },
    {
      q: "Is there a free trial?",
      a: "Yes! You can start with a 7-day free trial on the Professional plan — no credit card required. You'll have full access to all features so you can see real results before committing.",
    },
  ];

  return (
    <section id="faqs" className="relative z-10 py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4">
            <FadeInLeft>
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">FAQ</span>
              <h2 className="text-4xl font-black text-white mt-4 tracking-tight leading-[1.1]">
                Common questions answered.
              </h2>
              <p className="text-slate-400 text-sm mt-4 font-medium leading-relaxed">
                Have more questions? Reach out to our team and we'll get back to you within 2 hours.
              </p>
              <Link to="/signup">
                <button className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2 group">
                  Talk to Sales
                  <PhoneCall size={13} className="group-hover:scale-110 transition-transform" />
                </button>
              </Link>
            </FadeInLeft>
          </div>

          <div className="lg:col-span-8 space-y-3">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div className={`border rounded-2xl transition-all ${openIdx === i ? 'border-blue-500/30 bg-blue-500/5' : 'border-white/8 bg-[#0D1526]/40 hover:border-white/15'}`}>
                  <button
                    id={`faq-btn-${i}`}
                    onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left gap-4"
                  >
                    <span className="text-sm font-bold text-white">{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-blue-400 shrink-0 transition-transform ${openIdx === i ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence>
                    {openIdx === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-6 pb-5 text-sm text-slate-400 leading-relaxed font-medium border-t border-white/8 pt-4">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FINAL CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="relative z-10 py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <FadeIn>
          <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 rounded-[40px] p-16 md:p-24 text-center overflow-hidden shadow-2xl shadow-blue-500/20">
            {/* Decoration */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_60%)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 border border-white/20 text-white text-[11px] font-black uppercase tracking-wider">
                <Rocket size={12} />
                Start in 10 minutes
              </div>

              <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
                Ready to turn LinkedIn into your{' '}
                <span className="text-yellow-300">lead machine?</span>
              </h2>

              <p className="text-white/70 text-lg font-medium max-w-xl mx-auto">
                Join 500+ B2B teams already generating pipeline on autopilot with LRAT.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Link to="/signup">
                  <button
                    id="final-cta-primary-btn"
                    className="w-full sm:w-auto bg-white hover:bg-slate-100 text-blue-700 px-10 py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                  >
                    Start Generating Leads Free
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                <Link to="/login">
                  <button
                    id="final-cta-secondary-btn"
                    className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/30 text-white px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-wider transition-all"
                  >
                    Sign In
                  </button>
                </Link>
              </div>

              <div className="flex items-center justify-center gap-6 pt-2 flex-wrap">
                {['No credit card', '7-day free trial', '30-day guarantee', 'Cancel anytime'].map((t, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-white/60 text-xs font-medium">
                    <Check size={12} className="text-white/80" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

// ─── FOOTER ──────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/8 py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Zap size={15} className="text-white fill-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white uppercase">LRAT</span>
            </div>
            <p className="text-slate-500 text-xs font-medium leading-relaxed max-w-sm">
              The #1 B2B LinkedIn Lead Generation platform for sales teams and agencies. Automate outreach safely. Close more deals.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-bold">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              All systems operational
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-5">Product</h4>
            <ul className="space-y-3">
              {['Features', 'How It Works', 'Pricing', 'ROI Calculator', 'Integrations'].map(item => (
                <li key={item}>
                  <a href={`#${item.toLowerCase().replace(' ', '-')}`} className="text-[11px] text-slate-500 hover:text-white transition-colors font-medium uppercase tracking-wider">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest mb-5">Company</h4>
            <ul className="space-y-3">
              {['About', 'Blog', 'Careers', 'Privacy Policy', 'Terms of Service'].map(item => (
                <li key={item}>
                  <a href="#" className="text-[11px] text-slate-500 hover:text-white transition-colors font-medium uppercase tracking-wider">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/8 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            © 2026 LRAT · LinkedIn Recruiter Automation Tool · All Rights Reserved
          </p>
          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-semibold">
            <Shield size={12} className="text-blue-500" />
            SOC2 Ready · GDPR Compliant · 98% Uptime SLA
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── INTEGRATION MARQUEE ─────────────────────────────────────────────────────
function IntegrationMarquee() {
  const integrations = [
    { name: "HubSpot CRM", type: "CRM Sync" },
    { name: "Salesforce", type: "Pipeline" },
    { name: "Clay.run", type: "Enrichment" },
    { name: "Apollo.io", type: "Lead DB" },
    { name: "Unipile API", type: "LinkedIn" },
    { name: "Claude AI", type: "Personalization" },
    { name: "Slack", type: "Alerts" },
    { name: "Zapier", type: "Automation" },
    { name: "HubSpot CRM", type: "CRM Sync" },
    { name: "Salesforce", type: "Pipeline" },
    { name: "Clay.run", type: "Enrichment" },
    { name: "Apollo.io", type: "Lead DB" },
  ];

  return (
    <section className="relative z-10 py-20 border-y border-white/8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-10 text-center">
        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Integrates with your existing stack</span>
      </div>
      <div className="flex overflow-hidden">
        <motion.div
          animate={{ x: [0, '-50%'] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="flex gap-6 whitespace-nowrap"
        >
          {integrations.concat(integrations).map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 bg-white/5 border border-white/8 px-5 py-3 rounded-xl shrink-0"
            >
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-sm font-bold text-slate-300">{item.name}</span>
              <span className="text-[9px] bg-white/8 text-slate-500 px-2 py-0.5 rounded-full font-bold uppercase">{item.type}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────────────
export default function Landing() {
  useEffect(() => {
    window.scrollTo(0, 0);

    document.title = "LRAT — B2B LinkedIn Lead Generation Platform | Automate Outreach Safely";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = 'description';
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = "LRAT is the #1 B2B LinkedIn Lead Generation platform. Automate outreach across 10+ accounts with AI personalization, anti-ban safety, and a unified inbox. Book more meetings, faster.";

    const schemaId = 'lrat-b2b-schema';
    if (!document.getElementById(schemaId)) {
      const s = document.createElement('script');
      s.id = schemaId;
      s.type = 'application/ld+json';
      s.innerHTML = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "LRAT - B2B LinkedIn Lead Generation",
        "operatingSystem": "All",
        "applicationCategory": "BusinessApplication",
        "offers": { "@type": "Offer", "price": "39.00", "priceCurrency": "USD" },
        "description": "Automate LinkedIn outreach across 10+ accounts with AI personalization, anti-ban safety, and unified inbox.",
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.9", "ratingCount": "342" }
      });
      document.head.appendChild(s);
    }

    return () => {
      const s = document.getElementById(schemaId);
      if (s) s.remove();
    };
  }, []);

  return (
    <div className="min-h-screen text-white font-sans selection:bg-blue-500 selection:text-white antialiased overflow-x-hidden">
      <DarkBackground />
      <Navigation />

      <main>
        <Hero />
        <SocialProof />
        <PainSolution />
        <Features />
        <HowItWorks />
        <ROICalculator />
        <Testimonials />
        <IntegrationMarquee />
        <Pricing />
        <FAQs />
        <FinalCTA />
      </main>

      <Footer />

      {/* Google Fonts */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        body { font-family: 'Inter', sans-serif; scroll-behavior: smooth; background: #080C18; }
        h1, h2, h3, h4, h5 { font-family: 'Inter', sans-serif; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px; height: 18px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
        }
      `}} />
    </div>
  );
}
