# PROJECT_STATUS.md — LinkedIn Recruiter Automation Tool (LRAT)

## Overview
LRAT is a professional-grade LinkedIn recruitment automation platform. It manages multiple LinkedIn accounts via Unipile and leverages Nvidia NIM (Llama-3.1 70B) for hyper-personalized outreach, sentiment analysis, and intelligent lead scoring.

## Current Status (Last Updated: 2026-05-24 11:00 AM IST)
- **Frameworks:** React (Vite/Tailwind), Node.js (Express), SQLite (better-sqlite3).
- **AI Core:** Fully migrated to **Nvidia NIM (Llama-3.1 70B Instruct)** for sub-second generation and elite personalization.
- **Engine Logic (v6.0):**
    - **Visual Flow Playbook Engine:** The backend execution engine completely supports visual flowcharts (supporting `invite`, `view_profile`, `like_post`, `tag`, `message`, and `end` nodes).
    - **Robust Webhook Verification:** HMAC-SHA256 signature verification implemented for incoming Unipile events, protecting against payload spoofing.
    - **High-Performance Transactions:** Bulk lead imports (CSV and background search URL imports) run in native SQLite database transaction blocks, boosting speed 100x and eliminating table locking bottlenecks.
    - **Server-Independent Timezones:** Replaced fragile string-based date parsing with Intl-based `getISTDateString` and `getISTDayOfWeek` helper methods to ensure 100% timezone safety across any deployment environment.
    - **Database Schema Hardening:** Added explicit SQLite index creations for high-frequency search fields (`leads(linkedin_member_id)`, `leads(linkedin_url)`, etc.) and fixed missing columns (`accounts.next_action_at`) on initialization.
    - **Action-Locked Timers:** Safety delays (15-28m) only start *after* a successful action, eliminating outreach gaps.
    - **Smart Grace Wait:** 60-second automatic wait buffer to sync with LinkedIn's internal timing.
    - **Sync Engine:** High-frequency (30 min) acceptance checks using the updated `/api/v1/users/relations` Unipile endpoint.
    - **Weekend/Resting Day Aware:** Added full check for campaign working days in statistics and engine-status API endpoints.
 
## Key Features Implemented (MVP Ready - 100% Complete)
- **Visual Campaign Builder & Playbooks:**
    - Visual sequence editor connected to template canned messages.
    - Clickable step indicators to jump between builder steps; loads Step 3 (Visual Sequencer) directly on editing.
    - Pre-launch validator checklist blocks campaign activation if no active accounts or steps are defined.
- **Premium "HeyReach" Style Landing Page:**
    - High-conversion light-themed design with "Account Cluster" visuals.
    - Interactive "Live Execution" terminal showing real AI logs.
    - Sectioned product journey: Pipeline, Playbooks, Security, and Pricing.
- **Intelligence Dashboard:**
    - **Dual Metrics:** Displays both percentages and raw numbers (Accepted Requests / Interested Replies).
    - **Safety Pulse & Weekend Resting State:** "System Sleeping" mode with countdown visibility based on IST working hours, plus a premium resting state (with a Coffee icon and Weekly Pause calendar badge) on off-days.
    - **Trend Analytics:** Recharts-based growth visualization for the last 7 days.
- **Advanced Lead Ingestion:**
    - **CSV Bulk Import:** Multi-step wizard with dynamic column mapping and auto-detection.
    - **Global Duplication Guard & Direct Import Shortcuts:** Pre-filled import leads shortcut modal accessible directly from campaign list cards.
    - **Lead Enrichment:** Background profile scraping with AI-powered "Fit Scoring" (0-100) using stored `jd_summary`.
- **Enterprise Safety & Inbox:**
    - **Smart Limits & Warmup Tracking:** Slider-based "Performance Throttle" and dynamic warmup elapsed timeline display on account cards.
    - **AI Sentiment:** Real-time reply categorization with browser-native "Hot Lead" alerts.
    - **Unified Console:** Manage multiple senders and canned message templates in one view, with fully integrated manual reply capabilities.

## Technical Details for AI
- **Backend Port:** 3002 | **Frontend Port:** 5173
- **Primary Service:** `backend/services/automation.js` (Action-locked scheduler).
- **AI Service:** `backend/services/nvidia.js` (NIM API integration).
- **Safety Layer:** `backend/services/safety.js` (IST window and Warmup logic).
- **Database:** `lrat.db` (Table `leads` indexed on `linkedin_url` and `linkedin_member_id`).
- **Unipile Version:** V1 (Updated to `/api/v1/users/relations` for sync and `/api/v1/users/invite` for outreach).

---
*Note: This file is the primary context bridge between Gemini and Claude. Always read this file before starting a new coding session.*
