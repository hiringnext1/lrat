const { getDb } = require('../backend/config/database');
const unipile = require('../backend/services/unipile');

async function testConversations() {
  const db = getDb();
  const accounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND status = 'active'").all();
  console.log(`Found ${accounts.length} active accounts.`);
  for (const account of accounts) {
    console.log(`Fetching conversations for account: ${account.name} (unipile_id: ${account.unipile_account_id})`);
    const result = await unipile.getConversations(account.unipile_account_id);
    console.log(`Success: ${result.success}`);
    if (result.success) {
      console.log(`Total conversations: ${result.data ? result.data.length : 0}`);
      if (result.data && result.data.length > 0) {
        console.log(`First conversation preview:`, JSON.stringify(result.data[0], null, 2));
      }
    } else {
      console.error(`Error:`, result.error);
    }
  }
}

testConversations();
