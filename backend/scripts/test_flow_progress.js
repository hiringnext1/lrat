const { buildSteps, getLeadProgress } = require('/Users/vishal/Desktop/Claude/Linkedin_Automate/lrat/backend/services/flowProgress');

// A realistic end-to-end campaign, exactly what the builder produces
const flow = JSON.stringify({
  nodes: [
    { id: 'trigger-1', type: 'trigger', data: {} },
    { id: 'view-1', type: 'view_profile', data: {} },
    { id: 'delay-view-1', type: 'delay', data: { days: 1, unit: 'days' } },
    { id: 'like-1', type: 'like_post', data: {} },
    { id: 'inv-1', type: 'invite', data: { aiNote: true } },
    { id: 'delay-inv-1', type: 'delay', data: { days: 1, unit: 'days' } },
    { id: 'msg-1', type: 'message', data: { aiMsg: true } },
    { id: 'delay-msg-1', type: 'delay', data: { days: 3, unit: 'days' } },
    { id: 'msg-2', type: 'message', data: { message: 'Following up…' } },
    { id: 'delay-msg-2', type: 'delay', data: { days: 4, unit: 'days' } },
    { id: 'msg-3', type: 'message', data: { message: 'Last check-in' } },
    { id: 'end-1', type: 'end', data: {} },
  ],
  edges: [
    { source: 'trigger-1', target: 'view-1' },
    { source: 'view-1', target: 'delay-view-1' },
    { source: 'delay-view-1', target: 'like-1' },
    { source: 'like-1', target: 'inv-1' },
    { source: 'inv-1', target: 'delay-inv-1' },
    { source: 'delay-inv-1', target: 'msg-1' },
    { source: 'msg-1', target: 'delay-msg-1' },
    { source: 'delay-msg-1', target: 'msg-2' },
    { source: 'msg-2', target: 'delay-msg-2' },
    { source: 'delay-msg-2', target: 'msg-3' },
    { source: 'msg-3', target: 'end-1' },
  ],
});

const steps = buildSteps(flow);
console.log('── STEPS (board ke columns) ──');
steps.filter(s => s.is_stage).forEach((s, i) => console.log(`   ${i + 1}. ${s.label}`));

const ago = (h) => new Date(Date.now() - h * 3600000).toISOString();
const execs = (...ids) => JSON.stringify(ids.map(([id, h]) => ({ node_id: id, executed_at: ago(h) })));

const cases = [
  ['abhi import hua, kuch nahi hua', { status: 'pending_connection', flow_executions: '[]' }, 'ready', 'Profile view'],
  ['profile view hua, 1 din ka wait', { status: 'pending_connection', flow_executions: execs(['view-1', 2]) }, 'waiting_delay', 'Waiting for post like'],
  ['delay khatam, like ki baari', { status: 'pending_connection', flow_executions: execs(['view-1', 30], ['delay-view-1', 1]) }, 'ready', 'Post like'],
  ['invite gaya, accept nahi hua', { status: 'connection_sent', connection_sent_at: ago(120), flow_executions: execs(['view-1', 200], ['delay-view-1', 170], ['like-1', 150], ['inv-1', 120]) }, 'waiting_acceptance', 'Waiting for acceptance'],
  ['accept hua, pehle message ka wait', { status: 'connected', accepted_at: ago(5), connection_sent_at: ago(120), flow_executions: execs(['view-1', 200], ['delay-view-1', 170], ['like-1', 150], ['inv-1', 120]) }, 'waiting_delay', 'Waiting for first message'],
  ['pehla msg gaya, follow-up 1 ka wait', { status: 'jd_sent', accepted_at: ago(50), flow_executions: execs(['view-1', 200], ['delay-view-1', 190], ['like-1', 185], ['inv-1', 180], ['delay-inv-1', 45], ['msg-1', 40]) }, 'waiting_delay', 'Waiting for follow-up 1'],
  ['follow-up 2 bhi gaya, sequence khatam', { status: 'follow_up_sent', flow_executions: execs(['view-1', 400], ['delay-view-1', 390], ['like-1', 380], ['inv-1', 370], ['delay-inv-1', 300], ['msg-1', 290], ['delay-msg-1', 200], ['msg-2', 190], ['delay-msg-2', 100], ['msg-3', 90], ['end-1', 89]) }, 'done', 'Sequence complete'],
  ['ROBUSTNESS: beech ka delay record missing', { status: 'jd_sent', accepted_at: ago(50), flow_executions: execs(['view-1', 200], ['like-1', 185], ['inv-1', 180], ['msg-1', 40]) }, 'waiting_delay', 'Waiting for follow-up 1'],
  ['reply aa gaya', { status: 'replied', reply_received_at: ago(1), flow_executions: execs(['inv-1', 100]) }, 'closed', 'Replied'],
  ['not interested', { status: 'not_interested', flow_executions: '[]' }, 'closed', 'Not interested'],
];


console.log('\n── LEAD PROGRESS ──');
let pass = 0;
for (const [label, lead, expectState, expectLabel] of cases) {
  const p = getLeadProgress(lead, steps);
  const ok = p.state === expectState && (!expectLabel || p.label === expectLabel);
  if (ok) pass++;
  const until = p.until ? ` → ${new Date(p.until).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : '';
  console.log(`   ${ok ? '✓' : '✗'} ${label.padEnd(38)} → [${p.state}] "${p.label}"${until}  next: ${p.next || '—'}  (${p.index}/${p.total})`);
}

// campaign without a visual flow (legacy)
const legacy = getLeadProgress({ status: 'connection_sent', flow_executions: '[]' }, buildSteps('{}'));
const legacyOk = legacy.state === 'no_flow';
if (legacyOk) pass++;
console.log(`   ${legacyOk ? '✓' : '✗'} ${'legacy campaign (koi flow nahi)'.padEnd(38)} → [${legacy.state}] "${legacy.label}"`);

console.log(`\n${pass}/${cases.length + 1} pass`);
