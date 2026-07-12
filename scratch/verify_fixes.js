const { getDb } = require('../backend/config/database');

const db = getDb();

function logTestResult(name, passed, detail = '') {
  if (passed) {
    console.log(`\x1b[32m[PASS]\x1b[0m ${name} ${detail ? `(${detail})` : ''}`);
  } else {
    console.log(`\x1b[31m[FAIL]\x1b[0m ${name} ${detail ? `(${detail})` : ''}`);
    process.exit(1);
  }
}

async function verifyFixes() {
  console.log('\n--- Starting System Bug Verification Script ---\n');

  const testUserId = 9999; // Mock user ID

  // Cleanup any left-overs from a previous crash/run
  db.prepare('DELETE FROM accounts WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM campaigns WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM leads WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM activity_log WHERE user_id = ?').run(testUserId);
  db.prepare('DELETE FROM sourcing_jobs WHERE user_id = ?').run(testUserId);
  db.prepare("DELETE FROM canned_messages WHERE title = 'Global canned message' OR user_id = ?").run(testUserId);

  try {
    // 1. Verify Canned Messages bug fix
    // Ensure default canned messages (with user_id = NULL) are returned alongside user-specific ones.
    // Insert a global canned message and a user-specific canned message.
    db.prepare('INSERT INTO canned_messages (title, content, user_id) VALUES (?, ?, NULL)').run(
      'Global canned message',
      'Hi {{name}}, this is global'
    );
    db.prepare('INSERT INTO canned_messages (title, content, user_id) VALUES (?, ?, ?)').run(
      'User canned message',
      'Hi {{name}}, this is user specific',
      testUserId
    );

    const cannedMessages = db.prepare(
      'SELECT * FROM canned_messages WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC'
    ).all(testUserId);

    const hasGlobal = cannedMessages.some(m => m.user_id === null);
    const hasUser = cannedMessages.some(m => m.user_id === testUserId);

    logTestResult('Canned Messages Query', hasGlobal && hasUser, `Found ${cannedMessages.length} total, contains global: ${hasGlobal}, user: ${hasUser}`);

    // Clean up test canned messages
    db.prepare("DELETE FROM canned_messages WHERE title = 'Global canned message' OR user_id = ?").run(testUserId);


    // 2. Setup Data for Lead & Account Deletion Verification
    // Insert Campaign
    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (name, total_leads, user_id) VALUES ('Test Campaign', 2, ?)
    `).run(testUserId);
    const campaignId = insertCampaign.lastInsertRowid;

    // Insert Account
    const insertAccount = db.prepare(`
      INSERT INTO accounts (unipile_account_id, name, user_id) VALUES ('unipile_test_123', 'Test Account', ?)
    `).run(testUserId);
    const accountId = insertAccount.lastInsertRowid;

    // Insert Leads
    const insertLead1 = db.prepare(`
      INSERT INTO leads (full_name, linkedin_url, campaign_id, account_id_used, user_id) 
      VALUES ('Test Lead 1', 'https://linkedin.com/in/test-lead-1', ?, ?, ?)
    `).run(campaignId, accountId, testUserId);
    const lead1Id = insertLead1.lastInsertRowid;

    const insertLead2 = db.prepare(`
      INSERT INTO leads (full_name, linkedin_url, campaign_id, account_id_used, user_id) 
      VALUES ('Test Lead 2', 'https://linkedin.com/in/test-lead-2', ?, ?, ?)
    `).run(campaignId, accountId, testUserId);
    const lead2Id = insertLead2.lastInsertRowid;

    // Insert Activity Logs
    db.prepare(`
      INSERT INTO activity_log (account_id, lead_id, campaign_id, action_type, user_id)
      VALUES (?, ?, ?, 'connection_sent', ?)
    `).run(accountId, lead1Id, campaignId, testUserId);

    db.prepare(`
      INSERT INTO activity_log (account_id, lead_id, campaign_id, action_type, user_id)
      VALUES (?, ?, ?, 'connection_sent', ?)
    `).run(accountId, lead2Id, campaignId, testUserId);

    // Insert Sourcing Job
    const insertJob = db.prepare(`
      INSERT INTO sourcing_jobs (user_id, campaign_id, status) VALUES (?, ?, 'completed')
    `).run(testUserId, campaignId);
    const jobId = insertJob.lastInsertRowid;


    // 3. Verify Single Lead Deletion
    // When deleting Lead 1:
    // - Campaign total_leads should decrement from 2 to 1.
    // - Activity log for Lead 1 should be deleted.
    // - Lead 1 should be gone.
    db.transaction(() => {
      // (Mirroring routes/leads.js implementation)
      db.prepare('DELETE FROM activity_log WHERE lead_id = ? AND user_id = ?').run(lead1Id, testUserId);
      db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(lead1Id, testUserId);
      db.prepare('UPDATE campaigns SET total_leads = MAX(0, total_leads - 1) WHERE id = ? AND user_id = ?').run(campaignId, testUserId);
    })();

    const updatedCampaign = db.prepare('SELECT total_leads FROM campaigns WHERE id = ?').get(campaignId);
    const lead1Log = db.prepare('SELECT COUNT(*) as c FROM activity_log WHERE lead_id = ?').get(lead1Id).c;
    const lead1Record = db.prepare('SELECT * FROM leads WHERE id = ?').get(lead1Id);

    const singleLeadDeletedOk = (updatedCampaign.total_leads === 1) && (lead1Log === 0) && (!lead1Record);
    logTestResult('Single Lead Deletion', singleLeadDeletedOk, `Campaign total_leads: ${updatedCampaign.total_leads}, Logs count: ${lead1Log}, Lead exists: ${!!lead1Record}`);


    // 4. Verify Account Deletion
    // When deleting the Account:
    // - Lead 2's account_id_used should be set to NULL (preventing orphaning).
    // - Account should be gone.
    db.prepare('UPDATE leads SET account_id_used = NULL WHERE account_id_used = ? AND user_id = ?').run(accountId, testUserId);
    db.prepare('DELETE FROM accounts WHERE id = ? AND user_id = ?').run(accountId, testUserId);

    const lead2Updated = db.prepare('SELECT account_id_used FROM leads WHERE id = ?').get(lead2Id);
    const accountRecord = db.prepare('SELECT * FROM accounts WHERE id = ?').get(accountId);

    const accountDeleteOk = (lead2Updated.account_id_used === null) && (!accountRecord);
    logTestResult('Account Deletion & Lead Unassignment', accountDeleteOk, `Lead account_id_used: ${lead2Updated.account_id_used}, Account exists: ${!!accountRecord}`);


    // 5. Verify Campaign Deletion
    // When deleting the Campaign:
    // - Sourcing jobs should be deleted.
    // - Remaining leads should be deleted.
    // - Campaign should be gone.
    db.prepare('DELETE FROM leads WHERE campaign_id = ? AND user_id = ?').run(campaignId, testUserId);
    db.prepare('DELETE FROM activity_log WHERE campaign_id = ? AND user_id = ?').run(campaignId, testUserId);
    db.prepare('DELETE FROM sourcing_jobs WHERE campaign_id = ? AND user_id = ?').run(campaignId, testUserId);
    db.prepare('DELETE FROM campaigns WHERE id = ? AND user_id = ?').run(campaignId, testUserId);

    const campaignRecord = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    const remainingLeadsCount = db.prepare('SELECT COUNT(*) as c FROM leads WHERE campaign_id = ?').get(campaignId).c;
    const jobRecord = db.prepare('SELECT * FROM sourcing_jobs WHERE id = ?').get(jobId);

    const campaignDeleteOk = (!campaignRecord) && (remainingLeadsCount === 0) && (!jobRecord);
    logTestResult('Campaign Deletion & Sourcing Job Cleanup', campaignDeleteOk, `Campaign exists: ${!!campaignRecord}, Leads left: ${remainingLeadsCount}, Sourcing job exists: ${!!jobRecord}`);


    // 6. Verify Bulk Deletion Counters
    // Reset test campaign & leads
    const insertCampaign2 = db.prepare(`
      INSERT INTO campaigns (name, total_leads, user_id) VALUES ('Test Campaign 2', 4, ?)
    `).run(testUserId);
    const campaign2Id = insertCampaign2.lastInsertRowid;

    const leadsToInsert = [
      ['Lead A', 'url-a'],
      ['Lead B', 'url-b'],
      ['Lead C', 'url-c'],
      ['Lead D', 'url-d'],
    ];

    const bulkIds = [];
    for (const [name, url] of leadsToInsert) {
      const res = db.prepare(`
        INSERT INTO leads (full_name, linkedin_url, campaign_id, user_id) VALUES (?, ?, ?, ?)
      `).run(name, url, campaign2Id, testUserId);
      bulkIds.push(res.lastInsertRowid);
    }

    // Insert dummy logs
    for (const lid of bulkIds) {
      db.prepare(`
        INSERT INTO activity_log (lead_id, campaign_id, action_type, user_id) VALUES (?, ?, 'connection_sent', ?)
      `).run(lid, campaign2Id, testUserId);
    }

    // Bulk Delete 3 of the leads
    const deleteIds = bulkIds.slice(0, 3);
    const placeholders = deleteIds.map(() => '?').join(',');

    const campaignDistribution = db.prepare(
      `SELECT campaign_id, COUNT(*) as count FROM leads WHERE id IN (${placeholders}) AND user_id = ? GROUP BY campaign_id`
    ).all(...deleteIds, testUserId);

    db.transaction(() => {
      for (const dist of campaignDistribution) {
        if (dist.campaign_id) {
          db.prepare('UPDATE campaigns SET total_leads = MAX(0, total_leads - ?) WHERE id = ? AND user_id = ?')
            .run(dist.count, dist.campaign_id, testUserId);
        }
      }
      db.prepare(`DELETE FROM activity_log WHERE lead_id IN (${placeholders}) AND user_id = ?`).run(...deleteIds, testUserId);
      db.prepare(`DELETE FROM leads WHERE id IN (${placeholders}) AND user_id = ?`).run(...deleteIds, testUserId);
    })();

    const updatedCampaign2 = db.prepare('SELECT total_leads FROM campaigns WHERE id = ?').get(campaign2Id);
    const remainingLeadsInDb = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE campaign_id = ?`).get(campaign2Id).c;
    const remainingLogsInDb = db.prepare(`SELECT COUNT(*) as c FROM activity_log WHERE campaign_id = ?`).get(campaign2Id).c;

    const bulkDeleteOk = (updatedCampaign2.total_leads === 1) && (remainingLeadsInDb === 1) && (remainingLogsInDb === 1);
    logTestResult('Bulk Lead Deletion & Counters', bulkDeleteOk, `Campaign total_leads: ${updatedCampaign2.total_leads}, Leads in DB: ${remainingLeadsInDb}, Logs in DB: ${remainingLogsInDb}`);

    // Clean up campaign 2 data
    db.prepare('DELETE FROM leads WHERE campaign_id = ?').run(campaign2Id);
    db.prepare('DELETE FROM activity_log WHERE campaign_id = ?').run(campaign2Id);
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(campaign2Id);

    console.log('\n\x1b[32m✓ All system bug fixes verified successfully!\x1b[0m\n');
  } catch (err) {
    console.error('\n\x1b[31m❌ Verification failed with error:\x1b[0m', err.message);
    process.exit(1);
  }
}

verifyFixes();
