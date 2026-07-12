const { getDb } = require('../backend/config/database');
const unipile = require('../backend/services/unipile');

async function testRelations() {
  const db = getDb();
  const accounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND status = 'active'").all();
  console.log(`Found ${accounts.length} active accounts.`);
  for (const account of accounts) {
    console.log(`Fetching relations for account: ${account.name} (unipile_id: ${account.unipile_account_id})`);
    const result = await unipile.getNewAcceptances(account.unipile_account_id);
    console.log(`Success: ${result.success}`);
    if (result.success) {
      console.log(`Total relations: ${result.data ? result.data.length : 0}`);
      if (result.data && result.data.length > 0) {
        console.log(`First relation preview:`, JSON.stringify(result.data[0], null, 2));
      }
    } else {
      console.error(`Error:`, result.error);
    }
  }
}

testRelations();
