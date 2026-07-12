const { runSendConnections } = require('./services/automation');
const { getDb, loadSettingsIntoEnv } = require('./config/database');

async function trigger() {
  console.log('--- MANUAL AUTOMATION TRIGGER START ---');
  try {
    getDb();
    loadSettingsIntoEnv();
    console.log('[1] Database & Settings Loaded');
    
    console.log('[2] Starting Connection Requests...');
    await runSendConnections();
    
    console.log('--- TRIGGER FINISHED ---');
    process.exit(0);
  } catch (err) {
    console.error('Trigger Failed:', err.message);
    process.exit(1);
  }
}

trigger();
