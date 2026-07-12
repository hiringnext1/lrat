// End-to-End User Journey Simulation and System Flow Audit
// This script simulates a full customer journey on LRAT without external network dependencies.

process.env.PORT = 4000;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_key_2026';

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Mocks configuration for external APIs
const mockUnipile = {
  getAccounts: async () => ({
    success: true,
    data: [{ 
      id: 'mock_unipile_acc_123', 
      name: 'E2E Recruiter Name', 
      username: 'e2e_recruiter', 
      public_identifier: 'recruiter-e2e-profile', 
      type: 'LINKEDIN',
      photo: 'https://placehold.co/100'
    }]
  }),
  getProfilesFromSearchURL: async (url, accountId, cursor = null) => {
    // Return a mock profile on the first batch, and empty on subsequent to stop pagination loop
    if (!cursor) {
      return {
        success: true,
        data: [{
          id: 'member_journey_candidate_abc',
          full_name: 'E2E Journey Candidate',
          headline: 'Senior Backend Architect',
          company_name: 'Antigravity Systems',
          job_title: 'Backend Architect',
          location: 'Bengaluru, India',
          profile_url: 'https://www.linkedin.com/in/journey-candidate',
          profile_picture_url: 'https://placehold.co/150'
        }],
        cursor: 'next_page_cursor_token'
      };
    } else {
      return {
        success: true,
        data: [],
        cursor: null
      };
    }
  },
  sendConnectionRequest: async (accountId, memberId, note) => {
    console.log(`[Mock Unipile] Connection request sent to ${memberId} with note: "${note}"`);
    return { success: true, data: { status: 'sent' } };
  },
  getNewAcceptances: async (accountId) => {
    return { success: true, data: [] };
  },
  sendMessage: async (accountId, memberId, messageText) => {
    console.log(`[Mock Unipile] Message sent to ${memberId}: "${messageText}"`);
    return { success: true, data: { status: 'message_sent' } };
  },
  getConversations: async (accountId) => {
    // Return a mock conversation with unread message
    return {
      success: true,
      data: [{
        unread_count: 1,
        attendee_provider_id: 'member_journey_candidate_abc',
        last_message_text: 'Yes, this looks very interesting! Let\'s schedule a call.',
        last_message_at: new Date().toISOString(),
        status: 'unseen'
      }]
    };
  },
  sendReply: async (chatId, messageText) => {
    console.log(`[Mock Unipile] Reply sent to chat ${chatId}: "${messageText}"`);
    return { success: true, data: { status: 'reply_sent' } };
  },
  viewProfile: async () => ({ success: true, data: {} }),
  getRecentPosts: async () => ({ success: true, data: [] }),
  deleteAccount: async () => ({ success: true })
};

const mockNvidia = {
  generateConnectionNote: async (lead) => ({
    success: true,
    data: `Hi ${lead.full_name.split(' ')[0]}, saw your impressive work at ${lead.company || 'your company'}. Let's connect!`
  }),
  generateJDMessage: async (lead, jdSummary) => ({
    success: true,
    data: `Hi ${lead.full_name.split(' ')[0]}, here is the opportunity summary: ${jdSummary}.`
  }),
  generateFollowUp: async (lead, followUpNumber) => ({
    success: true,
    data: `Hi ${lead.full_name.split(' ')[0]}, following up about the role.`
  }),
  generateAIReply: async (lead, conversationHistory, lastMessage) => ({
    success: true,
    data: [
      { type: 'schedule_call', text: `Hi ${lead.full_name.split(' ')[0]}, free next Tuesday at 3 PM?` }
    ]
  }),
  categorizeMessage: async (msg) => {
    if (msg.toLowerCase().includes('not') || msg.toLowerCase().includes('no')) return 'negative';
    return 'positive';
  },
  generateIcebreaker: async (lead) => ({ success: true, data: 'Great career path!' }),
  calculateFitScore: async (lead, jdSummary) => 88,
  generateAutoDraft: async (lead, lastMessage, jdTemplate) => ({
    success: true,
    data: `Hi ${lead.full_name.split(' ')[0]}, glad you are interested! Would love to schedule a call.`
  }),
  getAutoTags: async (lead, lastMessage) => ['Interested', 'High Fit']
};

// Inject Mocks in Node require cache before booting the server
require.cache[require.resolve('../backend/services/unipile')] = {
  id: require.resolve('../backend/services/unipile'),
  loaded: true,
  exports: mockUnipile
};
require.cache[require.resolve('../backend/services/nvidia')] = {
  id: require.resolve('../backend/services/nvidia'),
  loaded: true,
  exports: mockNvidia
};

