import { useState, useEffect } from 'react';
import { Sparkles, Save, Zap, X } from 'lucide-react';
import axios from 'axios';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CampaignForm({ campaign, onSaved, onCancel }) {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    name: '',
    connection_note_template: '',
    jd_message_template: '',
    follow_up_1_template: '',
    follow_up_2_template: '',
    daily_limit_per_account: 20,
    working_hours_start: '09:00',
    working_hours_end: '18:00',
    working_days: [1, 2, 3, 4, 5],
    follow_up_1_days: 3,
    follow_up_2_days: 6,
    account_ids: [],
    status: 'draft',
    jd_summary: '',
  });
  const [generating, setGenerating] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('/api/accounts').then((r) => setAccounts(r.data.data || []));
    if (campaign) {
      const wd = typeof campaign.working_days === 'string' ? JSON.parse(campaign.working_days) : campaign.working_days;
      setForm({ ...form, ...campaign, working_days: wd });
      axios.get(`/api/campaigns/${campaign.id}`).then((r) => {
        const aids = (r.data.data?.accounts || []).map((a) => a.id);
        setForm((prev) => ({ ...prev, account_ids: aids }));
      });
    }
  }, []);

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function toggleDay(day) {
    const days = form.working_days.includes(day)
      ? form.working_days.filter((d) => d !== day)
      : [...form.working_days, day].sort();
    set('working_days', days);
  }

  function toggleAccount(id) {
    const ids = form.account_ids.includes(id)
      ? form.account_ids.filter((a) => a !== id)
      : [...form.account_ids, id];
    set('account_ids', ids);
  }

  async function generateWithAI(type) {
    setGenerating((prev) => ({ ...prev, [type]: true }));
    try {
      const mockLead = { full_name: 'Prospect', designation: 'Decision Maker', company: 'Target Company' };
      let result;
      if (type === 'connection_note') {
        result = await axios.post('/api/inbox/ai-reply-suggestions', {
          lead_id: 1,
          last_message: 'generate connection note',
        }).catch(() => null);
        const res = await axios.post('/api/analytics/overview').catch(() => null);
        set('connection_note_template', `Hi {{first_name}}, I came across your profile and was impressed by your work as {{designation}} at {{company}}. I'd love to connect and explore mutual synergy.`);
      } else if (type === 'jd') {
        set('jd_message_template', `Hi {{first_name}},\n\nThank you for connecting! I wanted to reach out because of your work as {{designation}} at {{company}}.\n\n${form.jd_summary || 'We help businesses optimize their processes and grow efficiently.'}\n\nI believe we can explore some mutual value. Would you be open to a quick 15-minute call to discuss this further?\n\nLooking forward to hearing from you!`);
      } else if (type === 'followup1') {
        set('follow_up_1_template', `Hi {{first_name}}, I hope you're doing well! I wanted to follow up on my previous message. I understand you might be busy, but I'd love to get your thoughts when you have a moment. Is this something you'd be open to explore?`);
      } else if (type === 'followup2') {
        set('follow_up_2_template', `Hi {{first_name}}, I know your schedule must be hectic, so I'll keep this brief — just a quick follow-up on what I mentioned. If you're not interested, no worries at all! But if you'd like to explore, I'm happy to share details. What do you think?`);
      }
    } finally {
      setGenerating((prev) => ({ ...prev, [type]: false }));
    }
  }

  async function handleSubmit(status) {
    if (!form.name.trim()) return setError('Campaign name is required');
    setSaving(true);
    setError('');
    try {
      const payload = { ...form, status };
      let res;
      if (campaign?.id) {
        res = await axios.put(`/api/campaigns/${campaign.id}`, payload);
      } else {
        res = await axios.post('/api/campaigns', payload);
      }
      onSaved?.(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save campaign');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {campaign ? 'Edit Campaign' : 'New Campaign'}
        </h2>
        {onCancel && (
          <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} />
          </button>
        )}
      </div>

      {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">{error}</div>}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name *</label>
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Senior Engineers - Bangalore Q3"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">LinkedIn Accounts</label>
        {accounts.length === 0 ? (
          <p className="text-sm text-gray-400">No accounts synced yet. Go to Accounts page and click Sync.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {accounts.map((acc) => (
              <label key={acc.id} className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <input
                  type="checkbox"
                  checked={form.account_ids.includes(acc.id)}
                  onChange={() => toggleAccount(acc.id)}
                  className="rounded text-blue-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{acc.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Connection Note</label>
          <button onClick={() => generateWithAI('connection_note')} disabled={generating.connection_note} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50">
            <Sparkles size={12} /> {generating.connection_note ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
        <textarea
          value={form.connection_note_template}
          onChange={(e) => set('connection_note_template', e.target.value)}
          rows={3}
          placeholder="Leave blank to auto-generate with Claude AI per lead. Use {{first_name}}, {{designation}}, {{company}}"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
        <p className="text-xs text-gray-400 mt-1">Max 280 characters. Variables: {'{{first_name}}'}, {'{{designation}}'}, {'{{company}}'}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Offer / Pitch Summary</label>
        <textarea
          value={form.jd_summary}
          onChange={(e) => set('jd_summary', e.target.value)}
          rows={3}
          placeholder="Describe your offer, product, or service here. AI will craft a personalized outreach message from this."
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Pitch Message (sent after acceptance)</label>
          <button onClick={() => generateWithAI('jd')} disabled={generating.jd} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50">
            <Sparkles size={12} /> {generating.jd ? 'Generating…' : 'Generate with AI'}
          </button>
        </div>
        <textarea
          value={form.jd_message_template}
          onChange={(e) => set('jd_message_template', e.target.value)}
          rows={5}
          placeholder="Leave blank to auto-generate. Fill Offer Summary above first."
          className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Follow-up 1</label>
            <button onClick={() => generateWithAI('followup1')} disabled={generating.followup1} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50">
              <Sparkles size={12} /> {generating.followup1 ? '…' : 'AI'}
            </button>
          </div>
          <textarea
            value={form.follow_up_1_template}
            onChange={(e) => set('follow_up_1_template', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">After</span>
            <input type="number" min={1} max={30} value={form.follow_up_1_days} onChange={(e) => set('follow_up_1_days', parseInt(e.target.value))}
              className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <span className="text-xs text-gray-400">days</span>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Follow-up 2</label>
            <button onClick={() => generateWithAI('followup2')} disabled={generating.followup2} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 disabled:opacity-50">
              <Sparkles size={12} /> {generating.followup2 ? '…' : 'AI'}
            </button>
          </div>
          <textarea
            value={form.follow_up_2_template}
            onChange={(e) => set('follow_up_2_template', e.target.value)}
            rows={4}
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-400">After</span>
            <input type="number" min={1} max={30} value={form.follow_up_2_days} onChange={(e) => set('follow_up_2_days', parseInt(e.target.value))}
              className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <span className="text-xs text-gray-400">days</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Daily Limit / Account: <span className="text-blue-600 font-bold">{form.daily_limit_per_account}</span>
          </label>
          <input
            type="range" min={5} max={25} step={1}
            value={form.daily_limit_per_account}
            onChange={(e) => set('daily_limit_per_account', parseInt(e.target.value))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5</span><span>25</span></div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Working Hours (IST)</label>
          <div className="flex items-center gap-2">
            <input type="time" value={form.working_hours_start} onChange={(e) => set('working_hours_start', e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
            <span className="text-gray-400 text-sm">to</span>
            <input type="time" value={form.working_hours_end} onChange={(e) => set('working_hours_end', e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Working Days</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map((day, i) => {
            const val = i + 1;
            const active = form.working_days.includes(val);
            return (
              <button key={day} onClick={() => toggleDay(val)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-400'}`}>
                {day}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button onClick={() => handleSubmit('draft')} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">
          <Save size={15} /> Save as Draft
        </button>
        <button onClick={() => handleSubmit('active')} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
          <Zap size={15} /> {saving ? 'Saving…' : 'Activate Campaign'}
        </button>
      </div>
    </div>
  );
}
