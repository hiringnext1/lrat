/**
 * Works out where a lead currently sits inside its campaign's visual flow.
 *
 * This deliberately mirrors the walk in services/automation.js
 * (runFlowExecution + executeFlowNode) — same edge map, same invite gate, same
 * delay base time. If that engine changes, change this too, or the CRM will
 * describe a different reality than the one the engine is acting on.
 *
 * Everything here is read-only and additive: it never writes to a lead.
 */

function safeParse(value, fallback) {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (_) {
    return fallback;
  }
}

/** Steps a user actually configured, in execution order, with readable labels. */
function buildSteps(flowJson) {
  const flow = safeParse(flowJson, {});
  if (!flow.nodes || flow.nodes.length === 0) return [];

  const nodeMap = {};
  flow.nodes.forEach(n => { nodeMap[n.id] = n; });
  const edgeMap = {};
  (flow.edges || []).forEach(e => { edgeMap[e.source] = e.target; });

  const trigger = flow.nodes.find(n => n.type === 'trigger');
  if (!trigger) return [];

  const steps = [];
  let messageCount = 0;
  let currentId = edgeMap[trigger.id];
  let guard = 0;

  while (currentId && guard++ < 100) {
    const node = nodeMap[currentId];
    if (!node) break;

    let label;
    switch (node.type) {
      case 'invite': label = 'Connection request'; break;
      case 'view_profile': label = 'Profile view'; break;
      case 'like_post': label = 'Post like'; break;
      case 'tag': label = node.data?.tagName ? `Tag: ${node.data.tagName}` : 'Tag'; break;
      case 'message':
        messageCount += 1;
        label = messageCount === 1 ? 'First message' : `Follow-up ${messageCount - 1}`;
        break;
      case 'delay': label = 'Waiting'; break;
      case 'condition': label = 'Condition'; break;
      case 'end': label = 'Sequence complete'; break;
      default: label = node.type;
    }

    steps.push({
      node_id: node.id,
      type: node.type,
      label,
      // delay/condition/tag aren't outreach the user watches for — they're
      // states between the steps that matter
      is_stage: ['invite', 'view_profile', 'like_post', 'message', 'end'].includes(node.type),
      wait: node.type === 'delay'
        ? { amount: node.data?.days ?? 1, unit: node.data?.unit || 'days' }
        : null,
    });

    currentId = edgeMap[node.id];
  }

  return steps;
}

const TERMINAL_STATUS = {
  replied: 'Replied',
  not_interested: 'Not interested',
  shortlisted: 'Qualified',
  completed: 'Sequence complete',
};

/**
 * @returns {{stage_id: string|null, label: string, state: string, since: string|null,
 *            next: string|null, index: number|null, total: number}}
 *   state: closed | waiting_acceptance | waiting_delay | ready | done | no_flow
 */
