const { getDb } = require('../backend/config/database');
const unipile = require('../backend/services/unipile');
const aiService = require('../backend/services/nvidia');

async function debugAcceptances() {
  const db = getDb();
  try {
    const activeAccounts = db.prepare("SELECT * FROM accounts WHERE is_active = 1 AND status = 'active'").all();
    console.log(`Active accounts: ${activeAccounts.length}`);
    for (const account of activeAccounts) {
      console.log(`Checking account: ${account.name} (${account.unipile_account_id})`);
      const result = await unipile.getNewAcceptances(account.unipile_account_id);
      console.log(`getNewAcceptances success: ${result.success}`);
      if (!result.success || !result.data) {
        console.log(`Failed or no data:`, result.error);
        continue;
      }
      
      let acceptedList = [];
      if (Array.isArray(result.data)) {
        acceptedList = result.data;
      } else if (result.data) {
        acceptedList = result.data.items || result.data.accounts || result.data.relations || [];
      }
      
      console.log(`acceptedList length: ${acceptedList.length}`);
      
      for (const item of acceptedList) {
        const memberId = item.member_id || item.provider_id || item.id;
        console.log(`Checking item: ${item.first_name} ${item.last_name}, memberId: ${memberId}`);
        const lead = db.prepare("SELECT * FROM leads WHERE linkedin_member_id = ? AND status = 'connection_sent'").get(memberId);
        if (!lead) {
          console.log(`Lead not found in DB with connection_sent status for memberId: ${memberId}`);
          continue;
        }
        if (lead.reply_received) {
          console.log(`Lead reply_received is true: ${lead.full_name}`);
          continue;
        }
        
        console.log(`Found matching lead: ${lead.full_name}, status: ${lead.status}, campaign_id: ${lead.campaign_id}`);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(lead.campaign_id);
        if (!campaign) {
          console.log(`Campaign not found for ID: ${lead.campaign_id}`);
          continue;
        }
        
        console.log(`Campaign flow_json: ${campaign.flow_json}`);
        const flow = JSON.parse(campaign.flow_json || '{}');
        const hasVisualFlow = flow.nodes && flow.nodes.length > 0;
        console.log(`hasVisualFlow: ${hasVisualFlow}`);
        const now = new Date().toISOString();

        if (hasVisualFlow) {
          console.log(`Processing with visual flow...`);
          // Note: we can run the queries but let's see why it wasn't running
        } else {
          console.log(`Processing with legacy fallback (sending message)...`);
          const firstName = (lead.full_name || '').split(' ')[0];
          let jdText = campaign.jd_message_template || '';
          console.log(`jdText preview: "${jdText.slice(0, 50)}"`);
        }
      }
    }
  } catch (err) {
    console.error('Error in debugAcceptances:', err);
  }
}

debugAcceptances();
