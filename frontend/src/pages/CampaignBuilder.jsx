import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Save, Play, Sparkles, UserPlus, MessageSquare,
  Eye, ThumbsUp, Tag, StopCircle, Clock, Settings2, ChevronDown,
  ChevronUp, Plus, Trash2, X, Check, Pause, ArrowRight, Target, Users, Search, AlertCircle, CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// ─── Step metadata ────────────────────────────────────────────────────────────
const STEP_META = {
  invite:       { icon: UserPlus,      color: '#3b82f6', border: 'border-blue-100 dark:border-blue-900/40',   text: 'text-blue-750 dark:text-blue-400',   label: 'Send Connection Request' },
  message:      { icon: MessageSquare, color: '#10b981', border: 'border-emerald-100 dark:border-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-400', label: 'Send Message' },
  view_profile: { icon: Eye,           color: '#0891b2', border: 'border-cyan-100 dark:border-cyan-900/40',   text: 'text-cyan-700 dark:text-cyan-400',   label: 'View Profile' },
  like_post:    { icon: ThumbsUp,      color: '#f97316', border: 'border-orange-100 dark:border-orange-900/40', text: 'text-orange-700 dark:text-orange-400', label: 'Like Post' },
  tag:          { icon: Tag,           color: '#ec4899', border: 'border-pink-100 dark:border-pink-900/40',   text: 'text-pink-700 dark:text-pink-400',   label: 'Add Tag' },
  end:          { icon: StopCircle,    color: '#ef4444', border: 'border-red-200 dark:border-red-900/45',    text: 'text-red-700 dark:text-red-400',    label: 'End Sequence' },
};

const ADD_OPTIONS = [
  { type: 'message',      emoji: '💬', label: 'Follow-up Message',  desc: 'Send a follow-up or custom message' },
  { type: 'view_profile', emoji: '👁️', label: 'View Their Profile', desc: 'Shows up in their "who viewed you"' },
  { type: 'like_post',    emoji: '👍', label: 'Like a Post',        desc: 'Like one of their recent LinkedIn posts' },
  { type: 'tag',          emoji: '🏷️', label: 'Add a Tag',          desc: 'Label the lead for easy filtering' },
];

const PRESET_TAGS = ['Hot Lead', 'Interested', 'Document Shared', 'Call Scheduled', 'Qualified', 'Not Interested'];

const GOALS = [
  { id: 'sales',  label: 'B2B Sales & Outreach',  icon: Target, desc: 'Generate qualified leads and book meetings' },
  { id: 'hiring', label: 'Talent Acquisition', icon: Users, desc: 'Find and connect with potential candidates' },
  { id: 'networking', label: 'Professional Networking',  icon: Sparkles, desc: 'Expand your industry network' },
];

