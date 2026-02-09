# Self-Serve Onboarding Workflow

**Goal:** Convert website visitors into active, value-seeing users without human intervention.
**Key Metric:** Time to "First Lead Contacted".

## 1. User Journey Overview

| Stage | User Action | System Action | Tenant Status | `onboarding_step` |
| :--- | :--- | :--- | :--- | :--- |
| **1. Identity** | Signs up via Google/Email. | Creates `users` doc. | No tenant yet | — |
| **2. Tenant** | Enters "Company Name" & "City". | Creates `tenants` doc (pending). | `pending` | `company_created` |
| **3. Setup** | Defines "Ideal Customer" (Keyword + Radius). | Runs preview search (5 leads). | `pending` | (inferred from data) |
| **4. Value** | Sees list of **5** hot leads (Preview). | **The "Aha" Moment.** | `pending` | (inferred from data) |
| **5. Activate** | Clicks "Start My Free Trial". | Calls `activateTrial`. Sets credits, timer. | `trial` | `trial_activated` |
| **6. Onboard** | Completes checklist. | Progressive feature unlock. | `trial` | `complete` |

## 2. Step-by-Step Logic

### Step A: Sign Up & Organization Creation
* **UI:** CompanySetupScreen (Step 1 of 4). Simple form: Company Name + City.
* **Backend (`createTenant` Cloud Function):**
    * Creates `tenants` document with:
        * `subscription_status`: **"pending"** (NOT "trial" — trial is activated later).
        * `credits_balance`: **0** (credits are granted at trial activation).
        * `trial_ends_at`: **null**.
        * `company_name`: from input.
        * `config.target_city`: from input.
        * Default `usage_limits`: `{ max_leads_per_month: 1000, max_whatsapp_msgs_daily: 500 }`.
    * Links `users` document to this new `tenant_id`.
    * Assigns role: `tenant_admin`.
    * **Abuse Prevention:** 
        * Rate limit `createTenant` by IP.
        * Future: Require Phone Number OTP before trial activation.
    * **Important:** No credits are granted. No trial timer starts. User proceeds to search setup.

### Step B: The "Aha Moment" (First Search Grid)
* **Context:** Don't ask for credit card yet. Show them the magic.
* **UI:** "Who are you looking for?"
    * **Keyword:** e.g., "Gyms", "Tuition Classes".
    * **Location:** User's current city (Auto-detect) or manual entry.
* **Action:**
    * App calls `discoverLeads` (Cloud Function) with `limit=5` and `preview_mode=true`.
    * **Display:** 5 real business results on a map/list with their names and review counts.
    * **Hook:** "We found 150+ more matches in your area. Start your trial to contact them."

### Step C: Trial Activation (Explicit — Step 4 of 4)
* **UI:** TrialActivationScreen. Shows summary: "{count} leads found, 7 days free, ₹500 credits."
* **Trigger:** User clicks "Start My Free Trial" button.
* **Backend (`activateTrial` Cloud Function):**
    * **Precondition:** `subscription_status` must be "pending". If already "trial" or "active", throw error.
    * Sets `subscription_status`: "trial".
    * Sets `credits_balance`: 50000 (₹500.00 in paisa).
    * Sets `trial_ends_at`: Timestamp (Now + 7 days).
    * Creates `credit_transactions` doc: opening balance.
* **State:** Tenant enters "Active Trial". User is redirected to `/leads`.
* **Design Rationale:** Trial activation is deliberately AFTER the "Aha Moment" (Step B preview). This ensures the user sees real value before committing to a trial. The conversion funnel is: Sign Up → Search → See Results → Activate Trial.

**Alternative Path ("Connect Later"):**
* If user skips WhatsApp, they can still:
    * Search Leads.
    * Use "Click to Call" on mobile.
    * Log "Call Outcome" manually.
* **Nudge:** "Connect WhatsApp to automate follow-ups" appears on Dashboard.

## 2.5 Onboarding Resumption (Drop-off Recovery)

**Problem:** If a user closes the app mid-onboarding (after `createTenant` but before `activateTrial`), they have a `subscription_status: "pending"` tenant with no credits.

**Solution:** React Router redirect guard (loader or effect) checks `onboarding_step` and redirects to the appropriate screen.

**Simplified Tracking (MVP):**
Only two values are set by Cloud Functions (which can write to the write-locked `tenants` collection):
* `createTenant` → sets `onboarding_step: "company_created"`
* `activateTrial` → sets `onboarding_step: "trial_activated"`

The intermediate steps (`search_done`, `preview_seen`) are NOT persisted to Firestore because `tenants` is write-locked to Super Admin and adding CFs for transient UI state is over-engineered for MVP. Instead, the React Router guard uses data inference:

| Condition | Redirect To | Rationale |
| :--- | :--- | :--- |
| `onboarding_step == "company_created"` AND no leads exist for this tenant | `/onboarding/search` | Tenant exists, needs first search |
| `onboarding_step == "company_created"` AND leads exist for this tenant | `/onboarding/activate` | Search was done previously, skip to activation |
| `onboarding_step == "trial_activated"` or `"complete"` | `/leads` | Normal flow |

**Data Inference Logic (in React Router guard):**
```typescript
// Pseudo-code for onboarding resumption
if (tenant?.subscription_status === 'pending') {
  if (tenant.onboarding_step === 'company_created') {
    // Check if any leads exist (single Firestore read, limit 1)
    const leadsSnap = await getDocs(
      query(collection(db, 'leads'), where('tenant_id', '==', tenantId), limit(1))
    );
    const hasLeads = !leadsSnap.empty;
    
    if (hasLeads) {
      return <Navigate to="/onboarding/activate" />; // Skip search, go to trial activation
    } else {
      return <Navigate to="/onboarding/search" />; // Redo search
    }
  }
}
```

**Trade-off:** A user who completed the search but didn't see the preview will redo the search (~5 seconds, free). This is acceptable for MVP — the alternative (adding a Cloud Function just to persist a transient step) adds complexity for an edge case that affects <5% of users.

**Future Enhancement:** If drop-off analytics show significant search-to-preview abandonment, add an `updateOnboardingStep` CF that allows writing ONLY the `onboarding_step` field.

### Step D: Trial Expiry & Conversion
* **Triggers:**
    * Time: 7 days passed.
    * Usage: `credits_balance` hits 0.
* **Enforcement:**
    * **Trial Expired (Time):** Block ALL actions. UI shows "Upgrade Plan" paywall.
    * **Credits Depleted (Usage):** Block `sendWhatsapp` & `enrichLeads`. CAUTION: `discoverLeads` continues (under monthly quota).
* **Notification:**
    * Email/Push: "Your trial is ending. You have 450 leads waiting."

## 3. Data Model Implications

## 3. Data Model Implications

### New Collection: `search_grids` (Subcollection of `tenants`)
* Stores the configurations for recurring lead discovery.
* **Schema Definition:** See `planning/2_Data_Schema.md` for the canonical definition.

## 4. Technical Dependencies
* **Auth:** Firebase Auth.
* **Functions:**
    * `createTenant`: Creates tenant doc with `subscription_status: "pending"`, zero credits, no trial timer. Sets custom claims.
    * `activateTrial`: Sets `subscription_status: "trial"`, grants ₹500 credits (50000 paisa), starts 7-day timer.
    * `discoverLeads`: Supports `preview_mode` for `pending` and `trial` status users (max 3 searches, 5 leads each, no credits deducted).
