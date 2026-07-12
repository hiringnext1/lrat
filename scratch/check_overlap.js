const { getDb } = require('../backend/config/database');
const unipile = require('../backend/services/unipile');

async function checkOverlap() {
  const db = getDb();
  const accounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND status = 'active'").all();
  const sentLeads = db.prepare("SELECT id, full_name, linkedin_member_id FROM leads WHERE status = 'connection_sent'").all();
  const sentIds = new Set(sentLeads.map(l => l.linkedin_member_id).filter(Boolean));
  console.log(`We have ${sentIds.size} sent leads with linkedin_member_id.`);
  
  for (const account of accounts) {
    const result = await unipile.getNewAcceptances(account.unipile_account_id);
    if (result.success && result.data) {
      console.log(`Unipile has ${result.data.length} relations.`);
      let matches = [];
      for (const item of result.data) {
        const mid = item.member_id || item.provider_id || item.id;
        if (sentIds.has(mid)) {
          const lead = sentLeads.find(l => l.linkedin_member_id === mid);
          matches.push({ name: lead.full_name, member_id: mid });
        }
      }
      console.log(`Matches in relations:`, matches);
    }
  }
}

checkOverlap();
