const axios = require('axios');
const { loadSettingsIntoEnv, getSetting } = require('../backend/config/database');

loadSettingsIntoEnv();

const apiKey = getSetting('UNIPILE_API_KEY');
const dsn = getSetting('UNIPILE_DSN');

console.log('Using DSN:', dsn);
console.log('Using API key (last 4):', apiKey.slice(-4));

const expiresOn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const requestBody = {
  type: 'create',
  providers: ['LINKEDIN'],
  api_url: dsn,
  expiresOn: expiresOn,
  success_redirect_url: 'http://localhost:5173/accounts?connected=1',
  failure_redirect_url: 'http://localhost:5173/accounts?connected=0',
  notify_url: 'http://localhost:5173/api/accounts/webhook',
  name: 'LRAT LinkedIn Account',
};

axios.post(`${dsn}/api/v1/hosted/accounts/link`, requestBody, {
  headers: {
    'X-API-KEY': apiKey,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
}).then(res => {
  console.log('Success:', res.data);
}).catch(err => {
  console.error('Error Status:', err.response?.status);
  console.error('Error Data:', err.response?.data || err.message);
});
