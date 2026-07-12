const { getDb } = require('../backend/config/database');
const safety = require('../backend/services/safety');

const db = getDb();
console.log('Testing resetDailyCountsIfNeeded...');
try {
  const resetCount = safety.resetDailyCountsIfNeeded(db);
  console.log('Success! Reset count:', resetCount);
} catch (err) {
  console.error('Error during reset test:', err);
}
process.exit(0);