// Boot local server
const { app } = require('../backend/server');
const { getDb } = require('../backend/config/database');
const { runSendConnections, runFlowExecution } = require('../backend/services/automation');

const db = getDb();

function logStage(name) {
  console.log(`\n\x1b[34m[STAGE]\x1b[0m ${name}`);
}

function logTestResult(name, passed, detail = '') {
  if (passed) {
    console.log(`  \x1b[32m✓\x1b[0m ${name} ${detail ? `(${detail})` : ''}`);
  } else {
    console.log(`  \x1b[31m❌\x1b[0m ${name} ${detail ? `(${detail})` : ''}`);
    process.exit(1);
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function executeJourney() {
  console.log('\n==================================================');
  console.log('🏁 STARTING END-TO-END USER JOURNEY AUDIT SIMULATION');
  console.log('==================================================');

  const testEmail = 'journey_user@lrat.com';
  const testPassword = 'Password123!';
  
  // Cleanup database of any test records
  db.prepare('DELETE FROM users WHERE email = ?').run(testEmail);

  let token = '';
  let authClient = null;
  let accountId = null;
  let campaignId = null;
  let leadId = null;

  try {
    // -------------------------------------------------------------------------
    logStage('1. User Registration & Sign Up');
    // -------------------------------------------------------------------------
    const signupRes = await axios.post('http://localhost:4000/api/auth/signup', {
      email: testEmail,
      password: testPassword,
      name: 'Journey User'
    });
    logTestResult('Sign Up API Response', signupRes.data.success === true, signupRes.data.message);

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
    logTestResult('User Exists in DB (Unverified)', !!user && user.is_verified === 0);

    const verifyRes = await axios.post('http://localhost:4000/api/auth/verify-signup', {
      email: testEmail,
      code: user.verification_code
    });
    token = verifyRes.data.token;
    logTestResult('Verify Sign Up & Login JWT Issued', !!token);

    authClient = axios.create({
      baseURL: 'http://localhost:4000/api',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const activeUser = db.prepare('SELECT * FROM users WHERE email = ?').get(testEmail);
    logTestResult('User Verified in DB', activeUser.is_verified === 1);


    // -------------------------------------------------------------------------
    logStage('2. LinkedIn Account Integration');
    // -------------------------------------------------------------------------
    const syncRes = await authClient.post('/accounts/sync');
    logTestResult('Sync LinkedIn Accounts API Response', syncRes.data.success === true, `Synced: ${syncRes.data.synced}`);

    const dbAccount = db.prepare('SELECT * FROM accounts WHERE user_id = ?').get(activeUser.id);
    accountId = dbAccount.id;
    logTestResult('LinkedIn Account Stored in DB', !!dbAccount, `Name: ${dbAccount.name}`);


    // -------------------------------------------------------------------------
    logStage('3. Visual Campaign Playbook Creation');
    // -------------------------------------------------------------------------
    const flowJson = {
      nodes: [
        { id: 'trigger-1', type: 'trigger', data: { label: 'Start Sequence', goal: 'hiring' } },
        { id: 'invite-1', type: 'invite', data: { label: 'Send Connection Request', note: 'Hi {{first_name}}, let\'s connect!', aiNote: false } },
        { id: 'delay-1', type: 'delay', data: { label: 'Wait', days: 1 } },
        { id: 'message-1', type: 'message', data: { label: 'Send Message', message: 'Hi {{first_name}}, here is the JD summary.' } },
        { id: 'end-1', type: 'end', data: { label: 'End Sequence' } }
      ],
      edges: [
        { id: 'e-1', source: 'trigger-1', target: 'invite-1' },
        { id: 'e-2', source: 'invite-1', target: 'delay-1' },
        { id: 'e-3', source: 'delay-1', target: 'message-1' },
        { id: 'e-4', source: 'message-1', target: 'end-1' }
      ]
    };

    const campaignRes = await authClient.post('/campaigns', {
      name: 'Visual E2E Playbook Campaign',
      status: 'draft',
      daily_limit_per_account: 20,
      working_days: [1,2,3,4,5],
      working_hours_start: '00:00', // Allow all-day during simulation
      working_hours_end: '23:59',
      flow_json: flowJson,
      jd_summary: 'We are hiring a Senior Developer'
    });
    campaignId = campaignRes.data.data.id;
    logTestResult('Campaign Playbook Created', campaignRes.data.success === true, `Campaign ID: ${campaignId}`);

    // Map Account to Campaign
    await authClient.post(`/campaigns/${campaignId}/accounts`, {
      account_ids: [accountId]
    });
    const campaignAccountsCount = db.prepare('SELECT COUNT(*) as c FROM campaign_accounts WHERE campaign_id = ?').get(campaignId).c;
    logTestResult('LinkedIn Account Linked to Campaign', campaignAccountsCount === 1);


    // -------------------------------------------------------------------------
    logStage('4. Sourcing & Lead Ingestion');
    // -------------------------------------------------------------------------
    // Call Search URL Import which runs background task to pull leads
    const importRes = await authClient.post('/leads/import/url', {
      search_url: 'https://www.linkedin.com/search/results/people/?keywords=architect',
      account_id: accountId,
      campaign_id: campaignId
    });
    logTestResult('Search URL Import API Dispatched', importRes.data.success === true, importRes.data.message);

    // Sleep briefly to let background sourcing loop pull leads from mock
    console.log('  Waiting for background sourcing loops to finish...');
    await sleep(2500);

    const dbLeads = db.prepare('SELECT * FROM leads WHERE campaign_id = ? AND user_id = ?').all(campaignId, activeUser.id);
    logTestResult('Leads Successfully Ingested', dbLeads.length > 0, `Imported: ${dbLeads.length} leads`);
    leadId = dbLeads[0].id;


    // -------------------------------------------------------------------------
    logStage('5. Campaign Activation & Connection Outbox');
    // -------------------------------------------------------------------------
    // Set campaign status to active
    await authClient.put(`/campaigns/${campaignId}`, {
      status: 'active'
    });
    
    // Bypass Enrichment View Requirement for testing connection scheduling
    db.prepare("UPDATE leads SET profile_viewed_at = ? WHERE campaign_id = ?").run(new Date(Date.now() - 60000).toISOString(), campaignId);

    console.log('  Running Connection Scheduler...');
    await runSendConnections();

    const leadAfterConnection = db.prepare('SELECT status, account_id_used, connection_sent_at FROM leads WHERE id = ?').get(leadId);
    logTestResult(
      'Outbox Action Executed',
      leadAfterConnection.status === 'connection_sent' && leadAfterConnection.account_id_used === accountId,
      `Status: ${leadAfterConnection.status}, Account ID: ${leadAfterConnection.account_id_used}`
    );


    // -------------------------------------------------------------------------
    logStage('6. Webhook Acceptance Event');
    // -------------------------------------------------------------------------
    const webhookRes = await axios.post('http://localhost:4000/api/webhooks/unipile', {
      event: 'relation.updated',
      account_id: 'mock_unipile_acc_123',
      data: {
        id: 'member_journey_candidate_abc',
        status: 'CONNECTED'
      }
    });
    logTestResult('Webhook Event Dispatched', webhookRes.data.success === true);

    const leadAfterAccept = db.prepare('SELECT status, accepted_at FROM leads WHERE id = ?').get(leadId);
    logTestResult(
      'Lead Status Transitioned to Connected',
      leadAfterAccept.status === 'connected' && !!leadAfterAccept.accepted_at,
      `Status: ${leadAfterAccept.status}, Accepted At: ${leadAfterAccept.accepted_at}`
    );


    // -------------------------------------------------------------------------
    logStage('7. Playbook Execution & Delay Timers');
    // -------------------------------------------------------------------------
    console.log('  Running Playbook Sequencer (First Pass — checking Delay)...');
    await runFlowExecution();

    const leadAfterFirstSeq = db.prepare('SELECT status, flow_executions FROM leads WHERE id = ?').get(leadId);
    const execsFirst = JSON.parse(leadAfterFirstSeq.flow_executions);
    // Delay node should not resolve yet since accepted_at is brand new (requires 1 day delay)
    const hasDelayNodeExecuted = execsFirst.some(e => e.node_id === 'delay-1');
    logTestResult('Delay Node Correctly Blocks Execution', !hasDelayNodeExecuted, `Executed nodes: ${execsFirst.map(e => e.node_id).join(', ')}`);

    // Advance Time: Set accepted_at and previous node invite-1 execution to 2 days ago
    console.log('  Simulating passage of 2 days...');
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('UPDATE leads SET accepted_at = ? WHERE id = ?').run(twoDaysAgo, leadId);
    
    const updatedExecs = execsFirst.map(e => ({ ...e, executed_at: twoDaysAgo }));
    db.prepare('UPDATE leads SET flow_executions = ? WHERE id = ?').run(JSON.stringify(updatedExecs), leadId);

    console.log('  Running Playbook Sequencer (Second Pass — resolving Delay)...');
    await runFlowExecution(); // Passes delay
    
    console.log('  Running Playbook Sequencer (Third Pass — executing Message)...');
    await runFlowExecution(); // Sends message

    const leadAfterMsg = db.prepare('SELECT status, flow_executions FROM leads WHERE id = ?').get(leadId);
    const execsSecond = JSON.parse(leadAfterMsg.flow_executions);
    const isMsgExecuted = execsSecond.some(e => e.node_id === 'message-1');
    logTestResult('Playbook Successfully Resolved Delay and Dispatched Message', isMsgExecuted && leadAfterMsg.status === 'jd_sent', `Status: ${leadAfterMsg.status}`);


    // -------------------------------------------------------------------------
    logStage('8. Candidate Reply Webhook (AI Analysis)');
    // -------------------------------------------------------------------------
    const replyWebhookRes = await axios.post('http://localhost:4000/api/webhooks/unipile', {
      event: 'message.received',
      account_id: 'mock_unipile_acc_123',
      data: {
        sender_id: 'member_journey_candidate_abc',
        text: 'This opportunity sounds great! Can we schedule a phone discussion?',
        is_from_me: false
      }
    });
    logTestResult('Reply Webhook Dispatched', replyWebhookRes.data.success === true);

    const leadAfterReply = db.prepare('SELECT status, reply_received, ai_sentiment, tags, ai_draft_reply, ai_draft_status FROM leads WHERE id = ?').get(leadId);
    const hasTags = JSON.parse(leadAfterReply.tags).includes('Interested');
    
    logTestResult(
      'AI Analysis & Draft Generated',
      leadAfterReply.status === 'replied' && 
      leadAfterReply.reply_received === 1 && 
      leadAfterReply.ai_sentiment === 'positive' && 
      hasTags && 
      leadAfterReply.ai_draft_status === 'pending_review' && 
      leadAfterReply.ai_draft_reply.length > 0,
      `Sentiment: ${leadAfterReply.ai_sentiment}, Tags: ${leadAfterReply.tags}, Draft: "${leadAfterReply.ai_draft_reply}"`
    );


    // -------------------------------------------------------------------------
    logStage('9. Inbox Verification & AI Draft Approval');
    // -------------------------------------------------------------------------
    const inboxRes = await authClient.get('/inbox/conversations');
    const matchedConv = inboxRes.data.data.find(c => c.lead && c.lead.id === leadId);
    logTestResult('Inbox Conversations Fetch', inboxRes.data.success === true && !!matchedConv, `Conversations count: ${inboxRes.data.data.length}`);

    // Approve the draft reply
    const approveRes = await authClient.post(`/inbox/conversations/mock_chat_id_123/approve-draft`, {
      lead_id: leadId,
      message: leadAfterReply.ai_draft_reply
    });
    logTestResult('Approve and Send AI Draft Response', approveRes.data.success === true);

    const leadFinal = db.prepare('SELECT ai_draft_status, ai_draft_reply FROM leads WHERE id = ?').get(leadId);
    logTestResult('Draft Cleared in Database', leadFinal.ai_draft_status === 'approved' && leadFinal.ai_draft_reply === '');


    // Clean up test data from DB
    db.prepare('DELETE FROM users WHERE id = ?').run(activeUser.id);
    db.prepare('DELETE FROM accounts WHERE user_id = ?').run(activeUser.id);
    db.prepare('DELETE FROM campaigns WHERE user_id = ?').run(activeUser.id);
    db.prepare('DELETE FROM leads WHERE user_id = ?').run(activeUser.id);
    db.prepare('DELETE FROM activity_log WHERE user_id = ?').run(activeUser.id);
    db.prepare('DELETE FROM sourcing_jobs WHERE user_id = ?').run(activeUser.id);

    console.log('\n==================================================');
    console.log('🎉 ALL END-TO-END SYSTEM FLOW AUDIT TESTS PASSED!');
    console.log('==================================================\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ E2E Journey Simulation Failed:', err.response?.data || err.message);
    process.exit(1);
  }
}

executeJourney();
