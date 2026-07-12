const { getDb } = require('../backend/config/database');

function checkLeads() {
  const db = getDb();
  const leads = db.prepare("SELECT id, full_name, linkedin_member_id, status FROM leads WHERE status = 'connection_sent' LIMIT 10").all();
  console.log(`Leads with status='connection_sent':`, JSON.stringify(leads, null, 2));
}

checkLeads();