// Predefined Sequence Templates populated with high-converting copy
const PRESET_TEMPLATES = [
  // HIRING PRESETS
  {
    id: 'hiring_direct',
    goal: 'hiring',
    label: 'Direct Job Pitch (High Intent)',
    emoji: '💼',
    desc: 'Connect with a personalized hiring note, then pitch the job description details directly.',
    steps: [
      { 
        id: 'invite-1', 
        type: 'invite', 
        waitAfter: 3, 
        data: { 
          aiNote: false, 
          note: 'Hi {{first_name}}, I was impressed by your profile and experience at {{company}}. I\'m hiring for a key position in our team. Let\'s connect!', 
          accounts: [] 
        } 
      },
      { 
        id: 'msg-1', 
        type: 'message', 
        waitAfter: 4, 
        data: { 
          msgType: 'jd', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nThanks for connecting! I wanted to reach out because I see your solid background as {{designation}}.\n\nHere are some key details of the role:\n- Role: {{designation}}\n- Company: {{company}}\n\nWould you be open to a quick 10-minute call to discuss details?', 
          jdSummary: '' 
        } 
      },
      { 
        id: 'msg-2', 
        type: 'message', 
        waitAfter: 0, 
        data: { 
          msgType: 'followup', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nI hope you\'re doing well! Following up to see if you had a moment to check the role details. Let me know if you would be open to a quick chat!' 
        } 
      },
      { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
    ]
  },
  {
    id: 'hiring_passive',
    goal: 'hiring',
    label: 'Passive Candidate Sourcing',
    emoji: '✨',
    desc: 'Profile view and connection without note (higher acceptance rate), followed by a warm introduction.',
    steps: [
      { id: 'view-1', type: 'view_profile', waitAfter: 1, data: {} },
      { 
        id: 'invite-1', 
        type: 'invite', 
        waitAfter: 2, 
        data: { 
          aiNote: true, 
          note: '', 
          accounts: [] 
        } 
      },
      { 
        id: 'msg-1', 
        type: 'message', 
        waitAfter: 0, 
        data: { 
          msgType: 'custom', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nThanks for connecting! Always looking to keep in touch with fellow tech professionals in the space. Love to hear more about your work as {{designation}} at {{company}}!' 
        } 
      },
      { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
    ]
  },

  // SALES PRESETS
  {
    id: 'sales_value',
    goal: 'sales',
    label: 'Value-First Pitch (Social Sourcing)',
    emoji: '📈',
    desc: 'Profile view, connect without note, share a value report/resource, then request a meeting.',
    steps: [
      { id: 'view-1', type: 'view_profile', waitAfter: 1, data: {} },
      { 
        id: 'invite-1', 
        type: 'invite', 
        waitAfter: 2, 
        data: { 
          aiNote: true, 
          note: '', 
          accounts: [] 
        } 
      },
      { 
        id: 'msg-1', 
        type: 'message', 
        waitAfter: 3, 
        data: { 
          msgType: 'custom', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nGlad to connect! I recently compiled an audit checklist for teams in the {{company}} space on optimizing processes. Here\'s a link: [Link]. Hope it helps!' 
        } 
      },
      { 
        id: 'msg-2', 
        type: 'message', 
        waitAfter: 0, 
        data: { 
          msgType: 'followup', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nHope the checklist was useful. We help companies like {{company}} solve this exact process bottleneck. Do you have 15 mins this week for a quick demo?' 
        } 
      },
      { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
    ]
  },
  {
    id: 'sales_direct',
    goal: 'sales',
    label: 'Direct Solution Pitch',
    emoji: '🎯',
    desc: 'Direct outreach pitch note followed by product intro details and meeting request.',
    steps: [
      { 
        id: 'invite-1', 
        type: 'invite', 
        waitAfter: 3, 
        data: { 
          aiNote: false, 
          note: 'Hi {{first_name}}, I noticed your work at {{company}}. We help teams in similar roles solve process delays. Let\'s connect!', 
          accounts: [] 
        } 
      },
      { 
        id: 'msg-1', 
        type: 'message', 
        waitAfter: 0, 
        data: { 
          msgType: 'custom', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nThanks for connecting! I wanted to reach out because we offer a solution that speeds up workflow processing. We\'ve helped similar teams cut delays by 40%.\n\nWould you be open to a brief chat or demo sometime next week?' 
        } 
      },
      { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
    ]
  },

  // NETWORKING PRESETS
  {
    id: 'networking_peer',
    goal: 'networking',
    label: 'Peer-to-Peer Connection',
    emoji: '🌐',
    desc: 'Connects with peers in your industry to exchange ideas and share feedback.',
    steps: [
      { 
        id: 'invite-1', 
        type: 'invite', 
        waitAfter: 2, 
        data: { 
          aiNote: false, 
          note: 'Hi {{first_name}}, noticed you\'re also working in the tech sector. Always looking to expand my circle with fellow professionals. Let\'s connect!', 
          accounts: [] 
        } 
      },
      { 
        id: 'msg-1', 
        type: 'message', 
        waitAfter: 0, 
        data: { 
          msgType: 'custom', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nThanks for connecting! Looking forward to following your updates and learning from your journey.' 
        } 
      },
      { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
    ]
  },
  {
    id: 'networking_thought',
    goal: 'networking',
    label: 'Thought Leadership Growth',
    emoji: '🧠',
    desc: 'View profile, connect, and casual check-in to build long-term relationships.',
    steps: [
      { id: 'view-1', type: 'view_profile', waitAfter: 1, data: {} },
      { 
        id: 'invite-1', 
        type: 'invite', 
        waitAfter: 2, 
        data: { 
          aiNote: true, 
          note: '', 
          accounts: [] 
        } 
      },
      { 
        id: 'msg-1', 
        type: 'message', 
        waitAfter: 0, 
        data: { 
          msgType: 'custom', 
          aiMsg: false, 
          message: 'Hi {{first_name}},\n\nThanks for connecting! I notice you have great insights in this space. I share regular posts about my work, would love to hear your thoughts on my future updates!' 
        } 
      },
      { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
    ]
  },

  // SCRATCH (ALL GOALS)
  {
    id: 'scratch',
    goal: 'all',
    label: 'Start from Scratch',
    emoji: '🌱',
    desc: 'Begin with a clean campaign outline and build custom steps.',
    steps: [
      { id: 'invite-1', type: 'invite', waitAfter: 0, data: { aiNote: true, note: '', accounts: [] } },
      { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
    ]
  }
];

// ─── Default state ────────────────────────────────────────────────────────────
function makeDefaultSteps() {
  // matches sales_direct preset defaults
  return [
    { 
      id: 'invite-1', 
      type: 'invite', 
      waitAfter: 3, 
      data: { 
        aiNote: false, 
        note: 'Hi {{first_name}}, I noticed your work at {{company}} and would love to connect. I think we have some great synergy.', 
        accounts: [] 
      } 
    },
    { 
      id: 'msg-1', 
      type: 'message', 
      waitAfter: 4, 
      data: { 
        msgType: 'jd', 
        aiMsg: false, 
        message: 'Hi {{first_name}},\n\nThanks for connecting! I wanted to reach out because we help companies like {{company}} optimize their processes and scale efficiently.\n\nI believe we can explore some mutual value. Would you be open to a quick 10-minute call to discuss this next week?', 
        jdSummary: '' 
      } 
    },
    { 
      id: 'msg-2', 
      type: 'message', 
      waitAfter: 0, 
      data: { 
        msgType: 'followup', 
        aiMsg: false, 
        message: 'Hi {{first_name}},\n\nI hope you\'re doing well! Following up to see if you had a moment to check my previous message. Let me know if you would be open to a quick chat!' 
      } 
    },
    { id: 'end-1', type: 'end', waitAfter: 0, data: {} }
  ];
}

function makeDefaultSettings() {
  return { accounts: [], dailyLimit: 20, workingStart: '09:00', workingEnd: '18:00', workingDays: [1,2,3,4,5], goal: 'sales', startsAt: '', endsAt: '' };
}

// ─── flow_json conversion ─────────────────────────────────────────────────────
function stepsToFlowJson(steps, settings) {
  const nodes = [];
  const edges = [];
  let y = 40;
  const x = 320;

  nodes.push({
    id: 'trigger-1', type: 'trigger', position: { x, y },
    data: { label: 'Start Sequence', ...settings },
  });
  let prev = 'trigger-1';
  y += 140;

  for (const step of steps) {
    nodes.push({ id: step.id, type: step.type, position: { x, y }, data: { label: STEP_META[step.type]?.label || step.type, ...step.data } });
    edges.push({ id: `e-${prev}-${step.id}`, source: prev, target: step.id, animated: true, style: { stroke: '#cbd5e1', strokeWidth: 2 } });
    prev = step.id;
    y += 140;

    if (step.waitAfter > 0 && step.type !== 'end') {
      const did = `delay-${step.id}`;
      nodes.push({ id: did, type: 'delay', position: { x, y }, data: { label: 'Wait', days: step.waitAfter } });
      edges.push({ id: `e-${prev}-${did}`, source: prev, target: did, animated: true, style: { stroke: '#cbd5e1', strokeWidth: 2 } });
      prev = did;
      y += 140;
    }
  }

  return { nodes, edges };
}

function flowJsonToSteps(flow) {
  if (!flow?.nodes?.length) return null;

  const nodeMap = {};
  for (const n of flow.nodes) nodeMap[n.id] = n;

  const adj = {};
  for (const e of (flow.edges || [])) {
    if (!adj[e.source]) adj[e.source] = [];
    adj[e.source].push(e.target);
  }

  const trigger = flow.nodes.find(n => n.type === 'trigger');
  if (!trigger) return null;

  const settings = {
    accounts:     trigger.data?.accounts     || [],
    dailyLimit:   trigger.data?.dailyLimit   || 20,
    workingStart: trigger.data?.workingStart || '09:00',
    workingEnd:   trigger.data?.workingEnd   || '18:00',
    workingDays:  trigger.data?.workingDays  || [1,2,3,4,5],
    goal:         trigger.data?.goal         || 'sales',
    startsAt:     trigger.data?.startsAt     || '',
    endsAt:       trigger.data?.endsAt       || '',
  };

  const steps = [];
  let cur = adj[trigger.id]?.[0];
  let prevStep = null;

  while (cur) {
    const node = nodeMap[cur];
    if (!node) break;

    if (node.type === 'delay') {
      if (prevStep) prevStep.waitAfter = node.data?.days || 1;
      cur = adj[cur]?.[0];
      continue;
    }

    const data = { ...node.data };
    delete data.label;
    const step = { id: node.id, type: node.type, waitAfter: 0, data };
    steps.push(step);
    prevStep = step;
    cur = adj[cur]?.[0];
  }

  return steps.length ? { steps, settings } : null;
}

let _ctr = 100;
function uid(t) { return `${t}-${++_ctr}`; }

// ─── Step card summary ────────────────────────────────────────────────────────
function getStepSummary(step) {
  if (step.type === 'invite')
    return step.data.aiNote ? '✨ AI auto-writes personalized invite note' : (step.data.note?.slice(0, 65) + (step.data.note?.length > 65 ? '…' : '') || 'No static note configured');
  if (step.type === 'message')
    return step.data.aiMsg ? '✨ AI auto-writes tailored message' : (step.data.message?.slice(0, 65) + (step.data.message?.length > 65 ? '…' : '') || 'No static message configured');
  if (step.type === 'view_profile') return "Performs profile view to trigger client-side notifications";
  if (step.type === 'like_post')   return `Likes ${step.data.postCount || 1} recent update(s)`;
  if (step.type === 'tag')         return step.data.tagName ? `Tags lead as "${step.data.tagName}"` : 'No tag label';
  if (step.type === 'end')         return 'End point: stops sequence but preserves lead inside CRM';
  return '';
}

// ─── ACTION COOLDOWN BUBBLE CONNECTOR ───────────────────────────────────────
function DelayConnector({ days, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(days);
  const ref = useRef();

  function commit() {
    const n = Math.max(1, Math.min(30, parseInt(val) || 1));
    onChange(n);
    setVal(n);
    setEditing(false);
  }

  useEffect(() => { if (editing) ref.current?.select(); }, [editing]);

  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-0.5 h-3 bg-slate-200 dark:bg-slate-800" />
      {editing ? (
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border-2 border-blue-505 rounded-full px-3 py-1 shadow-md z-10">
          <Clock size={11} className="text-blue-500" />
          <span className="text-[10px] font-semibold text-slate-500">Wait</span>
          <input 
            ref={ref} 
            type="number" 
            min={1} 
            max={30} 
            value={val}
            onChange={e => setVal(e.target.value)}
            onBlur={commit}
            onKeyDown={e => e.key === 'Enter' && commit()}
            className="w-8 text-center text-xs font-black text-blue-600 dark:text-blue-400 border-none outline-none bg-transparent focus:ring-0 p-0" 
          />
          <span className="text-[10px] font-semibold text-slate-500">days</span>
          <button onClick={commit} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 ml-1">
            <Check size={11} strokeWidth={3} />
          </button>
        </div>
      ) : (
        <button 
          type="button"
          onClick={() => { setVal(days); setEditing(true); }}
          className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/60 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 border border-slate-200 dark:border-slate-800/80 hover:border-blue-300 rounded-full px-3.5 py-1.5 transition-all group z-10"
        >
          <Clock size={11} className="text-slate-400 group-hover:text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 group-hover:text-blue-600">Wait {days} day{days !== 1 ? 's' : ''}</span>
          <span className="text-[10px] text-slate-350 group-hover:text-blue-500">✎</span>
        </button>
      )}
      <div className="w-0.5 h-3 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

// ─── ADD MENU DROPDOWN ──────────────────────────────────────────────────────
function AddMenu({ onAdd, onClose }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-0.5 h-2 bg-slate-200 dark:bg-slate-800" />
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xl p-2 w-72 z-20 text-left relative">
        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 py-1.5">Select action node</p>
        
        <div className="space-y-1">
          {ADD_OPTIONS.map(opt => (
            <button 
              key={opt.type} 
              onClick={() => { onAdd(opt.type); onClose(); }}
              className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors group"
            >
              <span className="text-xl leading-none">{opt.emoji}</span>
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-700 dark:text-slate-200 group-hover:text-blue-600 transition-colors uppercase tracking-wider">{opt.label}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="w-full text-center text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-650 py-2.5 mt-1">Close</button>
      </div>
      <div className="w-0.5 h-2 bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}

// ─── STEP PROGRESS INDICATOR WIDGET ─────────────────────────────────────────
function StepIndicator({ current, onChange, isNew }) {
  const steps = [
    { n: 1, l: 'Details', icon: Settings2 },
    { n: 2, l: 'Assets', icon: Users },
    { n: 3, l: 'Sequence', icon: Play },
    { n: 4, l: 'Sourcing', icon: Search },
    { n: 5, l: 'Review', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-between px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80">
      {steps.map((s, i) => {
        const isClickable = !isNew || s.n <= current;
        return (
          <div key={s.n} className="flex items-center flex-1 last:flex-none">
            <button 
              type="button"
              disabled={!isClickable}
              onClick={() => onChange(s.n)}
              className="flex flex-col items-center gap-1.5 group shrink-0 outline-none focus:outline-none disabled:cursor-not-allowed cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-350 ${
                current === s.n 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-4 ring-blue-500/10' 
                  : current > s.n 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30'
                    : 'bg-slate-55 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              } ${isClickable && current !== s.n ? 'hover:bg-slate-100 dark:hover:bg-slate-700/60' : ''}`}>
                <s.icon size={15} />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${
                current === s.n ? 'text-blue-600 dark:text-blue-400 font-black' : current > s.n ? 'text-slate-600 dark:text-slate-400 font-semibold' : 'text-slate-400'
              }`}>{s.l}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 transition-all duration-500 ${current > s.n ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-850'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN BUILDER CONTAINER ─────────────────────────────────────────────────
export default function CampaignBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [wizardStep, setWizardStep] = useState(1);
  const [steps, setSteps] = useState(makeDefaultSteps());
  const [settings, setSettings] = useState(makeDefaultSettings());
  const [campaignName, setCampaignName] = useState('Outreach Campaign - ' + new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
  const [campaignStatus, setCampaignStatus] = useState('draft');
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [editingId, setEditingId] = useState('trigger'); // default focuses the trigger node
  const [addMenuAfter, setAddMenuAfter] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(isNew ? null : id);
  const [selectedTemplateId, setSelectedTemplateId] = useState('sales_direct');

  // Sourcing Setup states
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [maxLeads, setMaxLeads] = useState(100);
  const [previewLeads, setPreviewLeads] = useState([]);
  const [totalFound, setTotalFound] = useState(0);
  const [sourcingLoading, setSourcingLoading] = useState(false);
  const [sourcingError, setSourcingError] = useState('');
  const [importStarted, setImportStarted] = useState(false);
  const [cannedMessages, setCannedMessages] = useState([]);

  useEffect(() => { 
    axios.get('/api/accounts').then(r => setAccounts(r.data.data || [])); 
    axios.get('/api/inbox/canned').then(r => setCannedMessages(r.data.data || []));
  }, []);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    axios.get(`/api/campaigns/${id}`).then(r => {
      const c = r.data.data;
      setCampaignName(c.name);
      setCampaignStatus(c.status);
      try {
        const parsed = flowJsonToSteps(JSON.parse(c.flow_json || '{}'));
        if (parsed) {
          setSteps(parsed.steps);
          setSettings({
            ...parsed.settings,
            startsAt: c.starts_at || '',
            endsAt: c.ends_at || ''
          });
        }
      } catch {}
      setWizardStep(3);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (wizardStep === 3) {
      setEditingId('trigger');
    }
  }, [wizardStep]);

  function handleGoalChange(goalId) {
    setSettings(s => ({ ...s, goal: goalId }));
    
    // Find matching presets for the new goal
    const matchingPresets = PRESET_TEMPLATES.filter(p => p.goal === goalId || p.goal === 'all');
    if (matchingPresets.length > 0 && isNew) {
      const defaultPreset = matchingPresets[0];
      setSelectedTemplateId(defaultPreset.id);
      
      const freshSteps = defaultPreset.steps.map((s, idx) => ({
        ...s,
        id: `${s.type}-${100 + idx}`
      }));
      setSteps(freshSteps);
      
      const prettyGoal = GOALS.find(g => g.id === goalId)?.label || goalId;
      const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      setCampaignName(`${prettyGoal} Outreach - ${formattedDate}`);
    }
  }

  function selectTemplate(templateId) {
    setSelectedTemplateId(templateId);
    const preset = PRESET_TEMPLATES.find(p => p.id === templateId);
    if (preset) {
      const freshSteps = preset.steps.map((s, idx) => ({
        ...s,
        id: `${s.type}-${100 + idx}`
      }));
      setSteps(freshSteps);

      const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      setCampaignName(`${preset.label} - ${formattedDate}`);
    }
  }

  function addStep(type, afterIdx) {
    const defaults = {
      message:      { msgType: 'followup', aiMsg: true, message: '', jdSummary: '' },
      view_profile: {},
      like_post:    { postCount: 1 },
      tag:          { tagName: '' },
    };
    const s = { id: uid(type), type, waitAfter: type === 'end' ? 0 : 2, data: defaults[type] || {} };
    setSteps(prev => {
      const copy = [...prev];
      const at = afterIdx != null ? afterIdx + 1 : Math.max(0, copy.length - 1);
      copy.splice(at, 0, s);
      return copy;
    });
    setEditingId(s.id);
    setAddMenuAfter(null);
  }

  function updateData(stepId, data) { setSteps(s => s.map(st => st.id === stepId ? { ...st, data } : st)); }
  function updateWait(stepId, days) { setSteps(s => s.map(st => st.id === stepId ? { ...st, waitAfter: days } : st)); }
  function deleteStep(stepId) { 
    setSteps(s => s.filter(st => st.id !== stepId)); 
    if (editingId === stepId) setEditingId('trigger'); 
  }

  function insertVariable(stepId, field, variable) {
    setSteps(prevSteps => prevSteps.map(st => {
      if (st.id === stepId) {
        const currentVal = st.data[field] || '';
        return {
          ...st,
          data: {
            ...st.data,
            [field]: currentVal + ` {{${variable}}}`
          }
        };
      }
      return st;
    }));
  }

  function extractLegacy(stepsArr, s) {
    const inv  = stepsArr.find(x => x.type === 'invite');
    const msgs = stepsArr.filter(x => x.type === 'message');
    const jd   = msgs.find(x => x.data.msgType === 'jd');
    const fu1  = msgs.find(x => x.data.msgType === 'followup');
    const fu2  = msgs.filter(x => x.data.msgType === 'followup')[1];
    const iIdx = stepsArr.findIndex(x => x.type === 'invite');
    const jIdx = stepsArr.findIndex(x => x.type === 'message' && x.data.msgType === 'jd');
    return {
      connection_note_template: inv?.data.aiNote  ? '' : (inv?.data.note     || ''),
      jd_message_template:      jd?.data.aiMsg    ? '' : (jd?.data.message   || ''),
      follow_up_1_template:     fu1?.data.aiMsg   ? '' : (fu1?.data.message  || ''),
      follow_up_2_template:     fu2?.data.aiMsg   ? '' : (fu2?.data.message  || ''),
      connection_note_b_template: (inv?.data.enableAB && !inv?.data.aiNote) ? (inv?.data.noteB || '') : '',
      jd_message_b_template:      (jd?.data.enableAB && !jd?.data.aiMsg) ? (jd?.data.messageB || '') : '',
      follow_up_1_b_template:     (fu1?.data.enableAB && !fu1?.data.aiMsg) ? (fu1?.data.messageB || '') : '',
      follow_up_2_b_template:     (fu2?.data.enableAB && !fu2?.data.aiMsg) ? (fu2?.data.messageB || '') : '',
      daily_limit_per_account:  s.dailyLimit  || 20,
      working_hours_start:      s.workingStart || '09:00',
      working_hours_end:        s.workingEnd   || '18:00',
      working_days:             s.workingDays  || [1,2,3,4,5],
      follow_up_1_days:         stepsArr[iIdx]?.waitAfter || 3,
      follow_up_2_days:         stepsArr[jIdx]?.waitAfter || 4,
      account_ids:              s.accounts || [],
      jd_summary:               jd?.data.jdSummary || '',
    };
  }

  async function save(status = campaignStatus, nextStep = null) {
    setSaving(true); setSaveMsg('');
    try {
      const flow_json = stepsToFlowJson(steps, settings);
      const legacy = extractLegacy(steps, settings);
      const payload = { 
        name: campaignName, 
        status, 
        flow_json, 
        ...legacy,
        starts_at: settings.startsAt || null,
        ends_at: settings.endsAt || null
      };

      let savedId = activeCampaignId;
      if (!savedId) {
        const res = await axios.post('/api/campaigns', payload);
        savedId = res.data.data.id;
        setActiveCampaignId(savedId);
        window.history.replaceState(null, '', `/dashboard/campaigns/${savedId}/build`);
      } else {
        await axios.put(`/api/campaigns/${savedId}`, payload);
      }

      setCampaignStatus(status);
      setSaveMsg('✓ Configuration Synced');
      if (nextStep) setWizardStep(nextStep);
      return savedId;
    } catch (e) {
      setSaveMsg('✗ ' + (e.response?.data?.error || 'Save failed'));
      return null;
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function fetchSourcingPreview() {
    if (!sourceUrl.trim()) return setSourcingError('Paste a LinkedIn search URL first');
    if (!sourceAccountId) return setSourcingError('Select a LinkedIn account to use');
    setSourcingError('');
    setSourcingLoading(true);
    try {
      const res = await axios.post('/api/leads/import/preview', { search_url: sourceUrl, account_id: sourceAccountId });
      setPreviewLeads(res.data.data || []);
      setTotalFound(res.data.total_found || 0);
    } catch (e) {
      setSourcingError(e.response?.data?.error || 'Failed to fetch — check URL and account');
    } finally {
      setSourcingLoading(false);
    }
  }

  async function doImportLeads() {
    let currentId = activeCampaignId;
    if (!currentId) {
      currentId = await save('draft');
      if (!currentId) return;
    }

    setSourcingLoading(true);
    try {
      await axios.post('/api/leads/import/url', {
        search_url: sourceUrl,
        account_id: sourceAccountId,
        campaign_id: currentId,
        max_leads: maxLeads,
      });
      setImportStarted(true);
      setTimeout(() => setWizardStep(5), 1500);
    } catch (e) {
      setSourcingError(e.response?.data?.error || 'Import failed');
    } finally {
      setSourcingLoading(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const nonEnd = steps.filter(s => s.type !== 'end');
  const endSt  = steps.find(s => s.type === 'end');

  // WIZARD STEP 1: BASICS with goal templates chooser
  const renderBasics = () => {
    const filteredPresets = PRESET_TEMPLATES.filter(pt => pt.goal === settings.goal || pt.goal === 'all');

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-left">
        <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Campaign Identity</label>
          <input 
            value={campaignName} 
            onChange={e => setCampaignName(e.target.value)}
            className="w-full text-lg font-bold text-slate-800 dark:text-slate-100 border border-slate-100 dark:border-slate-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 rounded-2xl px-5 py-4 outline-none bg-slate-50 dark:bg-slate-900 transition-all"
            placeholder="e.g. London React Developers - High Priority" 
          />
        </div>

        {/* Campaign Date Scheduling Window */}
        <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-4">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Campaign Date Window (Optional)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase mb-1.5">Start Date</span>
              <input
                type="date"
                value={settings.startsAt || ''}
                onChange={e => setSettings(s => ({ ...s, startsAt: e.target.value }))}
                className="w-full text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-3 text-slate-700 dark:text-slate-205 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <span className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase mb-1.5">End Date</span>
              <input
                type="date"
                value={settings.endsAt || ''}
                onChange={e => setSettings(s => ({ ...s, endsAt: e.target.value }))}
                className="w-full text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-3 text-slate-700 dark:text-slate-205 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <span className="text-[9px] text-slate-400 font-bold block uppercase mt-1">If set, outreach messages will only be dispatched inside this date range.</span>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Select Campaign Goal</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {GOALS.map(g => (
              <button 
                key={g.id} 
                type="button"
                onClick={() => handleGoalChange(g.id)}
                className={`flex flex-col items-start text-left p-6 rounded-[28px] border-2 transition-all ${
                  settings.goal === g.id 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-md shadow-blue-500/5' 
                    : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${
                  settings.goal === g.id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  <g.icon size={18} />
                </div>
                
                <span className="font-black text-xs uppercase tracking-widest text-slate-800 dark:text-slate-200 mb-1">{g.label}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed font-semibold">{g.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {isNew && (
          <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Choose Workflow Sequence Template</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPresets.map(pt => (
                <button 
                  key={pt.id} 
                  type="button"
                  onClick={() => selectTemplate(pt.id)}
                  className={`flex gap-4 items-start text-left p-5 rounded-[22px] border-2 transition-all ${
                    selectedTemplateId === pt.id 
                      ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-200'
                  }`}
                >
                  <span className="text-2xl leading-none pt-0.5">{pt.emoji}</span>
                  <div className="min-w-0">
                    <span className="font-black text-xs uppercase tracking-wider text-slate-850 dark:text-slate-200 block mb-1">{pt.label}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-semibold block">{pt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  // WIZARD STEP 2: ASSETS & LIMITS
  const renderAccounts = () => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-left">
      <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)]">
        <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Attach LinkedIn Sender Nodes</label>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {accounts.length === 0 ? (
            <p className="col-span-2 text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 text-center uppercase tracking-wider">
              No LinkedIn nodes found. Please connect assets first.
            </p>
          ) : accounts.map(acc => (
            <label 
              key={acc.id} 
              className={`flex items-center gap-3.5 p-4 rounded-[22px] border-2 cursor-pointer transition-all ${
                settings.accounts?.includes(acc.id) 
                  ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm' 
                  : 'border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 hover:border-slate-200'
              }`}
            >
              <input 
                type="checkbox" 
                checked={settings.accounts?.includes(acc.id)}
                onChange={e => {
                  const arr = settings.accounts || [];
                  setSettings(s => ({ ...s, accounts: e.target.checked ? [...arr, acc.id] : arr.filter(x => x !== acc.id) }));
                }} 
                className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 bg-slate-55 dark:bg-slate-900 focus:ring-blue-500" 
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 truncate leading-none">{acc.name}</p>
                <p className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-1.5">{acc.status} • Warmup {acc.warmup_week || 1}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-6">
        <div>
          <div className="flex justify-between items-end mb-4">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Daily Limit Cap Per Profile</label>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{settings.dailyLimit}</span>
          </div>
          <input 
            type="range" 
            min={5} 
            max={25} 
            value={settings.dailyLimit}
            onChange={e => setSettings(s => ({ ...s, dailyLimit: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500" 
          />
          <div className="flex justify-between mt-2.5">
            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Conservative (5)</span>
            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Aggressive (25)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Automation Work Hours Start</label>
            <input 
              type="time" 
              value={settings.workingStart} 
              onChange={e => setSettings(s => ({ ...s, workingStart: e.target.value }))}
              className="w-full border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none text-slate-800 dark:text-slate-200" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Work Hours Stop</label>
            <input 
              type="time" 
              value={settings.workingEnd} 
              onChange={e => setSettings(s => ({ ...s, workingEnd: e.target.value }))}
              className="w-full border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none text-slate-800 dark:text-slate-200" 
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Workday Scheduling</label>
          <div className="flex gap-2">
            {[
              { v: 1, l: 'M' }, { v: 2, l: 'T' }, { v: 3, l: 'W' }, 
              { v: 4, l: 'T' }, { v: 5, l: 'F' }, { v: 6, l: 'S' }, 
              { v: 0, l: 'S' }
            ].map(({ v, l }) => {
              const on = settings.workingDays?.includes(v);
              return (
                <button 
                  key={v} 
                  type="button"
                  onClick={() => {
                    const d = settings.workingDays || [1,2,3,4,5];
                    setSettings(s => ({ ...s, workingDays: on ? d.filter(x => x !== v) : [...d, v].sort() }));
                  }} 
                  className={`flex-1 aspect-square rounded-xl text-xs font-black transition-all ${
                    on 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );

  // WIZARD STEP 3: SPLIT VISUAL SEQUENCE BUILDER
  const renderSequence = () => {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full text-left"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Pane: Visual Sequence Flow */}
          <div className="lg:col-span-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-[32px] border border-slate-100 dark:border-slate-800/80 max-h-[70vh] overflow-y-auto">
            <div className="text-center pb-2">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Outreach Flowchart</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5 tracking-wider">Select a node to customize settings</p>
            </div>

            {/* Clickable Trigger Node ("Start Sequence") */}
            <div 
              onClick={() => setEditingId('trigger')}
              className={`rounded-3xl border-2 p-5 cursor-pointer text-left transition-all ${
                editingId === 'trigger'
                  ? 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 shadow-md shadow-blue-500/5'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-600 text-white shadow-sm">
                  <Play size={16} fill="currentColor" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Trigger Node</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider block mt-0.5">Start Sequence</span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                    {settings.accounts?.length || 0} Accounts • {settings.dailyLimit} daily limit
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center py-1">
              <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-800" />
            </div>

            {/* Steps Visual Nodes */}
            {nonEnd.map((step, idx) => {
              const m = STEP_META[step.type];
              const Icon = m.icon;
              const isSelected = editingId === step.id;

              return (
                <div key={step.id}>
                  {/* Step Card Visual Node */}
                  <div 
                    onClick={() => setEditingId(step.id)}
                    className={`rounded-3xl border-2 p-5 cursor-pointer text-left transition-all relative group ${
                      isSelected 
                        ? `shadow-lg border-blue-500 bg-blue-50/30 dark:bg-blue-950/20` 
                        : `${m.border} bg-white dark:bg-slate-900 hover:border-blue-400 hover:shadow-md`
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div style={{ background: m.color }} className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                        <Icon size={16} className="text-white" />
                      </div>

                      <div className="flex-1 min-w-0 pr-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Step {idx + 1}</span>
                          <span className={`text-[10px] font-black ${m.text} uppercase tracking-wider`}>{m.label}</span>
                          {step.type === 'message' && (
                            <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                              {step.data.msgType === 'jd' ? 'JD' : step.data.msgType === 'followup' ? 'Follow-up' : 'Custom'}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold leading-relaxed truncate">{getStepSummary(step)}</p>
                      </div>

                      {/* Delete step button */}
                      {nonEnd.length > 1 && step.type !== 'invite' && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(step.id);
                          }} 
                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Delay / Insert Step Menus */}
                  {step.type !== 'end' && (
                    <>
                      {step.waitAfter > 0 && (
                        <DelayConnector days={step.waitAfter} onChange={d => updateWait(step.id, d)} />
                      )}
                      
                      {addMenuAfter === idx ? (
                        <AddMenu onAdd={type => addStep(type, idx)} onClose={() => setAddMenuAfter(null)} />
                      ) : (
                        <div className="flex flex-col items-center py-1">
                          {step.waitAfter === 0 && <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-800" />}
                          <button 
                            type="button"
                            onClick={() => setAddMenuAfter(idx)}
                            className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-blue-50/50 hover:border-blue-400 dark:hover:bg-blue-950/10 border border-dashed border-slate-200 dark:border-slate-805 rounded-full px-3 py-1.5 transition-all"
                          >
                            <Plus size={10} strokeWidth={3} /> Add Step
                          </button>
                          <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-800" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {/* End of Sequence Node */}
            {endSt && (
              <div className="rounded-3xl border-2 border-rose-100/50 dark:border-rose-900/20 bg-white dark:bg-slate-900/60 p-5 flex items-center gap-4 text-left">
                <div className="w-9 h-9 bg-rose-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <StopCircle size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-rose-700 dark:text-rose-400 uppercase tracking-widest">End of Sequence</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 leading-none">Stop campaign pipeline processing.</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Pane: Configuration Form */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900/65 rounded-[32px] border border-slate-100 dark:border-slate-800/80 p-6 shadow-lg min-h-[400px]">
            {renderConfigPanel()}
          </div>

        </div>
      </motion.div>
    );
  };

  // Renders the trigger parameter options in the configuration panel
  function renderTriggerConfig() {
    return (
      <div className="space-y-6 text-left font-sans">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-105 uppercase tracking-wider mb-1">Start Sequence Trigger</h3>
          <p className="text-xs text-slate-400 dark:text-slate-555 font-semibold uppercase tracking-wider">Configure general limits and sender accounts</p>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

        {/* Sender Accounts Checklist */}
        <div className="space-y-4">
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Attach LinkedIn Sender Nodes</label>
          
          <div className="grid grid-cols-1 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {accounts.length === 0 ? (
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 text-center uppercase tracking-wider">
                No LinkedIn nodes found. Please connect assets first.
              </p>
            ) : accounts.map(acc => (
              <label 
                key={acc.id} 
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  settings.accounts?.includes(acc.id) 
                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                }`}
              >
                <input 
                  type="checkbox" 
                  checked={settings.accounts?.includes(acc.id)}
                  onChange={e => {
                    const arr = settings.accounts || [];
                    setSettings(s => ({ ...s, accounts: e.target.checked ? [...arr, acc.id] : arr.filter(x => x !== acc.id) }));
                  }} 
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:ring-blue-500" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate leading-none">{acc.name}</p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold uppercase tracking-widest mt-1">{acc.status} • Warmup {acc.warmup_week || 1}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Daily limits slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Daily Limit Cap Per Profile</label>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{settings.dailyLimit}</span>
          </div>
          <input 
            type="range" 
            min={5} 
            max={25} 
            value={settings.dailyLimit}
            onChange={e => setSettings(s => ({ ...s, dailyLimit: parseInt(e.target.value) }))}
            className="w-full h-1.5 bg-slate-105 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500" 
          />
        </div>

        {/* Timing and scheduling */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Work Hours Start</label>
            <input 
              type="time" 
              value={settings.workingStart} 
              onChange={e => setSettings(s => ({ ...s, workingStart: e.target.value }))}
              className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none text-slate-800 dark:text-slate-200" 
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">Work Stop Time</label>
            <input 
              type="time" 
              value={settings.workingEnd} 
              onChange={e => setSettings(s => ({ ...s, workingEnd: e.target.value }))}
              className="w-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 text-xs font-bold focus:border-blue-500 outline-none text-slate-800 dark:text-slate-200" 
            />
          </div>
        </div>

        {/* Workdays scheduling buttons */}
        <div>
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Workday Scheduling</label>
          <div className="flex gap-1.5">
            {[
              { v: 1, l: 'M' }, { v: 2, l: 'T' }, { v: 3, l: 'W' }, 
              { v: 4, l: 'T' }, { v: 5, l: 'F' }, { v: 6, l: 'S' }, 
              { v: 0, l: 'S' }
            ].map(({ v, l }) => {
              const on = settings.workingDays?.includes(v);
              return (
                <button 
                  key={v} 
                  type="button"
                  onClick={() => {
                    const d = settings.workingDays || [1,2,3,4,5];
                    setSettings(s => ({ ...s, workingDays: on ? d.filter(x => x !== v) : [...d, v].sort() }));
                  }} 
                  className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${
                    on 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-850 text-slate-400 hover:bg-slate-100/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Renders the sidebar settings panel based on the selected step node
  function renderConfigPanel() {
    if (editingId === 'trigger') {
      return renderTriggerConfig();
    }

    const activeStep = steps.find(s => s.id === editingId);
    if (!activeStep) {
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-slate-400 dark:text-slate-500 text-center p-6 font-sans">
          <Settings2 size={36} className="mb-3 opacity-40 animate-pulse" />
          <p className="text-xs font-black uppercase tracking-wider">Select a node from the flowchart</p>
          <p className="text-[10px] font-semibold mt-1">Configure individual automation steps on the timeline.</p>
        </div>
      );
    }

    const m = STEP_META[activeStep.type];
    const Icon = m?.icon;

    const inputCls = 'w-full border border-slate-200 dark:border-slate-805 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 bg-white dark:bg-slate-900 dark:text-slate-200 transition-all';
    const lbl = 'block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5';

    function setStepData(k, v) {
      updateData(activeStep.id, { ...activeStep.data, [k]: v });
    }

    return (
      <div className="space-y-6 text-left font-sans">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div style={{ background: m.color }} className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm">
                <Icon size={16} className="text-white" />
              </div>
            )}
            <div>
              <span className={`text-xs font-black ${m?.text} uppercase tracking-wider`}>{m?.label}</span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase mt-0.5 tracking-wider">Step Settings</p>
            </div>
          </div>

          <button 
            onClick={() => setEditingId('trigger')}
            className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-650"
          >
            Trigger settings
          </button>
        </div>

        <div className="border-t border-slate-100 dark:border-slate-800 my-4" />

        <div className="space-y-5">
          {activeStep.type === 'invite' && (
            <div>
              <label className={lbl}>Outreach Note Personalization</label>
              <div className="flex gap-2 mb-3">
                <button 
                  type="button"
                  onClick={() => setStepData('aiNote', true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeStep.data.aiNote 
                      ? 'border-purple-400 bg-purple-50/50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' 
                      : 'border-slate-200 bg-white dark:bg-slate-850 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  <Sparkles size={12} /> Llama AI auto-write
                </button>
                <button 
                  type="button"
                  onClick={() => setStepData('aiNote', false)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                    !activeStep.data.aiNote 
                      ? 'border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' 
                      : 'border-slate-200 bg-white dark:bg-slate-855 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                  }`}
                >
                  Static template note
                </button>
              </div>

              {activeStep.data.aiNote ? (
                <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/30 rounded-2xl p-4 leading-relaxed font-semibold">
                  ✨ Llama-3.1 70B personalizes connection notes automatically utilizing the prospect's active LinkedIn title and business sector.
                </div>
              ) : (
                <>
                  {cannedMessages.length > 0 && (
                    <div className="mb-2">
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) {
                            setStepData('note', val.slice(0, 280));
                            e.target.value = '';
                          }
                        }}
                        className="w-full border border-slate-200 dark:border-slate-805 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-pointer outline-none"
                      >
                        <option value="">📁 Select canned response template...</option>
                        {cannedMessages.map(cm => (
                          <option key={cm.id} value={cm.content}>{cm.title}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <textarea 
                    value={activeStep.data.note || ''} 
                    onChange={e => setStepData('note', e.target.value.slice(0, 280))}
                    rows={3} 
                    className={`${inputCls} resize-none`}
                    placeholder="Hi {{first_name}}, I came across your profile and would love to connect..." 
                  />
                  
                  {/* Clickable Variable Inserter Buttons */}
                  <div className="flex gap-1.5 mt-2">
                    {['first_name', 'company', 'designation'].map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(activeStep.id, 'note', v)}
                        className="text-[9px] px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-450 hover:bg-slate-100 font-bold active:scale-95 transition-transform"
                      >
                        +{v}
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2.5 uppercase tracking-wide">
                    {(activeStep.data.note || '').length}/280 limit
                  </p>

                  {/* A/B Testing invite Note Toggle */}
                  <div className="mt-4 mb-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">A/B Testing (Variant B)</span>
                    <button
                      type="button"
                      onClick={() => setStepData('enableAB', !activeStep.data.enableAB)}
                      className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border-2 transition-all ${
                        activeStep.data.enableAB 
                          ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' 
                          : 'border-slate-200 bg-white dark:bg-slate-850 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {activeStep.data.enableAB ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {activeStep.data.enableAB && (
                    <div className="space-y-2 mt-2 border-l-2 border-indigo-200 dark:border-indigo-900/60 pl-3">
                      <span className="block text-[9px] font-bold text-indigo-505 dark:text-indigo-400 uppercase tracking-wider">Variant B Connection Note</span>
                      <textarea 
                        value={activeStep.data.noteB || ''} 
                        onChange={e => setStepData('noteB', e.target.value.slice(0, 280))}
                        rows={3} 
                        className={`${inputCls} resize-none border-indigo-200 dark:border-indigo-900/40 focus:border-indigo-500`}
                        placeholder="Variant B: Hi {{first_name}}, would love to connect to discuss..." 
                      />
                      {/* Clickable Variable Inserter Buttons for Variant B */}
                      <div className="flex gap-1.5 mt-1.5">
                        {['first_name', 'company', 'designation'].map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => insertVariable(activeStep.id, 'noteB', v)}
                            className="text-[9px] px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-450 hover:bg-slate-100 font-bold active:scale-95 transition-transform"
                          >
                            +{v}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wide">
                        {(activeStep.data.noteB || '').length}/280 limit
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeStep.type === 'message' && (
            <>
              <div>
                <label className={lbl}>Context type</label>
                <div className="flex gap-2">
                  {[
                    { v: 'jd', l: '📄 Pitch / Offer' }, 
                    { v: 'followup', l: '🔁 Follow-up' }, 
                    { v: 'custom', l: '✍️ Custom Note' }
                  ].map(({ v, l }) => (
                    <button 
                      key={v} 
                      type="button"
                      onClick={() => setStepData('msgType', v)}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                        activeStep.data.msgType === v 
                          ? 'border-emerald-500 bg-emerald-50/30 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                          : 'border-slate-200 bg-white dark:bg-slate-855 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={lbl}>Write mode</label>
                <div className="flex gap-2 mb-3">
                  <button 
                    type="button"
                    onClick={() => setStepData('aiMsg', true)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                      activeStep.data.aiMsg 
                        ? 'border-purple-400 bg-purple-50/50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400' 
                        : 'border-slate-200 bg-white dark:bg-slate-855 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <Sparkles size={12} /> AI personalized message
                  </button>
                  <button 
                    type="button"
                    onClick={() => setStepData('aiMsg', false)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-[10px] font-black uppercase tracking-wider transition-all ${
                      !activeStep.data.aiMsg 
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                        : 'border-slate-200 bg-white dark:bg-slate-855 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    Static template message
                  </button>
                </div>

                {activeStep.data.aiMsg ? (
                  <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/10 border border-purple-100/50 dark:border-purple-900/30 rounded-2xl p-4 leading-relaxed font-semibold">
                    ✨ Llama model drafts targeted personalized pitches drawing details directly from prospect profiles.
                  </div>
                ) : (
                  <>
                    {cannedMessages.length > 0 && (
                      <div className="mb-2">
                        <select
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              setStepData('message', val);
                              e.target.value = '';
                            }
                          }}
                          className="w-full border border-slate-200 dark:border-slate-805 rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-55 dark:bg-slate-900 text-slate-500 cursor-pointer outline-none"
                        >
                          <option value="">📁 Select canned response template...</option>
                          {cannedMessages.map(cm => (
                            <option key={cm.id} value={cm.content}>{cm.title}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <textarea 
                      value={activeStep.data.message || ''} 
                      onChange={e => setStepData('message', e.target.value)}
                      rows={4} 
                      className={`${inputCls} resize-none`}
                      placeholder="Hi {{first_name}}, following up on my previous message..." 
                    />

                    {/* A/B Testing Message Variant B Toggle */}
                    <div className="mt-4 mb-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">A/B Testing (Variant B)</span>
                      <button
                        type="button"
                        onClick={() => setStepData('enableAB', !activeStep.data.enableAB)}
                        className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border-2 transition-all ${
                          activeStep.data.enableAB 
                            ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' 
                            : 'border-slate-200 bg-white dark:bg-slate-850 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        {activeStep.data.enableAB ? 'Enabled' : 'Disabled'}
                      </button>
                    </div>

                    {activeStep.data.enableAB && (
                      <div className="space-y-2 mt-2 border-l-2 border-indigo-200 dark:border-indigo-900/60 pl-3">
                        <span className="block text-[9px] font-bold text-indigo-505 dark:text-indigo-400 uppercase tracking-wider">Variant B Pitch Message</span>
                        <textarea 
                          value={activeStep.data.messageB || ''} 
                          onChange={e => setStepData('messageB', e.target.value)}
                          rows={4} 
                          className={`${inputCls} resize-none border-indigo-200 dark:border-indigo-900/40 focus:border-indigo-500`}
                          placeholder="Variant B: Hi {{first_name}}, I wanted to share a different angle about our offering..." 
                        />
                        {/* Clickable Variable Inserter Buttons for Variant B */}
                        <div className="flex gap-1.5 mt-1.5">
                          {['first_name', 'company', 'designation'].map(v => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => insertVariable(activeStep.id, 'messageB', v)}
                              className="text-[9px] px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-450 hover:bg-slate-100 font-bold active:scale-95 transition-transform"
                            >
                              +{v}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Clickable Variable Inserter Buttons */}
                    <div className="flex gap-1.5 mt-2">
                      {['first_name', 'company', 'designation'].map(v => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(activeStep.id, 'message', v)}
                          className="text-[9px] px-2.5 py-1 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-450 hover:bg-slate-100 font-bold active:scale-95 transition-transform"
                        >
                          +{v}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {activeStep.data.msgType === 'jd' && (
                <div>
                  <label className={lbl}>Active Offer / Pitch Details (AI Context Source)</label>
                  <textarea 
                    value={activeStep.data.jdSummary || ''} 
                    onChange={e => setStepData('jdSummary', e.target.value)}
                    rows={3} 
                    className={`${inputCls} resize-none`}
                    placeholder="Describe your offer, product or service details here (e.g. Acme SaaS CRM, pricing, key features...)" 
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-wide">
                    AI dynamically incorporates your offer details into outreach messages
                  </p>
                </div>
              )}
            </>
          )}

          {activeStep.type === 'view_profile' && (
            <div className="text-xs text-cyan-700 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-100/50 dark:border-cyan-900/30 rounded-2xl p-4 space-y-2 leading-relaxed font-semibold">
              <p className="uppercase tracking-wider text-[10px] font-black text-cyan-800 dark:text-cyan-300">Profile Visits Action</p>
              <p className="text-xs normal-case">Triggers a direct view notification in LinkedIn dashboard. Highly safe organic warm signal.</p>
            </div>
          )}

          {activeStep.type === 'like_post' && (
            <div>
              <label className={lbl}>Amount of posts to react to</label>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button 
                    key={n} 
                    type="button"
                    onClick={() => setStepData('postCount', n)}
                    className={`flex-1 py-2.5 rounded-xl border-2 text-base font-black transition-all ${
                      (activeStep.data.postCount || 1) === n 
                        ? 'border-orange-500 bg-orange-50/30 text-orange-700 dark:bg-orange-950/20 dark:text-orange-400' 
                        : 'border-slate-200 bg-white dark:bg-slate-850 dark:border-slate-800 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeStep.type === 'tag' && (
            <div>
              <label className={lbl}>CRM Tag Name</label>
              <input 
                value={activeStep.data.tagName || ''} 
                onChange={e => setStepData('tagName', e.target.value)}
                className={inputCls} 
                placeholder="e.g. Sourced, High Priority..." 
              />
              <div className="flex flex-wrap gap-1.5 mt-3">
                {PRESET_TAGS.map(tag => (
                  <button 
                    key={tag} 
                    type="button"
                    onClick={() => setStepData('tagName', tag)}
                    className={`text-[9px] px-3 py-1 rounded-full border transition-all font-black uppercase tracking-wider ${
                      activeStep.data.tagName === tag 
                        ? 'border-pink-400 bg-pink-50 text-pink-700 dark:bg-pink-950/20 dark:text-pink-400' 
                        : 'border-slate-100 bg-slate-50 dark:bg-slate-855 dark:border-slate-800 text-slate-400 hover:border-pink-300 hover:text-pink-500'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // WIZARD STEP 4: SOURCING FROM LINKEDIN
  const renderSourcing = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 text-left">
      <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-6 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)] space-y-5">
        <div>
          <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">LinkedIn Search URL Source</label>
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              value={sourceUrl} 
              onChange={e => setSourceUrl(e.target.value)}
              placeholder="Paste LinkedIn Sales Navigator Search URL..."
              className="w-full text-sm border border-slate-100 dark:border-slate-800 rounded-2xl pl-12 pr-4 py-3.5 bg-slate-55 dark:bg-slate-900 focus:bg-white focus:border-blue-500 outline-none text-slate-800 dark:text-slate-200 transition-all placeholder:text-slate-400" 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Scraper Node</label>
            <select 
              value={sourceAccountId} 
              onChange={e => setSourceAccountId(e.target.value)}
              className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-900 dark:text-slate-200 focus:border-blue-550 outline-none"
            >
              <option value="">Select profile...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Limit Profile Targets</label>
            <input 
              type="number" 
              value={maxLeads} 
              onChange={e => setMaxLeads(e.target.value)}
              className="w-full border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm font-bold bg-white dark:bg-slate-900 dark:text-slate-200 focus:border-blue-550 outline-none" 
            />
          </div>
        </div>

        <button 
          onClick={fetchSourcingPreview} 
          disabled={sourcingLoading}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          {sourcingLoading ? 'Searching...' : 'Scan Leads'}
        </button>

        {sourcingError && <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100/50 rounded-xl p-3.5 font-semibold text-center">{sourcingError}</p>}
      </div>

      {previewLeads.length > 0 && (
        <div className="bg-white dark:bg-slate-900/60 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.01)] overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-100/30 dark:bg-slate-900/50">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Found {totalFound} Match{totalFound !== 1 ? 'es' : ''}</span>
            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-emerald-100/50">Ready to pull</span>
          </div>
          
          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
            {previewLeads.map((p, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between">
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-250 truncate">{p.full_name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold truncate max-w-[300px] mt-0.5">{p.designation} @ {p.company}</p>
                </div>
                {p.is_duplicate ? (
                  <span className="text-[8px] font-black text-slate-300 dark:text-slate-500 uppercase tracking-widest">Active CRM</span>
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
          
          <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-850">
            <button 
              onClick={doImportLeads} 
              disabled={sourcingLoading || importStarted}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98]"
            >
              {importStarted ? 'Initiating Background Pull...' : `Import ${Math.min(maxLeads, totalFound)} leads & continue`}
            </button>
          </div>
        </div>
      )}

      {!previewLeads.length && !sourcingLoading && (
        <div className="text-center py-6 opacity-60">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">Not ready to import leads? You can skip this and upload CSV later.</p>
          <button 
            type="button"
            onClick={() => setWizardStep(5)} 
            className="text-blue-600 dark:text-blue-400 font-black text-[10px] uppercase tracking-widest mt-2 hover:underline block mx-auto"
          >
            Skip lead pull for now
          </button>
        </div>
      )}
    </motion.div>
  );

  // WIZARD STEP 5: REVIEW & ACTIVATE
  const getValidationIssues = () => {
    const issues = [];
    if (!settings.accounts || settings.accounts.length === 0) {
      issues.push({ type: 'blocker', text: 'No active LinkedIn senders assigned to this campaign (Step 2).' });
    }
    const nonEndActions = steps.filter(s => s.type !== 'end');
    if (nonEndActions.length === 0) {
      issues.push({ type: 'blocker', text: 'Your sequence has no actions. Add at least one action step like message, tag or view profile (Step 3).' });
    }
    const hasInvite = steps.some(s => s.type === 'invite');
    const hasMessage = steps.some(s => s.type === 'message');
    if (hasInvite && !hasMessage) {
      issues.push({ type: 'warning', text: 'You have a Connection Request node but no Message follow-up. Consider adding a follow-up message step.' });
    }
    return issues;
  };

  const renderReview = () => {
    const issues = getValidationIssues();
    const isBlocked = issues.some(iss => iss.type === 'blocker');

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 text-left font-sans">
        <div className="bg-white dark:bg-slate-900/60 rounded-[32px] p-8 border border-slate-100 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.015)] text-center space-y-6">
          <div className={`w-20 h-20 ${isBlocked ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500'} border rounded-full flex items-center justify-center mx-auto animate-bounce`}>
            {isBlocked ? <AlertCircle size={40} /> : <CheckCircle2 size={40} />}
          </div>
          
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              {isBlocked ? 'Review Blockers Detected' : 'Sequence Configured!'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase mt-1 tracking-wider">
              {isBlocked ? 'Resolve the blockers below to activate outreach.' : 'Everything looks solid. Review campaign summary below.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Attached Senders</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-205">{settings.accounts?.length || 0} Account{settings.accounts?.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Safe Daily Limits</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-205">{settings.dailyLimit} invites/day</span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Sequence Steps</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-205">{nonEnd.length} Action Step{nonEnd.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1">Working hours</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-205">{settings.workingStart} - {settings.workingEnd}</span>
            </div>
          </div>

          {issues.length > 0 && (
            <div className={`border rounded-2xl p-5 text-left space-y-3 ${isBlocked ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400' : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
                <AlertCircle size={14} />
                <span>Pre-Launch Checklist Issues</span>
              </h3>
              <ul className="space-y-2 text-[11px] font-semibold">
                {issues.map((iss, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider text-white ${iss.type === 'blocker' ? 'bg-rose-500' : 'bg-amber-500'}`}>
                      {iss.type}
                    </span>
                    <span>{iss.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Start Campaign Action Button - Enlarged and Thicker Vertical Padding */}
          <button 
            type="button"
            onClick={() => save('active').then(() => navigate('/dashboard/campaigns'))} 
            disabled={saving || isBlocked}
            className={`w-full py-5 px-6 rounded-2xl text-sm font-extrabold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2.5 active:scale-[0.98] h-14 ${
              isBlocked 
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30'
            }`}
          >
            <Play size={16} fill="currentColor" /> 
            <span>{saving ? 'Launching...' : isBlocked ? 'Resolve Blockers to Activate' : 'Activate Campaign'}</span>
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#fbfcfd] dark:bg-slate-950">
      <StepIndicator current={wizardStep} onChange={setWizardStep} isNew={isNew} />

      <div className="flex-1 overflow-y-auto">
        <div className={`${wizardStep === 3 ? 'max-w-5xl' : 'max-w-2xl'} mx-auto px-6 py-10 transition-all duration-300`}>
          <AnimatePresence mode="wait">
            {wizardStep === 1 && renderBasics()}
            {wizardStep === 2 && renderAccounts()}
            {wizardStep === 3 && renderSequence()}
            {wizardStep === 4 && renderSourcing()}
            {wizardStep === 5 && renderReview()}
          </AnimatePresence>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800/80 px-8 py-5 flex items-center justify-between shrink-0">
        <button 
          onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : navigate('/dashboard/campaigns')}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-slate-250 transition-colors"
        >
          <ArrowLeft size={14} /> 
          <span>{wizardStep === 1 ? 'Cancel' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-4">
          {saveMsg && <span className="text-[9px] font-black text-emerald-605 dark:text-emerald-450 uppercase tracking-widest">{saveMsg}</span>}
          {wizardStep < 5 && (
            <button 
              onClick={() => wizardStep === 4 ? setWizardStep(5) : save(campaignStatus, wizardStep + 1)} 
              disabled={saving}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
            >
              <span>{wizardStep === 4 ? 'Review' : 'Next Step'}</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
