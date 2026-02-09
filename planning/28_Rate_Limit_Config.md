"Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable)."

# 28. Rate Limit Configuration Table

**Purpose:** Single source of truth for every rate limit, quota, cap, and throttle in the system. Covers Cloud Function call limits, business quota limits, external API limits, and scheduled job frequencies.

**Reference:** Doc 3 §0 (Global Security & Rate Limiting), Doc 0 §A3–A4 (SMB Safety & Billing Rules), Doc 2 (Data Schema — usage fields).

---

## 1. Cloud Function Rate Limits

These are enforced at the function level to prevent abuse. Implementation: Firestore counters or Redis (Memorystore) with sliding window.

| Function | Limit | Scope | Window | Error Code | Error ID | Implementation |
|----------|-------|-------|--------|------------|----------|----------------|
| `discoverLeads` | 10 calls | Per Tenant | 1 minute | `RESOURCE_EXHAUSTED` | DL-002 | Firestore counter: `rate_limits/{tenant_id}_discoverLeads` |
| `sendWhatsapp` | 50 calls | Per Tenant | 1 minute | `RESOURCE_EXHAUSTED` | SW-006 | Firestore counter: `rate_limits/{tenant_id}_sendWhatsapp` |
| `createTenant` | 5 calls | Per IP | 1 minute | `RESOURCE_EXHAUSTED` | CT-004 | Firestore counter: `rate_limits/{ip}_createTenant` |
| `logError` | 10 calls | Per User | 1 minute | `RESOURCE_EXHAUSTED` | LE-001 | Firestore counter: `rate_limits/{uid}_logError` |
| `logLoginEvent` | 5 calls | Per User | 1 minute | `RESOURCE_EXHAUSTED` | LI-001 | Firestore counter: `rate_limits/{uid}_logLoginEvent` |
| `enrichLeads` | 5 calls | Per Tenant | 1 minute | `RESOURCE_EXHAUSTED` | — | Firestore counter: `rate_limits/{tenant_id}_enrichLeads` |
| `activateTrial` | 3 calls | Per User | 5 minutes | `RESOURCE_EXHAUSTED` | — | Firestore counter: `rate_limits/{uid}_activateTrial` |
| `sendInvite` | 10 calls | Per Tenant | 1 hour | `RESOURCE_EXHAUSTED` | — | Firestore counter: `rate_limits/{tenant_id}_sendInvite` |
| `aiReply` | 20 calls | Per Tenant | 1 minute | `RESOURCE_EXHAUSTED` | — | Firestore counter: `rate_limits/{tenant_id}_aiReply` |

### 1.1 Rate Limit Counter Schema

```
Collection: rate_limits (Root Level — NOT per-tenant)
Document ID: {scope_key}_{function_name}   e.g. "tenant_a_discoverLeads"

Fields:
  count       (Number):    Current count in window
  window_start (Timestamp): When current window began
```

### 1.2 Rate Limit Check Logic

```typescript
// utils/rateLimiter.ts
async function checkRateLimit(
  db: FirebaseFirestore.Firestore,
  key: string,          // e.g. "tenant_a_discoverLeads"
  maxCalls: number,     // e.g. 10
  windowMs: number      // e.g. 60000 (1 minute)
): Promise<void> {
  const ref = db.collection('rate_limits').doc(key);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const now = Date.now();

    if (!doc.exists) {
      tx.set(ref, { count: 1, window_start: now });
      return;
    }

    const data = doc.data()!;
    const elapsed = now - data.window_start;

    if (elapsed > windowMs) {
      // Window expired — reset
      tx.set(ref, { count: 1, window_start: now });
    } else if (data.count >= maxCalls) {
      throw new HttpsError('resource-exhausted', 'Rate limit exceeded.');
    } else {
      tx.update(ref, { count: FieldValue.increment(1) });
    }
  });
}
```

### 1.3 Security Rules for rate_limits Collection

```javascript
match /rate_limits/{docId} {
  // No client access. Server-only (Cloud Functions with Admin SDK).
  allow read, write: if false;
}
```

---

## 2. Business Quota Limits

These are business-level caps stored on the `tenants` document and enforced by Cloud Functions during operations. They are NOT per-minute rate limits — they are cumulative usage caps.

