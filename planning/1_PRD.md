“Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable).”

# Product Requirements Document (PRD)

**Project Name:** AI Personal Sales Assistant (for Owners)
**Target: Small Business Owners (SMBs)** in India (Study Centers, Gyms, Coaching).
**Promise:** "Get more customers from Google Maps + WhatsApp, without hiring a salesperson."
**Tech Stack:** React + TypeScript PWA (Frontend), Firebase (Backend), Node/TypeScript Cloud Functions (CRUD), Python Cloud Run (AI Services), Firestore (Database), Vertex AI (via Python), Apify.

## 1. Executive Summary

Small business owners are overwhelmed. They want results (leads/bookings), not software.
**CoCRM** is an "Owner's Assistant" that works 24/7.
It automates the top of the funnel: **Finds people on Google -> Finds their contact info -> Sends them a personal WhatsApp -> Drafts the reply.**

**Owner Outcomes:**
* 10 minutes setup time.
* See 5 hot leads immediately.
* Send first message in 3 clicks.
* "Zero Admin" - Just chat with interested customers. (MVP: All AI drafts require one-click approval).

## 2. User Personas (Collapsed)

* **The Owner (Primary):** Checks app 3 times a day. Wants "Hot Leads" and "Reply Suggestions." Hates data entry.
* **The Operation Manager / Front Desk (Secondary):** Part-time. Needs a simple "Task List" (Call this person, Confirm this booking).
* **The AI Agent (System):** The 24/7 worker. Finds leads, scores them, and drafts messages.

## 3. The MVP for SMBs

We intentionally exclude "Enterprise CRM" features. The MVP has **3 Main Tabs**:

### Tab A: "Find Leads" (The Hunter)
*   **Input:** "Find Gyms in Kothrud, Pune".
*   **System:** Scans Google Maps -> Scrapes Websites for Email/Social (Apify) -> AI Scores them (**Hot/Warm/Cold**).
*   **Output:** A list of "New Prospects" ready to contact. **Default View:** New → Contacted → Responded → Booked → Won/Lost. (MVP: Only these 5 are shown in UI; others are internal).

### Tab B: "Messages" (The Hub)
* **Guardrails:** AI ensures no prices/promises are invented.

### Tab C: "Tasks" (Follow-ups)
* **Goal:** "Who do I need to call today?"
* **Logic:** Simple list: "Call Rahul (Interested)", "Follow up with Priya (No Reply)".

## 4. Critical Business Logic

* **Lead Lifecycle (Simple):**
    * `new`: Found on Maps.
    * ~~`enrichment_pending`~~: REMOVED from `status` enum. Enrichment state is tracked via a separate `enrichment_status` field ("pending", "completed", "failed") to avoid desync with the primary status pipeline.
    * `qualified`: AI says "Good Fit".
    * `contacted`: Message sent.
    * `responded`: Lead replied (Hot!).
    * `demo_booked`: Meeting set.
    * `closed_won`/`closed_lost`.

* **Compliance & Trust:**
    * **Quiet Hours:** System never sends messages at night (9 PM - 9 AM **in the tenant's configured timezone**). Tenant timezone is stored in `tenants.config.timezone` (default: "Asia/Kolkata" for Indian tenants).
    * **Opt-Out:** If a user says "STOP", status -> `opted_out` and **ALL** future messages are blocked.
    * **Spam Check:** Daily send limits per business to prevent WhatsApp bans.

## 5. Billing (Simple Story)

* **Subscription (Platform):** ₹999/mo (Access to the Assistant).
* **Credits (Fuel):** Prepaid balance for "Costly Actions" (WhatsApp & Enrichment).
    * **Google Maps:** Free (Quota limited).
    * **WhatsApp:** ~80 paisa/msg.
    * **Enrichment:** ~50 paisa/lead.
* **Story:** "Top up ₹500 and get **625 WhatsApp marketing messages** (at 80p) OR **1000 enriched leads** (at 50p)."

## 6. Non-Functional Requirements

* **Trust:** "We don't spam."
* **PWA with Service Worker Caching:** Owner can view cached leads when offline. Writes are queued via Firestore JS SDK's offline persistence and synced when online. Full offline-first behavior is limited compared to native apps — critical writes (send message, discover leads) require connectivity.
* **Experience:** "3-Click Rule" for any key action.
* **Account Deletion:** Users must be able to delete their account and associated data (required by GDPR and good practice). Settings → 'Delete My Account' triggers a Cloud Function that: removes custom claims, deactivates the `users` doc, anonymizes `assigned_to` on leads, and schedules Firebase Auth account deletion. **Implementation:** Phase 2.

---

