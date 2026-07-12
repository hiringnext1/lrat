const { getDb } = require('../backend/config/database');
const { runCheckAcceptances, runCheckReplies } = require('../backend/services/automation');

async function runSync() {
  console.log('Starting manual sync to test acceptances...');
  const db = getDb();
  
  // Log count of connection_sent leads before sync
  const sentBefore = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'connection_sent'").get().count;
  const connectedBefore = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'connected'").get().count;
  const jdSentBefore = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'jd_sent'").get().count;
  console.log(`Before Sync: connection_sent=${sentBefore}, connected=${connectedBefore}, jd_sent=${jdSentBefore}`);
  
  // Execute check
  await runCheckAcceptances();
  await runCheckReplies();
  
  // Log count of leads after sync
  const sentAfter = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'connection_sent'").get().count;
  const connectedAfter = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'connected'").get().count;
  const jdSentAfter = db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'jd_sent'").get().count;
  console.log(`After Sync: connection_sent=${sentAfter}, connected=${connectedAfter}, jd_sent=${jdSentAfter}`);
  
  if (connectedAfter !== connectedBefore || jdSentAfter !== jdSentBefore) {
    console.log('SUCCESS: Some leads were successfully updated to connected/jd_sent!');
  } else {
    console.log('No new acceptances detected from relations (they might already be in sync, or none accepted yet).');
  }
}

runSync();