| Quota | Field (tenants doc) | Default (Trial) | Default (Basic) | Default (Pro) | Reset Schedule | Enforced By |
|-------|---------------------|-----------------|-----------------|---------------|----------------|-------------|
| Monthly lead discovery | `usage_limits.max_leads_per_month` | 1,000 | 1,000 | 5,000 | 1st of month, 00:05 IST | `discoverLeads` |
| Daily WhatsApp messages | `usage_limits.max_whatsapp_msgs_daily` | 500 | 500 | 2,000 | Daily, 00:00 IST | `sendWhatsapp` |
| Preview searches (pre-trial) | Hardcoded: 3 | 3 | N/A | N/A | Never (one-time) | `discoverLeads` (preview_mode) |
| Credits balance | `credits_balance` (paisa) | 50,000 (₹500) | N/A (top-up) | N/A (top-up) | Never (consumed) | `sendWhatsapp`, `enrichLeads` |

### 2.1 Usage Counter Fields

| Counter | Field Path | Incremented By | Reset By |
|---------|-----------|----------------|----------|
| Leads this month | `usage_current.leads_fetched_this_month` | `discoverLeads` (by count of new leads saved) | Monthly reset cron |
| WhatsApp sent today | `usage_current.whatsapp_sent_today` | `sendWhatsapp` (per message) | Daily reset cron |
| WhatsApp sent this month | `usage_current.whatsapp_sent_this_month` | `sendWhatsapp` (per message) | Monthly reset cron |
| Preview searches used | `usage_current.preview_searches_used` | `discoverLeads` (preview_mode) | `activateTrial` resets to 0 |
| Enrichments this month | `usage_current.enrichments_this_month` | `enrichLeads` (per batch) | Monthly reset cron |

### 2.2 Enforcement Pattern

```typescript
// Example: discoverLeads quota check
const tenant = (await tx.get(tenantRef)).data();

if (tenant.usage_current.leads_fetched_this_month >= tenant.usage_limits.max_leads_per_month) {
  throw new HttpsError('resource-exhausted', 'Monthly lead limit reached.');
}
```

---

## 3. Credit Costs

Per-operation credit deductions in paisa. Enforced atomically within transactions.

| Operation | Cost (paisa) | Cost (₹) | Error if Insufficient | Deduction CF |
|-----------|-------------|-----------|----------------------|-------------|
| WhatsApp Marketing template | 80 | ₹0.80 | SW-001 | `sendWhatsapp` |
| WhatsApp Utility template | 30 | ₹0.30 | SW-001 | `sendWhatsapp` |
| WhatsApp Freeform (within window) | 30 | ₹0.30 | SW-001 | `sendWhatsapp` |
| Lead enrichment (Apify) | 50 | ₹0.50 | EL-001 | `enrichLeads` |
| Google Maps discovery | 0 (free) | ₹0.00 | — | `discoverLeads` |

### 3.1 Credit Top-Up Amounts

| Option | Amount (₹) | Credits (paisa) | Razorpay Amount (paisa) |
|--------|-----------|-----------------|------------------------|
| Starter | ₹200 | 20,000 | 20,000 |
| Standard | ₹500 | 50,000 | 50,000 |
| Bulk | ₹1,000 | 100,000 | 100,000 |
| Custom | User-defined | amount × 100 | amount × 100 |

---

## 4. External API Limits

Limits imposed by third-party services. These are NOT CoCRM's limits — they are constraints the system must respect.

| Service | Limit | Scope | Notes |
|---------|-------|-------|-------|
| Google Places API (Text Search) | 20 results per page, 60 max (3 pages) | Per request | Use `next_page_token` for pagination |
| Google Places API | Billed per request | Per GCP project | Monitor in GCP console; set budget alerts |
| Apify | Depends on plan | Per Apify account | Webhook callback for results |
| MSG91 (WhatsApp) | 1,000 messages/sec | Per phone number | Well above CoCRM's per-tenant limits |
| MSG91 (Email) | Depends on plan | Per account | Used for invitations, trial notifications |
| Vertex AI (Gemini) | Varies by model | Per GCP project | Set quota in GCP console |
| Razorpay Webhooks | May retry up to 24 hours | Per event | Idempotency key prevents double-processing |
| Firebase Auth | 100 new accounts/hour (free tier) | Per Firebase project | Monitor; upgrade plan if needed |
| Firestore | 10,000 writes/sec, 1M reads/day (free tier) | Per Firebase project | Well above MVP needs |

---

## 5. Quiet Hours (Communication Throttle)

Not a rate limit per se, but a time-based sending restriction.

| Rule | Value | Scope | Enforcement |
|------|-------|-------|-------------|
| Quiet hours start | 21:00 (9 PM) | Tenant timezone (`config.timezone`) | `sendWhatsapp` — route to `message_queue` |
| Quiet hours end | 09:00 (9 AM) | Tenant timezone | Queue processor sends at next 9 AM |
| Default timezone | `Asia/Kolkata` (IST) | Per tenant | Set during onboarding |