function getLeadProgress(lead, steps) {
  const total = steps.filter(s => s.is_stage && s.type !== 'end').length;

  if (TERMINAL_STATUS[lead.status]) {
    return {
      stage_id: null,
      label: TERMINAL_STATUS[lead.status],
      state: 'closed',
      since: lead.reply_received_at || lead.updated_at || null,
      next: null,
      index: null,
      total,
    };
  }

  if (steps.length === 0) {
    return { stage_id: null, label: 'No sequence configured', state: 'no_flow', since: null, next: null, index: null, total: 0 };
  }

  const execMap = {};
  safeParse(lead.flow_executions, []).forEach(e => { execMap[e.node_id] = e; });

  // flow_executions is not the only proof a step ran. Leads invited by the
  // legacy sender (or imported before the flow existed) carry no execution
  // record at all, and without this they were reported as "next: connection
  // request" while already sitting in Connected.
  const pastInvite = !!(lead.connection_sent_at || lead.account_id_used)
    || ['connected', 'jd_sent', 'follow_up_sent'].includes(lead.status);
  let firstMessageSeen = false;

  const executed = (step) => {
    if (execMap[step.node_id]) return execMap[step.node_id];
    if (step.type === 'invite' && pastInvite) {
      return { node_id: step.node_id, executed_at: lead.connection_sent_at || lead.updated_at, implied: true };
    }
    // The first message node is provably done when jd_sent_at is set; later
    // follow-ups can only be told apart by their own execution records.
    if (step.type === 'message' && !firstMessageSeen && lead.jd_sent_at) {
      return { node_id: step.node_id, executed_at: lead.jd_sent_at, implied: true };
    }
    return null;
  };

  // Work from the FURTHEST step the lead actually reached, not the first gap.
  // A missing intermediate record (flow edited, older lead) would otherwise
  // park the lead on a step it is long past.
  let lastIdx = -1;
  for (let i = 0; i < steps.length; i++) {
    const done = executed(steps[i]);
    if (done) {
      execMap[steps[i].node_id] = done; // so the delay base time can use it
      lastIdx = i;
    }
    if (steps[i].type === 'message') firstMessageSeen = true;
  }

  const stagesUpTo = (i) => steps.slice(0, i + 1).filter(s => s.is_stage && s.type !== 'end').length;
  const nextStageAfter = (i) => steps.slice(i + 1).find(s => s.is_stage) || null;

  // Executed the invite but LinkedIn hasn't accepted yet — the engine parks here
  const lastStep = lastIdx >= 0 ? steps[lastIdx] : null;
  const invitePending = ['connection_sent', 'pending_connection'].includes(lead.status);
  const inviteIdx = steps.findIndex(s => s.type === 'invite');
  if (inviteIdx >= 0 && execMap[steps[inviteIdx].node_id] && invitePending) {
    const nextStage = nextStageAfter(inviteIdx);
    return {
      stage_id: steps[inviteIdx].node_id,
      label: 'Waiting for acceptance',
      state: 'waiting_acceptance',
      since: lead.connection_sent_at || execMap[steps[inviteIdx].node_id].executed_at || null,
      next: nextStage ? nextStage.label : null,
      next_stage_id: nextStage ? nextStage.node_id : null,
      index: stagesUpTo(inviteIdx),
      total,
    };
  }

  const upcoming = steps[lastIdx + 1];
  if (!upcoming) {
    return {
      stage_id: lastStep ? lastStep.node_id : null,
      label: 'Sequence complete',
      state: 'done',
      since: lastStep ? execMap[lastStep.node_id].executed_at : (lead.updated_at || null),
      next: null,
      index: total,
      total,
    };
  }

  const nextStage = upcoming.type === 'delay' ? nextStageAfter(lastIdx + 1) : upcoming;
  const nextLabel = nextStage ? nextStage.label : null;

  if (upcoming.type === 'delay') {
    // Same base time the engine uses: the previous non-delay step, or the
    // acceptance time when that step was the invite
    let prev = null;
    for (let j = lastIdx; j >= 0; j--) {
      if (steps[j].type !== 'delay') { prev = steps[j]; break; }
    }
    const prevExec = prev ? execMap[prev.node_id] : null;
    let base = prevExec ? new Date(prevExec.executed_at).getTime() : null;
    if (prev && prev.type === 'invite' && lead.accepted_at) base = new Date(lead.accepted_at).getTime();

    const waitMs = upcoming.wait.unit === 'hours'
      ? upcoming.wait.amount * 60 * 60 * 1000
      : upcoming.wait.amount * 24 * 60 * 60 * 1000;

    return {
      stage_id: upcoming.node_id,
      label: nextLabel ? `Waiting for ${nextLabel.toLowerCase()}` : 'Waiting',
      state: 'waiting_delay',
      since: base ? new Date(base).toISOString() : null,
      until: base ? new Date(base + waitMs).toISOString() : null,
      next: nextLabel,
      next_stage_id: nextStage ? nextStage.node_id : null,
      index: stagesUpTo(lastIdx),
      total,
    };
  }

  return {
    stage_id: upcoming.node_id,
    label: upcoming.label,
    state: 'ready',
    since: lastStep ? execMap[lastStep.node_id].executed_at : (lead.updated_at || lead.created_at || null),
    next: (nextStageAfter(lastIdx + 1) || {}).label || null,
    next_stage_id: (nextStageAfter(lastIdx + 1) || {}).node_id || null,
    index: stagesUpTo(lastIdx + 1),
    total,
  };
}

/**
 * Attaches `current_step` to a list of leads, loading each campaign's flow once.
 * @param {object} db better-sqlite3 handle
 */
function attachProgress(db, leads) {
  if (!Array.isArray(leads) || leads.length === 0) return leads;

  const stepCache = new Map();
  const getSteps = (campaignId) => {
    if (!campaignId) return [];
    if (!stepCache.has(campaignId)) {
      const row = db.prepare('SELECT flow_json FROM campaigns WHERE id = ?').get(campaignId);
      stepCache.set(campaignId, buildSteps(row?.flow_json));
    }
    return stepCache.get(campaignId);
  };

  for (const lead of leads) {
    try {
      lead.current_step = getLeadProgress(lead, getSteps(lead.campaign_id));
    } catch (_) {
      lead.current_step = null; // never let this break the leads list
    }
  }
  return leads;
}

module.exports = { buildSteps, getLeadProgress, attachProgress };
