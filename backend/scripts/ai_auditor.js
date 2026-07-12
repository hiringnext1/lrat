#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Database = require('better-sqlite3');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function getApiKey() {
  if (process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY !== 'nvapi-final-test') {
    return process.env.NVIDIA_API_KEY;
  }
  try {
    const dbPath = path.join(__dirname, '../db/lrat.db');
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath);
      const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('NVIDIA_API_KEY');
      if (row && row.value && row.value !== 'nvapi-final-test') {
        return row.value.trim();
      }
    }
  } catch (e) {
    // Silent fail, fallback to null
  }
  return null;
}

const targetFileArg = process.argv[2];

if (!targetFileArg) {
  console.log(`${YELLOW}${BOLD}Usage:${RESET} node scripts/ai_auditor.js <file_path_relative_to_backend>`);
  console.log(`Example: node scripts/ai_auditor.js services/automation.js`);
  process.exit(1);
}

const targetFilePath = path.isAbsolute(targetFileArg) 
  ? targetFileArg 
  : path.join(__dirname, '..', targetFileArg);

if (!fs.existsSync(targetFilePath)) {
  console.error(`${RED}${BOLD}Error:${RESET} File does not exist at path: ${targetFilePath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(targetFilePath, 'utf8');
const fileName = path.basename(targetFilePath);

console.log(`\n${BLUE}${BOLD}====================================`);
console.log(`🔍 Starting AI Audit for: ${fileName}`);
console.log(`📂 Path: ${targetFilePath}`);
console.log(`====================================${RESET}\n`);

const apiKey = getApiKey();
if (!apiKey) {
  console.error(`${RED}${BOLD}Error:${RESET} NVIDIA_API_KEY is not set or contains placeholder value.`);
  console.log(`Please configure a valid API key in '.env' or in your settings table inside lrat.db.`);
  process.exit(1);
}

const SYSTEM_PROMPT = `You are a highly experienced principal software engineer and cybersecurity auditor. 
Analyze the provided source code file thoroughly.
You must identify:
1. Syntax errors, unhandled promise rejections, race conditions, or crash points.
2. Logical bugs (e.g. incorrect state transitions, bypassed checks, limit overflows).
3. Security vulnerabilities (e.g. SQL Injections, unsafe inputs, authorization flaws, hardcoded credentials).
4. Performance bottlenecks (e.g. N+1 queries, unindexed DB queries, memory leaks, slow APIs).

Format your output strictly in Markdown with these headers:
# AI Audit Report: [Filename]
## 🚨 Critical Bugs (High Risk)
List bugs that cause application crashes, data leaks, security breaches, or campaign execution failures. (Use "None" if clean).
## ⚠️ Minor Warnings (Medium Risk)
List edge cases, unhandled input validations, or minor query inefficiencies. (Use "None" if clean).
## ⚡ Code Optimizations & Best Practices
Provide actionable code suggestions to make the file faster, cleaner, or more secure.

Be highly technical and include code diffs or snippets in your explanations where appropriate.`;

const userPrompt = `Audit this source code file:
Filename: ${fileName}
Content:
\`\`\`javascript
${fileContent}
\`\`\`
`;

async function runAudit() {
  console.log(`📡 Connecting to AI audit stream... (NVIDIA Llama-3.1 70B)`);
  try {
    const response = await axios.post(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        model: 'meta/llama-3.1-70b-instruct',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.2,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    const report = response.data.choices?.[0]?.message?.content || 'No report content generated.';
    
    // Save report to file
    const reportsDir = path.join(__dirname, '../audit_reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFileName = `audit_report_${path.parse(fileName).name}_${timestamp}.md`;
    const reportPath = path.join(reportsDir, reportFileName);
    
    fs.writeFileSync(reportPath, report, 'utf8');
    
    console.log(`\n${GREEN}${BOLD}✓ Audit Completed Successfully!${RESET}`);
    console.log(`📄 Report Saved: ${reportPath}\n`);
    console.log(`${BOLD}--- Audit Report Summary ---${RESET}\n`);
    console.log(report);
    
  } catch (err) {
    console.error(`\n${RED}${BOLD}❌ Audit Failed:${RESET}`);
    console.error(err.response?.data?.message || err.message);
    process.exit(1);
  }
}

runAudit();