### 5.1 Quiet Hours Logic

```typescript
const tenantTz = tenant.config.timezone ?? 'Asia/Kolkata';
const localHour = new Date().toLocaleString('en-US', { timeZone: tenantTz, hour: 'numeric', hour12: false });
const hour = parseInt(localHour);

if (hour >= 21 || hour < 9) {
  // Queue instead of send — DO NOT deduct credits
  await writeToMessageQueue(messageData, nextMorning9AM(tenantTz));
  return { success: true, queued: true, scheduled_at: nextMorning9AM(tenantTz) };
}
```

---

## 6. Scheduled Job Frequencies

Cron jobs that maintain system state. Defined in Doc 3 §8.

| Job | Schedule | Purpose | Doc Reference |
|-----|----------|---------|---------------|
| Daily usage reset | 00:00 IST daily | Reset `whatsapp_sent_today` to 0 for all tenants | Doc 3 §8.1 |
| Monthly usage reset | 00:05 IST, 1st of month | Reset `leads_fetched_this_month`, `whatsapp_sent_this_month`, `enrichments_this_month` to 0 | Doc 3 §8.1b |
| Message queue processor | Every 5 minutes | Send queued messages (quiet hours backlog) | Doc 3 §8.2 |
| Enrichment reconciliation | Every 60 minutes | Fail stale `enrichment_status: "pending"` leads (>30 min), refund credits | Doc 3 §8.3 |
| Balance reconciliation | Sunday 02:00 IST | Sum `credit_transactions` vs `credits_balance`, flag mismatches | Doc 3 §8.4 |
| Rate limit cleanup | Daily 03:00 IST | Delete expired `rate_limits` docs (>24 hours old) to prevent collection bloat | New |

---

## 7. Banner Thresholds

UI banners triggered by proximity to limits. Defined in Doc 16 §9.2, built in Phase 1 (Step 1.13).

| Banner | Trigger Condition | Component | Dismissible |
|--------|------------------|-----------|-------------|
| Credits Warning | `credits_balance < 10000` (₹100) | `CreditsWarningBanner` | No (persistent until topped up) |
| Trial Expiry | `trial_ends_at` within 2 days AND `subscription_status == "trial"` | `TrialExpiryBanner` | No (persistent) |
| Daily Cap | `whatsapp_sent_today >= 0.8 × max_whatsapp_msgs_daily` (80%) | `DailyCapBanner` | Yes (per session) |

---

## 8. Configuration Summary (Quick Reference)

```typescript
// config/limits.ts — Central constants file

export const RATE_LIMITS = {
  DISCOVER_LEADS: { maxCalls: 10, windowMs: 60_000, scope: 'tenant' },
  SEND_WHATSAPP:  { maxCalls: 50, windowMs: 60_000, scope: 'tenant' },
  CREATE_TENANT:  { maxCalls: 5,  windowMs: 60_000, scope: 'ip' },
  LOG_ERROR:      { maxCalls: 10, windowMs: 60_000, scope: 'user' },
  LOG_LOGIN:      { maxCalls: 5,  windowMs: 60_000, scope: 'user' },
  ENRICH_LEADS:   { maxCalls: 5,  windowMs: 60_000, scope: 'tenant' },
  ACTIVATE_TRIAL: { maxCalls: 3,  windowMs: 300_000, scope: 'user' },
  SEND_INVITE:    { maxCalls: 10, windowMs: 3_600_000, scope: 'tenant' },
  AI_REPLY:       { maxCalls: 20, windowMs: 60_000, scope: 'tenant' },
} as const;

export const CREDIT_COSTS = {
  WHATSAPP_MARKETING: 80,  // paisa
  WHATSAPP_UTILITY: 30,
  WHATSAPP_FREEFORM: 30,
  ENRICHMENT_PER_LEAD: 50,
  DISCOVERY: 0,
} as const;

export const QUOTAS = {
  PREVIEW_SEARCHES_MAX: 3,
  TRIAL_CREDITS: 50_000,        // paisa (₹500)
  TRIAL_DURATION_DAYS: 7,
  QUIET_HOURS_START: 21,        // 9 PM local
  QUIET_HOURS_END: 9,           // 9 AM local
} as const;

export const BANNER_THRESHOLDS = {
  CREDITS_WARNING_PAISA: 10_000,  // ₹100
  TRIAL_EXPIRY_DAYS: 2,
  DAILY_CAP_PERCENT: 0.80,       // 80%
} as const;
```

---

**End of File**
