“Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable).”

# API & Workflow Specifications

## Cloud Function Index
| Function | Section | Primary Doc |
|----------|---------|------------|
| discoverLeads | §1 | This doc |
| activateTrial | §1.1 | This doc |
| updateTenantProfile | §1.2 | This doc |
| createTenant | §1.3 | This doc |
| enrichLeads | §2 | This doc |
| handleApifyWebhook | §2 | This doc |
| scoreLead | §3 | This doc |
| sendWhatsapp | §4 | This doc |
| handleInboundMessage | §4.1 | This doc |
| aiReply | §5 | This doc |
| handleRazorpayWebhook | §6.1 | This doc |
| createSubscriptionLink | §6.2 | This doc |
| indexBrochure | §6.3 | This doc |
| logError | §9 | This doc |
| sendInvite | §10.1 | This doc |
| validateInvitation | §10.2 | This doc |
| assignTenantOnSignup | §10.3 | This doc |
| removeUser | §10.4 | This doc |
| deleteAccount | §12 | This doc | (Phase 2 — stub only) |
| updateUserProfile | §13 | This doc |
| logLoginEvent | §14 | This doc |
| updateUserPermissions | §15 | This doc |

(Push notification logic is embedded in §4.1, §5, §4, and scheduled functions — see §11.)

## 0. Global Security & Rate Limiting

**Rate Limiting Strategy:**
* **App Check:** Enforce Firebase App Check (reCAPTCHA Enterprise provider for web) on all callable Cloud Functions to reject unverified clients.
* **Throttling:** Use Redis (Memorystore) or Firestore counters to limit:
    * `discoverLeads`: 10 calls/min per Tenant.
    * `sendWhatsapp`: 50 calls/min per Tenant.
* **Validation:** ALL functions must validate `context.auth.token.tenant_id` matches the target resource.

### 0.1 AI Service Architecture (Python Cloud Run)
The following AI-heavy operations run as a **Python Cloud Run** service (`ai-service`) rather than inside Node/TS Cloud Functions:
- **`scoreLead`** (§3): Lead qualification scoring via Vertex AI
- **`aiReply`** (§5): AI draft generation with RAG context
- **Safety Layer** (called by `aiReply`): Content guardrail check

**Invocation pattern:** The Node/TS Cloud Function (or Firestore trigger handler) calls the Python Cloud Run service via authenticated HTTP request using the service's internal Cloud Run URL. The CF passes the payload and receives the AI result. This keeps billing logic, Firestore writes, and auth checks in Node/TS while isolating AI/ML workloads in Python.

**Authentication:** Cloud Functions call Cloud Run using the default compute service account with an ID token (`google-auth-library` → `getIdTokenClient`). No API keys needed for internal GCP-to-GCP calls.

**Python Cloud Run service endpoints:**
- `POST /score-lead` — Accepts lead data, returns `{ qualification_score, tag, reasoning }`
- `POST /ai-reply` — Accepts conversation history + RAG context + tenant config, returns `{ draft_text, safety_status }`
- `GET /health` — Health check

### 0.X Audit Fields (All Cloud Functions)
Every Cloud Function that creates or updates a Firestore document MUST set audit fields:
- **On CREATE:** set `created_at`, `created_by`, `updated_at`, `updated_by`. Actor = `context.auth?.uid ?? 'system:{functionName}'`. For webhooks: `'webhook:{provider}'`.
- **On UPDATE:** set `updated_at`, `updated_by`.
See `21_Standard_SaaS_Features.md` §1 for complete actor identification rules.

## 1. Lead Discovery Workflow (Cloud Function: `discoverLeads`)

**Trigger:** Tenant Admin clicks "Find Leads" in Dashboard.
**Input Payload:**

```json
{
  "location": { "lat": 18.5204, "lng": 73.8567 },
  "radius": 5000,
  "keyword": "Study Center",
  "next_page_token": "...", // Optional
  "preview_mode": true // Optional: For trial users
}
```

**Preview Mode constraints:**
* `limit` forced to **5** (SMB "Aha Moment").
* Does NOT save to Firestore.
* Does NOT update usage counts.
* Allowed only if `subscription_status` is `'pending'` OR `'trial'` AND `usage_current.preview_searches_used < 3`.

**Step 1: Quota Check**

* **Auth Check:** Extract `tenant_id` from `context.auth.token.tenant_id`. **DO NOT** trust user input.
* Check `tenants/{tenant_id}`.
* **Rule:** If `usage_current.leads_fetched_this_month` >= `usage_limits.max_leads_per_month`, throw error: "Monthly Limit Reached. Upgrade to Pro."

**Deduplication Logic:**
* **Method:** Deterministic ID. 
* Generate `lead_id` = `SHA256(tenant_id + google_place_id)`.
* `create` will fail if document exists (preventing duplicates automatically).

**Step 2: Google Places API (New)**

* **Endpoint:** `https://places.googleapis.com/v1/places:searchText`
* **Field Mask (Optimized for Cost):** `places.displayName, places.formattedAddress, places.internationalPhoneNumber, places.websiteUri, places.rating, places.userRatingCount`
* **Note:** Do **NOT** request `places.photos` or `places.reviews` in this initial search (too expensive).
* **Optional optimization:** you may skip writing if deterministic lead_id already exists (avoid extra reads); create will fail anyway.

**Step 3: Save to Firestore**

* Batch write new documents to `leads` collection.
* Set `status`: "new".
* Set `enrichment_status`: "pending".
* **Audit Fields:** Set `search_name = business_details.name.toLowerCase().trim()` and `is_archived = false` on each new lead doc. Must set audit fields (`created_at`, `created_by`, `updated_at`, `updated_by`) on all create operations.
* **Counter Update:** Increment `tenants/{tenant_id}.usage_current.leads_fetched_this_month` by `{number_of_new_leads_saved}` (NOT the total search results — only the ones that were actually new and written to Firestore, excluding duplicates).

**Return Payload:**
```json
{
  "success": true,
  "leads_saved": 18,
  "leads_skipped_duplicate": 2,
  "total_results_from_google": 20,
  "next_page_token": "CpQCAgEAAA...",
  "quota_remaining": 658
}
```

**Field Descriptions:**
* `leads_saved`: Number of NEW leads written to Firestore (excludes duplicates).
* `leads_skipped_duplicate`: Number of results that already existed (deterministic ID collision).
* `total_results_from_google`: Raw result count from Google Places API.
* `next_page_token`: Google Places pagination token. Pass this value as `next_page_token` in the next call to fetch more results. `null` if no more pages. Google Places returns max 20 results per page, up to 60 total (3 pages).
* `quota_remaining`: `usage_limits.max_leads_per_month - usage_current.leads_fetched_this_month` after this call.

**Error Codes:**
| Code | Condition |
|------|-----------|
| `RESOURCE_EXHAUSTED` | Monthly quota exceeded, rate limited |
| `FAILED_PRECONDITION` | Trial expired, account suspended |
| `PERMISSION_DENIED` | Wrong tenant, not authenticated |
| `UNAVAILABLE` | Google Places API error |

---

## 1.1 Trial Activation (Cloud Function: `activateTrial`)

**Trigger:** Callable. User clicks "Start My Free Trial" on TrialActivationScreen (Step 4 of onboarding).
**Input Payload:**

```json
{
  "lead_count": 5  // Optional: number of preview leads found (for analytics)
}
```

**Auth Check:** Extract `tenant_id` from `context.auth.token.tenant_id`. Verify caller has role `tenant_admin`.

**Precondition Check:**
1. Fetch `tenants/{tenant_id}`.
2. If `subscription_status` is already `active` or `trial`, throw `FAILED_PRECONDITION`: "Trial already activated."
3. If `subscription_status` is `suspended`, throw `PERMISSION_DENIED`: "Account suspended."

**Logic (Atomic write on tenants/{tenant_id}):**
1. Set `subscription_status` = "trial".
2. Set `credits_balance` = 50000 (₹500.00 in paisa).
3. Set `trial_ends_at` = `Timestamp.now() + 7 days`.
4. Create `credit_transactions` doc: { `tenant_id`, `amount`: 50000, `reason`: "trial_opening_balance", `reference_id`: `tenant_id`, `status`: "confirmed", `idempotency_key`: "trial_opening_{tenant_id}", `timestamp`: `now` }.
5. Set `onboarding_step` = "trial_activated".
6. Set `usage_current.preview_searches_used` = 0.

**Audit Note:** Must set audit fields (`updated_at`, `updated_by`) on the tenant doc update.

**Return:** { `success`: true, `trial_ends_at`: "ISO_DATE" }

**Important:** This is the ONLY activation point. `createTenant` (referenced in onboarding Step 1) creates the tenant doc with `subscription_status`: "pending" and `credits_balance`: 0. The trial is NOT activated until the user explicitly reaches Step 4. This two-step design ensures the "Aha Moment" (preview leads) happens BEFORE trial commitment.

---

## 1.2 Update Tenant Profile (Cloud Function: `updateTenantProfile`)

**Trigger:** Callable. Tenant admin edits company name or city in Settings.
**Input Payload:**
```json
{
  "company_name": "Rahul's Study Center",  // Optional
  "city": "Mumbai"  // Optional
}
```
**Auth Check:** Extract `tenant_id` from `context.auth.token.tenant_id`. Verify caller has role `tenant_admin`.

**Validation:**
1. `company_name`: If provided, min 2 chars, max 100 chars. Trimmed.
2. `city`: If provided, must not be empty after trim.
3. At least one field must be provided.

**Logic:**
1. Build update map from provided fields only.
2. If `company_name` provided: set `tenants/{tenant_id}.company_name`.
3. If `city` provided: set `tenants/{tenant_id}.config.target_city`.
4. Write to `tenants/{tenant_id}`.

**Audit & Logging Note:** Must create an `activity_logs` entry with action `"settings_updated"`. Must set audit fields (`updated_at`, `updated_by`) on the tenant doc and (`created_at`, `created_by`) on the activity log.

**Return:** { `success`: true }

**Why this needs a CF:** The `tenants` collection is write-locked to Super Admin in security rules (`Section 1` of `5_Security_Rules.md`). Tenant admins cannot write directly. This CF acts as a controlled proxy for profile updates.

---

## 1.3 Tenant Creation (Cloud Function: `createTenant`)

**Trigger:** Callable. Step 1 of onboarding.
**Input Payload:**
```json
{
  "company_name": "Rahul's Study Center",
  "admin_name": "Rahul K",
  "city": "Mumbai"
}
```
**Logic:**
1. **Initialize Tenant:** Create `tenants/{auto_id}`.
    * `company_name`: Provided name.
    * `subscription_status`: "pending".
    * `credits_balance`: 0.
    * `config.target_city`: Provided city.
2. **Setup Admin:** Create `users/{context.auth.uid}`.
    * `tenant_id`: The new tenant ID.
    * `role`: "tenant_admin".
    * `name`: Provided admin name.
    * `is_active`: true.
3. **Set Claims:** Set Custom Auth Claims `{ tenant_id, role: 'tenant_admin' }`.
4. **Onboarding Update:** Set `onboarding_step`: "company_created".
5. **Permissions Note:** Must set default `permissions` map on the admin user doc based on `tenant_admin` defaults from `21_Standard_SaaS_Features.md` §9.4.
6. **Audit Note:** Must set audit fields on both tenant and user doc creation.
7. **Return:** `{ success: true, tenant_id }`.

---

## 2. Lead Enrichment Workflow (Cloud Function: `enrichLeads`)

**Trigger:** Scheduled Cloud Task (runs 5 mins after Discovery) OR Manual "Enrich" button.
**Input:** List of `lead_id`s where `websiteUri != null` AND `contact_details.email == null`.

**Step 1: Call Apify API**

* **Actor:** `apify/contact-detail-scraper` (or `cheerio-scraper`).
* **Endpoint:** `https://api.apify.com/v2/acts/[ACTOR_ID]/runs?token=[APIFY_TOKEN]`
* **Pre-Check & Deduction (Atomic):**
    1. If `credits_balance < 50` (Enrichment Cost), throw error.
    2. Else, deduct `50` credits.
    3. create `credit_transactions` doc.
    4. Increment `tenants/{tenant_id}.usage_current.enrichments_this_month` by 1.
* **Payload:**

```json
{
  "startUrls": [ { "url": "https://example-study-center.com", "userData": { "leadId": "12345", "tenantId": "REQ_AUTH_TENANT_ID" } } ],
  "maxCrawlingDepth": 1,
  "maxConcurrency": 5
}

```

**Step 2: Handle Webhook (Cloud Function: `handleApifyWebhook`)**

* **Security:**
    1. Validate `x-apify-signature` header.
    2. **Tenant Check:** Verify that the `leadId` in the payload actually belongs to the `tenantId` claimed in `userData`. (Read `leads/{leadId}` and check `tenant_id`).

* **Trigger:** Apify actor finishes.
* **Action:**
1. **Check Status:** If Apify run status is "FAILED" or "TIMEOUT":
    * **Refund:** `tenants/{tenant_id}` -> `credits_balance` += 50.
    * Create `credit_transactions` doc: `{ amount: 50, reason: "enrichment_refund", reference_id: runId, status: "confirmed" }`.
    * Set `leads/{leadId}` -> `enrichment_status` = "failed".
2. **If Success:** Parse JSON to find `emails` (mailto:) and `social_links` (instagram.com, facebook.com).
3. Update Firestore `leads/{leadId}`:
    * Set `contact_details.email` = `found_email`.
    * Set `contact_details.social` = `found_links`.
    * Set `enrichment_status` = "completed".
    * **Audit Note:** Must update `search_name` if business name changes during enrichment. Must set audit fields (`updated_at`, `updated_by`) on update.





---

## 3. Vertex AI Scoring Workflow (Cloud Function: `scoreLead`)

**Trigger:** Firestore `onUpdate` (when `enrichment_status` changes to "completed").

**Idempotency Guard:** Before processing, check: `if (before.data().enrichment_status !== 'completed' && after.data().enrichment_status === 'completed')`. If the `before` value was already `completed`, skip scoring (prevents double-score on re-triggers).

**Logic:**

- The **Firestore onUpdate trigger** remains a Node/TS Cloud Function. When `enrichment_status` changes to `completed`, it:
  1. Reads the lead data
  2. Calls the Python Cloud Run `POST /score-lead` endpoint with the lead data
  3. Writes the returned `ai_analysis` and `priority` back to Firestore
- The actual Vertex AI call happens inside the Python Cloud Run service.

---

## 4. WhatsApp Automation Workflow (Cloud Function: `sendWhatsapp`)

**Trigger:** Manual Button Click OR Automated Workflow (e.g., "Send Intro").

**Step 0: Safety & Policy Checks**
* **Quiet Hours:** If time is between 9 PM and 9 AM (Tenant Config), write to `message_queue` collection.
    * `message_queue/{doc_id}`:
        * `tenant_id` (String)
        * `lead_id` (String)
        * `template_name` (String)
        * `payload` (Map)
        * `scheduled_at` (Timestamp)
        * `status` (String): "queued", "processing", "sent", "failed"
        * `created_at` (Timestamp)
        * `attempts` (Number)
        * `last_error` (String)
    * **Worker:** Cloud Scheduler runs every 5 mins to process "due" messages.
* **Daily Cap:** Check `usage_current.whatsapp_sent_today`. If > `limit` (e.g., 500), Block send.

**Step 1: Pre-Transaction Validation**
* **Auth Check:** Extract `tenant_id` from `context.auth.token.tenant_id`.
* **Compliance Check:** Read `leads/{lead_id}`. If `opt_in_status == "opted_out"`, throw `FAILED_PRECONDITION`: "User has opted out." (This read happens OUTSIDE the transaction since it's a different collection and rarely changes.)

**CRITICAL: The flow uses two sequential transactions with an external call between them.**

**Phase 1: Reserve (Firestore Transaction)**

All the following reads and writes occur within a single Firestore transaction:

1. **Read** `tenants/{tenant_id}`: get `credits_balance`, `usage_current.whatsapp_sent_today`, `usage_limits.max_whatsapp_msgs_daily`, `subscription_status`, `trial_ends_at`, `config.timezone`.
2. **Validate Subscription:** If `subscription_status == 'suspended'` or `subscription_status == 'cancelled'`, throw `PERMISSION_DENIED`.
   If `subscription_status == 'trial'` AND `trial_ends_at < now`, throw `FAILED_PRECONDITION`: "Trial expired."
3. **Validate Daily Cap:** If `whatsapp_sent_today >= max_whatsapp_msgs_daily`, throw `RESOURCE_EXHAUSTED`: "Daily send limit reached."
4. **Validate Balance:** Determine cost (80 paisa for marketing template, 30 for utility). If `credits_balance < cost`, throw `FAILED_PRECONDITION`: "Insufficient credits. Please top up."
5. **Quiet Hours Check:** Convert current UTC time to tenant timezone. If between 21:00–09:00, write to `message_queue` instead (see Step 0) and return `{ success: true, queued: true, scheduled_at: "next 9 AM" }`. Do NOT deduct credits for queued messages (deduction happens when queue processor sends).
6. **Reserve Credits (atomic write):**
   - `tenants/{tenant_id}.credits_balance`: `FieldValue.increment(-cost)`
   - `tenants/{tenant_id}.usage_current.whatsapp_sent_today`: `FieldValue.increment(1)`
   - `tenants/{tenant_id}.usage_current.whatsapp_sent_this_month`: `FieldValue.increment(1)`
   - Create `credit_transactions` doc: `{ tenant_id, amount: -cost, reason: "whatsapp_marketing"|"whatsapp_utility", reference_id: "pending_" + generatedMsgId, status: "reserved", timestamp: now }`

**Phase 2: Send (External — OUTSIDE any transaction)**

7. **WhatsApp Service Window Check:** If the lead has NO inbound message within the last 24 hours (check most recent `interactions` doc where `direction == 'inbound'` AND `type == 'whatsapp'`), ONLY template messages are allowed. If `message_type == "freeform"` and no inbound within 24 hours, **refund credits** (see Phase 3 failure path) and throw `FAILED_PRECONDITION`: "24-hour service window expired. Use a template message."
8. **Send via Messaging Provider:** Call messagingProvider.sendWhatsAppTemplate() or messagingProvider.sendWhatsAppFreeform() (see 20_Communication_Provider_Abstraction.md §2 for interface). Capture providerMessageId from ISendResult response. Map this to whatsapp_message_id in all downstream writes.

**Phase 3a: Confirm (on provider API success — batch write, NOT transaction)**

9. **Batch write (atomic but non-transactional):**
   - Update `credit_transactions` doc from Phase 1: set `reference_id` to actual `whatsapp_message_id`, set `status: "confirmed"`.
   - Create `interactions` doc: `{ tenant_id, lead_id, type: "whatsapp", direction: "outbound", content: message_text, cost: cost, metadata: { whatsapp_message_id: msgId, template_name: template, category: category, pricing_unit_cost: cost, is_draft: false }, timestamp: now }`
   - Update `leads/{lead_id}`: `{ last_interaction_at: now, last_message_preview: truncate(content, 100), has_pending_draft: false }`

**Audit & Notification Note:** Must set audit fields on all Firestore writes. After successful send, if `credits_balance < 10000` (₹100), create a `notifications` doc with type `credits_low` for all `tenant_admin` users (see §11.4).

**Return:** `{ success: true, interaction_id: "...", cost: cost }`

**Phase 3b: Refund (on provider API failure — batch write)**

10. **Refund reserved credits:**
    - `tenants/{tenant_id}.credits_balance`: `FieldValue.increment(+cost)` (give back)
    - `tenants/{tenant_id}.usage_current.whatsapp_sent_today`: `FieldValue.increment(-1)`
    - `tenants/{tenant_id}.usage_current.whatsapp_sent_this_month`: `FieldValue.increment(-1)`
    - Update `credit_transactions` doc from Phase 1: set `status: "refunded"`, `reference_id: "failed_" + error_code`.
11. Throw `UNAVAILABLE`: "Message failed to send. Credits refunded. Please try again."

**Edge Case — Refund Write Fails:**
If the refund batch write itself fails (extremely rare — Firestore outage), log to `system_logs` with severity "critical" including the `credit_transactions` doc ID. The weekly balance reconciliation (§7 item 4) will catch and flag the discrepancy. Do NOT retry endlessly — return error to client and let reconciliation handle it.

**Schema Reference:** The `status` field on `credit_transactions` is defined in `2_Data_Schema.md` §1.1. All credit_transaction docs across all CFs set `status: "confirmed"` on creation, except `sendWhatsapp` which uses the reserve→confirm/refund lifecycle.


**Error Codes:**
| Code | Condition |
|------|-----------|
| `FAILED_PRECONDITION` | Insufficient credits, trial expired, opted out, service window expired |
| `RESOURCE_EXHAUSTED` | Daily cap reached, rate limited |
| `PERMISSION_DENIED` | Account suspended/cancelled, wrong tenant |
| `UNAUTHENTICATED` | No auth token |
| `UNAVAILABLE` | Messaging provider API down |

**For Inbound Webhook Handler (separate function, not this CF):**
When an inbound WhatsApp message arrives, the webhook handler must ALSO atomically update:
* `leads/{lead_id}.last_interaction_at` = `now`.
* `leads/{lead_id}.last_message_preview` = `truncate(inbound_content, 100)`.
* `leads/{lead_id}.has_unread_message` = `true`.

**Contract:** These lead doc updates are CRITICAL for the `InboxScreen` to work. The UI queries `leads` (not `interactions`) for the conversation list. If these writes are missing, the inbox will show stale data and unread indicators will never appear.

---

## 4.1 Inbound WhatsApp Handler (Cloud Function: `handleInboundMessage`)

**Trigger:** HTTPS Webhook from messaging provider (MSG91 in MVP; routed through provider abstraction — see 20_Communication_Provider_Abstraction.md).

**Security:** Call messagingProvider.validateWebhookSignature(headers, rawBody). The active adapter handles provider-specific validation (MSG91: x-msg91-signature, Meta: X-Hub-Signature-256, Twilio: X-Twilio-Signature).

**Logic:**

1. **Parse & Resolve:** Call messagingProvider.parseInboundMessage(payload) to get a standardized IInboundMessage (see Doc 20 §2). Extract providerPhoneId from the parsed result. Query tenants where config.whatsapp_phone_id == providerPhoneId to resolve tenant_id. If no tenant found, log error and return 200 (acknowledge to provider but discard).

2. **Lead Lookup:** Query `leads` where `tenant_id == resolved_tenant_id` AND (`business_details.phone == sender_phone` OR `contact_details.phone == sender_phone`). If no lead found, create a new lead with `source: "whatsapp_inbound"`, `status: "new"`, `business_details.phone: sender_phone`.

3. **STOP Keyword Detection:** If inbound message text matches (case-insensitive): "STOP", "stop", "UNSUBSCRIBE", "unsubscribe", "OPT OUT", "opt out":
    - Set `leads/{leadId}.opt_in_status` = "opted_out".
    - Log interaction (step 4) but do NOT trigger aiReply (step 6).
    - Return 200.

4. **Log Interaction:** Create `interactions` doc:
    - `tenant_id`: resolved tenant.
    - `lead_id`: matched lead.
    - `type`: "whatsapp".
    - `direction`: "inbound".
    - `content`: Message text.
    - `cost`: 0.
    - `metadata.is_draft`: false.
    - `metadata.whatsapp_message_id`: from payload.
    - `timestamp`: now.

5. **Update Lead (Inbox Denormalization):**
    - `last_interaction_at`: now.
    - `last_message_preview`: truncate(content, 100).
    - `has_unread_message`: true.
    - If `status == "contacted"`, set `status: "responded"` (auto-advance pipeline).

**Audit & Notification Note:** Must set audit fields on all Firestore writes. Must create a `notifications` doc with type `lead_reply` for the assigned user (or all tenant users if unassigned) - see §11.1.

6. **Trigger AI Reply:** If `opt_in_status != "opted_out"`, initiate `aiReply` logic (§5).

**Return:** 200 OK (always, to prevent provider retries).

**Idempotency:** Check if interactions collection already has a doc with metadata.whatsapp_message_id == parsedMessage.messageId. If so, skip processing (providers may retry webhook delivery).

---

## 5. RAG Chatbot Workflow (Cloud Function: `aiReply`)

**Trigger:** Inbound WhatsApp Webhook.

**Logic:**

- The **callable Cloud Function** `aiReply` remains in Node/TS. It:
  1. Validates auth and tenant_id
  2. Fetches conversation history and RAG context from Firestore (including `brochure_vectors` findNearest query)
  3. Calls the Python Cloud Run `POST /ai-reply` endpoint with the assembled context
  4. Receives the draft text (already safety-checked inside the Python service)
  5. Creates the draft `interaction` document in Firestore
  6. Updates lead flags and sends FCM notification
- The Vertex AI call + safety layer both run inside the Python Cloud Run service.


4. **Action (Draft Mode — MVP):**
* Do NOT send automatically. All AI drafts require human approval.
* Create `interactions` doc:
    * `tenant_id`: from lead doc.
    * `lead_id`: the lead that received the inbound message.
    * `type`: "whatsapp".
    * `direction`: "outbound".
    * `content`: The AI-generated reply text.
    * `cost`: 0 (not charged until actually sent).
    * `metadata.is_draft`: `true`.
    * `metadata.template_name`: `null` (freeform reply, not a template).
    * `timestamp`: `now`.
* Update `leads/{lead_id}`:
    * Set `has_pending_draft` = `true`.

**Audit & Notification Note:** Must set audit fields on create. Must create a `notifications` doc with type `ai_draft_ready` for the assigned user - see §11.2.

**Approval flow (handled by client + sendWhatsapp CF):**
1. User taps "Send" on AI Draft Banner → client calls `sendWhatsapp` CF with the draft content.
2. `sendWhatsapp` creates a NEW interaction (the actual sent message) and deducts credits normally.
3. The original draft interaction (metadata.is_draft: true) remains in history unchanged (append-only rule on interactions).
4. `sendWhatsapp` also sets `leads/{lead_id}.has_pending_draft = false` as part of its Step 4 lead doc update.

**Dismiss flow (handled by client):**
1. User taps "✕" dismiss → client sets `leads/{lead_id}.has_pending_draft = false`.
2. Draft interaction remains in Firestore (cannot be deleted or updated per security rules).

---

## 6.1 Razorpay Webhook Handler (Cloud Function: `handleRazorpayWebhook`)

**Trigger:** HTTPS endpoint. Razorpay sends POST requests on payment/subscription events.
**URL:** `https://{region}-{project}.cloudfunctions.net/handleRazorpayWebhook`

**Security:**
1. **Signature Validation:** Extract `X-Razorpay-Signature` header. Generate HMAC-SHA256 of the raw request body using `RAZORPAY_WEBHOOK_SECRET` (stored in Secret Manager, NOT in `system_config`). Compare with header. If mismatch, return 400 and log to `system_logs`.
2. **No auth context** — this is an external webhook, not a callable function. Tenant identification comes from the payload.

**Input Payload (Razorpay standard):**
```json
{
  "entity": "event",
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_XXXXXX",
        "amount": 50000,
        "currency": "INR",
        "status": "captured",
        "notes": {
          "tenant_id": "tenant_abc",
          "purpose": "credit_topup"
        }
      }
    }
  }
}
```

**Idempotency Check (CRITICAL):**
Before processing, query `credit_transactions` where `idempotency_key == "razorpay_{payment_id}"`. If a doc exists, return 200 without processing. This prevents duplicate credits on Razorpay retries.

**Event Handlers:**

### `payment.captured` (Credit Top-Up)
1. Extract `tenant_id` from `payload.payment.entity.notes.tenant_id`.
2. Verify tenant exists in `tenants` collection.
3. Extract `amount` (in paisa from Razorpay — Razorpay amounts are in paisa for INR).
4. **Atomic Transaction:**
   - Increment `tenants/{tenant_id}.credits_balance` by `amount`.
   - Create `credit_transactions` doc: `{ tenant_id, amount: +amount, reason: "topup_razorpay", reference_id: payment_id, idempotency_key: "razorpay_{payment_id}", status: "confirmed", timestamp: now }`.
5. Return 200.

### `subscription.activated`
1. Extract `tenant_id` from subscription notes.
2. **Update `tenants/{tenant_id}`:**
   - `subscription_status`: "active".
   - `subscription_id`: from payload.
   - `plan_id`: map Razorpay plan to local plan ID.
   - `next_billing_date`: from payload.
   - `payment_method_status`: "valid".
3. Return 200.

### `subscription.charged` (Recurring payment success)
1. Update `tenants/{tenant_id}.next_billing_date` from payload.
2. Update `payment_method_status`: "valid".
3. Return 200.

### `subscription.pending` (Payment retry in progress)
1. Update `tenants/{tenant_id}.subscription_status`: "past_due".
2. Update `payment_method_status`: "failed".
3. Return 200.

### `subscription.halted` (All retries failed — subscription stopped)
1. Update `tenants/{tenant_id}.subscription_status`: "suspended".
2. Update `payment_method_status`: "failed".
3. Return 200.

### `payment.failed`
1. Update `tenants/{tenant_id}.payment_method_status`: "failed".
2. Return 200.

**Unhandled events:** Log to `system_logs` with severity "info" and return 200.

**Error handling:** If any processing fails, log to `system_logs` with severity "critical" and return 500 (Razorpay will retry).

## 6.2 Create Subscription Link (Cloud Function: `createSubscriptionLink`)

**Trigger:** Callable. Tenant admin clicks "Change Plan" or "Upgrade" on BillingScreen.

**Input Payload:**
```json
{
  "plan_id": "plan_basic_monthly"
}
```

**Auth Check:** Extract `tenant_id` from `context.auth.token.tenant_id`. Verify caller has role `tenant_admin`.

**Validation:**
1. `plan_id`: Required. Must be one of: "plan_basic_monthly", "plan_pro_monthly", "plan_pro_yearly".
2. Fetch `tenants/{tenant_id}`. If `subscription_status == 'active'` AND `plan_id` matches current plan, throw `FAILED_PRECONDITION`: "You are already on this plan."

**Logic:**
1. Call Razorpay Subscriptions API: `POST https://api.razorpay.com/v1/subscriptions`
   - Headers: Basic Auth with `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`.
   - Body: `{ plan_id: razorpay_plan_id, total_count: 12, notes: { tenant_id: tenant_id } }`.
2. Extract `short_url` from Razorpay response.

**Return:** `{ success: true, payment_link: "https://rzp.io/..." }`

**Error Codes:**
| Code | Condition |
|------|-----------|
| `FAILED_PRECONDITION` | Already on this plan |
| `UNAVAILABLE` | Razorpay API error |
| `PERMISSION_DENIED` | Not tenant_admin |

## 6.3 Brochure Indexing (Cloud Function: `indexBrochure`)

**Trigger:** Firebase Storage `onFinalize` — fires when a file is uploaded to `{tenant_id}/brochures/*`.

**Logic:**
1. **Extract text:** Download PDF from Storage. Use a PDF parsing library (e.g., `pdf-parse` for Node.js) to extract text content.
2. **Chunk text:** Split extracted text into chunks of ~500 tokens with 50-token overlap. Each chunk gets a metadata tag: `{ tenant_id, filename, chunk_index }`.
3. **Generate embeddings:** Call the Python Cloud Run service `POST /embed-text` endpoint for embedding generation.
   - `POST /embed-text` — Accepts text chunks, returns embedding vectors
4. **Store vectors:** Write to Firestore collection `brochure_vectors/{auto_id}`:
   - `tenant_id` (String)
   - `filename` (String)
   - `chunk_index` (Number)
   - `text` (String): The chunk text.
   - `embedding` (Vector): The embedding vector. Uses Firestore's native vector field type for vector search.
   - `created_at` (Timestamp)
5. **On file deletion:** A corresponding `onDelete` trigger should remove all `brochure_vectors` docs matching `tenant_id + filename`.

**Error handling:** If PDF parsing fails, log to `system_logs` and skip indexing. File remains in Storage but won't be searchable by AI.

**Note:** `aiReply` (§5) should update its "Vector Search" step to query `brochure_vectors` where `tenant_id` matches, using Firestore's `findNearest()` vector search.

---

## 7. Tasks & Follow-up Workflow

**Trigger:** User opens "Tasks" tab in App.

**Data Source:** `leads` collection.

**Query Logic (React App):**
* **Filter:**
    * `tenant_id` == Current Tenant.
    * `next_follow_up_at` <= NOW (Overdue & Today).
* **Sort:** `priority` (DESC), `next_follow_up_at` (ASC).
* **Index Required:** `leads` -> `tenant_id` + `next_follow_up_at` + `priority`.

**Task Creation:**
* **Manual:** Sales Rep sets `next_follow_up_at` in Lead Details.
* **Automatic:** System sets `next_follow_up_at = NOW + 2 days` when status changes to "contacted".

---

## 8. Scheduled Maintenance (Cloud Scheduler)

**1. Daily Usage Reset**
* **Schedule:** Every night at 00:00 IST.
* **Logic:**
    * Iterate all `tenants`.
    * Set `usage_current.whatsapp_sent_today` = 0.

**2. Message Queue Processor**
* **Schedule:** Every 5 minutes.
* **Logic:**
    * Query `message_queue` where `status` == "queued" AND `scheduled_at` <= NOW.
    * Execute `sendWhatsapp` logic.
    * Update status to "sent" or "failed".

**1b. Monthly Usage Reset**
* **Schedule:** 1st of every month at 00:05 IST.
* **Logic:**
    * Iterate all tenants.
    * Set `usage_current.whatsapp_sent_this_month` = 0.
    * Set `usage_current.leads_fetched_this_month` = 0.
    * Set `usage_current.enrichments_this_month` = 0.

**3. Enrichment Reconciliation**
* **Schedule:** Every 60 minutes.
* **Logic:**
    * Query `leads` where `enrichment_status == 'pending'` AND `created_at < (now - 30 minutes)`.
    * For each stale lead: set `enrichment_status` = "failed".
    * Refund credits: increment `tenants/{tenant_id}.credits_balance` by 50 per lead.
    * Create `credit_transactions` doc: `{ amount: 50, reason: "enrichment_timeout_refund", status: "confirmed" }`.
    * Log to `system_logs`.

**4. Balance Reconciliation (Weekly)**
* **Schedule:** Every Sunday at 02:00 IST.
* **Logic:**
    * For each tenant: sum all `credit_transactions.amount` where `tenant_id` matches AND `status != "refunded"`. Also flag any docs where `status == "reserved"` AND `timestamp` is older than 60 seconds — these indicate stuck `sendWhatsapp` calls requiring manual review.
    * Compare with `tenants/{tenant_id}.credits_balance`.
    * If mismatch > 0: create `system_logs` entry with severity "critical" and the discrepancy amount.

---

## 9. Client Error Logging (Cloud Function: `logError`)

**Trigger:** Callable. React app's global error handler (ErrorBoundary) calls this when a crash occurs.
**Input Payload:**
```json
{
  "source": "web_app",
  "severity": "critical",
  "error_message": "TypeError: Cannot read properties of null (reading 'tenant_id')",
  "stack_trace": "...",
  "device_info": {
    "browser": "Chrome 120",
    "os": "Windows 11",
    "app_version": "1.0.2"
  },
  "state_snapshot": {
    "last_route": "/leads/abc123",
    "viewport": "1920x1080"
  }
}
```
**Auth Check:** `context.auth` must exist (user must be logged in). Extract `tenant_id` and `user_id` from auth context.

**Validation:**
1. `source`: Required. Must be one of: "web_app", "web_dashboard", "pwa".
2. `severity`: Required. Must be one of: "critical", "warning", "info".
3. `error_message`: Required. Max 5000 chars.
4. `stack_trace`: Optional. Max 20000 chars.
5. **PII Stripping:** Before writing, strip any field value containing patterns matching: passwords, auth tokens, credit card numbers, API keys. Replace with "[REDACTED]".

**Logic:**
* Create `system_logs` doc with all provided fields + `tenant_id` + `user_id` + `timestamp`: `now` + `status`: "open".

**Return:** { `success`: true, `log_id`: "auto_generated_id" }

**Rate Limit:** Max 10 calls per minute per user to prevent log spam.

---

## 10.1 Send Team Invitation (Cloud Function: `sendInvite`)

**Trigger:** Callable. Tenant admin invites a team member.

**Input Payload:**
```json
{
  "email": "john@example.com",
  "role": "sales_rep"
}
```

**Auth Check:** Extract `tenant_id` from `context.auth.token.tenant_id`. Verify caller has role `tenant_admin`.

**Validation:**
1. `email`: Required. Must be valid email format.
2. `role`: Required. Must be one of: "sales_rep", "tenant_admin".
3. **Duplicate check:** Query `invitations` where `email == input.email` AND `tenant_id == caller_tenant_id` AND `status == 'pending'` AND `expires_at > now`. If found, throw `ALREADY_EXISTS`: "A pending invitation already exists for this email."
4. **Existing member check:** Query `users` where `email == input.email` AND `tenant_id == caller_tenant_id` AND `is_active == true`. If found, throw `ALREADY_EXISTS`: "This person is already a member of your team."

**Logic:**
1. Generate secure token: `crypto.randomBytes(32).toString('hex')`.
2. Hash token for storage: `SHA256(token)`.
3. Create `invitations` doc:
   - `tenant_id`: caller's tenant.
   - `email`: input email.
   - `role`: input role.
   - `token`: hashed token.
   - `status`: "pending".
   - `invited_by`: caller UID.
   - `created_at`: now.
   - `expires_at`: now + 48 hours.
4. **Audit & Logging Note:** Must create an `activity_logs` entry with action `team_invited`. Must set audit fields on both invitation and log creation.
5. **Send email via messaging provider:** call messagingProvider.sendEmail() (see 20_Communication_Provider_Abstraction.md §2). MSG91 handles email delivery in MVP; provider can be swapped without changing this logic.
   - To: input email.
   - Subject: "You've been invited to join {company_name} on CoCRM".
   - Body: Join link with UNHASHED token: `https://app.cocrm.com/join?token={raw_token}`.

**Return:** `{ success: true, invitation_id: "..." }`

**Error Codes:**
| Code | Condition |
|------|-----------|
| `ALREADY_EXISTS` | Pending invite or existing member |
| `INVALID_ARGUMENT` | Bad email format or invalid role |
| `PERMISSION_DENIED` | Not tenant_admin |

## 10.2 Validate Invitation (Cloud Function: `validateInvitation`)

**Trigger:** Callable. InviteAcceptScreen calls this to display invitation details.

**Input Payload:**
```json
{
  "token": "raw_unhashed_token"
}
```

**Auth Check:** None required — this may be called before authentication.

**Logic:**
1. Hash the provided token: `SHA256(token)`.
2. Query `invitations` where `token == hashed_token`. If not found, return `{ status: "not_found" }`.
3. If `status == "accepted"`, return `{ status: "used" }`.
4. If `expires_at < now`, return `{ status: "expired" }`.
5. Fetch `tenants/{invitation.tenant_id}` to get `company_name`.

**Return:**
```json
{
  "status": "valid",
  "company_name": "Rahul's Study Center",
  "role": "sales_rep",
  "email": "john@example.com"
}
```

## 10.3 Assign Tenant on Signup (Cloud Function: `assignTenantOnSignup`)

**Trigger:** Callable. InviteAcceptScreen calls this after user authenticates and taps "Join Team".

**Input Payload:**
```json
{
  "token": "raw_unhashed_token"
}
```

**Auth Check:** `context.auth` must exist (user must be authenticated).

**Logic:**
1. Hash the provided token. Look up `invitations` where `token == hashed_token` AND `status == 'pending'`.
2. **Verify:** `expires_at > now`. If expired, throw `FAILED_PRECONDITION`: "Invitation expired."
3. **Verify:** `email` matches `context.auth.token.email`. If mismatch, throw `FAILED_PRECONDITION`: "This invitation was sent to a different email address."
4. **Check existing tenant:** If caller already has `tenant_id` in custom claims AND it's a DIFFERENT tenant, throw `FAILED_PRECONDITION`: "You already belong to another organization. Contact support to switch."
5. **Set Claims:** `{ tenant_id: invitation.tenant_id, role: invitation.role }`.
6. **Create User Doc:** `users/{auth_uid}` with `tenant_id`, `role`, `name` (from auth profile), `email`, `is_active: true`.
7. **Update Invitation:** Set `status: "accepted"`.

**Permissions & Audit Note:** Must set default `permissions` map on the new user doc based on their assigned role defaults from `21_Standard_SaaS_Features.md` §9.4. Must set audit fields on create.

**Return:** `{ success: true, requires_token_refresh: true }`

## 10.4 Remove Team Member (Cloud Function: `removeUser`)

**Trigger:** Callable. Tenant admin removes a team member.

**Input Payload:**
```json
{
  "user_id": "uid_to_remove"
}
```

**Auth Check:** Extract `tenant_id` from `context.auth.token.tenant_id`. Verify caller has role `tenant_admin`. Verify target user belongs to the SAME `tenant_id`.

**Validation:**
1. Caller cannot remove themselves.
2. Target user must exist and be active.

**Logic:**
1. Remove custom claims from target user's Auth Token (set `tenant_id: null, role: null`).
2. Set `users/{user_id}.is_active` = false.
3. **Lead Reassignment:** Query `leads` where `assigned_to == user_id` AND `tenant_id == caller_tenant_id`. For each: set `assigned_to: null`, `follow_up_owner: null`.

**Audit & Logging Note:** Must create an `activity_logs` entry with action `team_removed`. Must set audit fields on user update and log creation.

**Return:** `{ success: true, leads_reassigned: count }`

---

## 11. Push Notifications (FCM)

**Dependency:** Firebase Cloud Messaging (FCM) with Web Push for PWA. The React app registers a service worker for push notifications.
**Token Management:** `fcm_token` field on `users` collection. Updated by the React app on service worker registration and token refresh. The app requests notification permission on first login and stores the FCM web push token. Cleared on sign-out.
**PWA Limitation:** Push notifications require the user to grant browser notification permission. On iOS Safari (PWA), push is supported from iOS 16.4+. The app should gracefully degrade — if push is denied, in-app notification polling via `notifications` collection serves as fallback.

**Notification Triggers:**

### 11.1 Inbound WhatsApp Message
* **Trigger:** `handleInboundMessage` CF (§4.1), after Step 5.
* **Recipients:** All active users in the tenant (query `users` where `tenant_id` matches AND `is_active == true`). Send to all `fcm_token` values.
* **Payload:**
```json
{
  "notification": {
    "title": "{lead_business_name}",
    "body": "New message: \"{truncated_content}\""
  },
  "data": {
    "type": "inbound_whatsapp",
    "lead_id": "...",
    "route": "/messages/{lead_id}"
  }
}
```
* **Condition:** Do NOT send if the user currently has the ConversationScreen open for this lead (use `data`-only message and let client suppress if active).

### 11.2 AI Draft Ready
* **Trigger:** `aiReply` CF (§5), after draft interaction is created.
* **Recipients:** `follow_up_owner` of the lead (if set), otherwise all active users in tenant.
* **Payload:**
```json
{
  "notification": {
    "title": "Draft reply ready",
    "body": "AI drafted a reply to {lead_business_name}. Tap to review."
  },
  "data": {
    "type": "draft_ready",
    "lead_id": "...",
    "route": "/messages/{lead_id}"
  }
}
```

### 11.3 Trial Expiring (Scheduled)
* **Trigger:** Scheduled function, runs daily at 10:00 AM IST.
* **Logic:** Query `tenants` where `subscription_status == 'trial'` AND `trial_ends_at` is within 48 hours. For each, send to all active users.
* **Payload:**
```json
{
  "notification": {
    "title": "Trial ending soon",
    "body": "Your free trial ends in {days_remaining} day(s). Upgrade to keep your {lead_count} leads."
  },
  "data": {
    "type": "trial_expiring",
    "route": "/billing"
  }
}
```
* **Frequency:** Send once at 48 hours and once at 24 hours. Track via a `last_trial_notification_at` field on tenant (or use `system_logs` to avoid re-sending).

### 11.4 Credits Low
* **Trigger:** Inside `sendWhatsapp` CF (§4), after successful Phase 3a — check if `credits_balance` after deduction is < 10000 (₹100).
* **Recipients:** Tenant admin only (query `users` where `tenant_id` matches AND `role == 'tenant_admin'`).
* **Payload:**
```json
{
  "notification": {
    "title": "Credits running low",
    "body": "You have ₹{balance_formatted} left (~{messages_remaining} messages). Top up to keep messaging."
  },
  "data": {
    "type": "credits_low",
    "route": "/billing/topup"
  }
}
```
* **Throttle:** Max 1 notification per tenant per 24 hours for this trigger. Track via `last_credits_low_notification_at` on tenant doc.

**Invalid Token Cleanup:** If FCM returns `messaging/registration-token-not-registered`, set `users/{uid}.fcm_token` = null. Do not retry.
---

## 12. Account Deletion (Cloud Function: `deleteAccount`) — Phase 2

**Trigger:** Callable. User taps "Delete My Account" in Settings.
**Status:** NOT IMPLEMENTED IN MVP. Required before production launch (GDPR/privacy compliance).

**Planned Logic:**
1. **Auth Check:** Verify `context.auth` exists. Extract `tenant_id` and `user_id`.
2. **Self-only:** User can only delete their own account.
3. **If Tenant Admin (sole admin):**
    * Warn: "You are the only admin. Deleting your account will deactivate the entire organization."
    * On confirmation: set `tenants/{tenant_id}.subscription_status` = "cancelled".
4. **Data Handling:**
    * Set `users/{user_id}.is_active` = false.
    * Set `assigned_to` = null on all leads where `assigned_to == user_id`.
    * Remove custom claims.
    * Schedule `FirebaseAuth.deleteUser(uid)` (or call immediately).
5. **Data NOT deleted:** `leads`, `interactions`, `credit_transactions` remain (they belong to the tenant, not the user). PII fields in `users` doc can be overwritten with "[deleted]".

**Return:** `{ success: true }`

---

## 13. Update User Profile (Cloud Function: `updateUserProfile`)

**Trigger:** Callable.
**Input:** `{ "name": "Rahul Kumar", "phone": "+919876543210" }` (both optional, at least one required).
**Auth Check:** `context.auth` must exist. User updates their OWN doc only (`users/{context.auth.uid}`).
**Validation:** `name` min 2, max 50, trimmed. `phone` valid format, optional.
**Logic:** Build update map + set audit fields (`updated_at: now`, `updated_by: context.auth.uid`). Write to `users/{context.auth.uid}`.
**Return:** `{ success: true }`.
**Why CF:** `users` collection is write-locked to Super Admin in security rules.

---

## 14. Log Login Event (Cloud Function: `logLoginEvent`)

**Trigger:** Callable. Called by client after successful Firebase Auth sign-in.
**Input:** `{ "event_type": "login_success", "auth_method": "google", "device_info": { "browser": "Chrome 120", "os": "Windows 11", "app_version": "1.0.0" } }`.
**Auth Check:** `context.auth` must exist.
**Logic:** 
1. Extract IP address.
2. Extract user agent from headers.
3. Create `login_history` doc with: `tenant_id` (from claims, may be null for pre-tenant users), `user_id`, `event_type`, `auth_method`, `ip_address`, `user_agent`, `device_info`, `created_at`, `created_by`. 
4. Update `users/{uid}.last_login_at = now`.
**Rate Limit:** Max 5 per minute per user.
**Return:** `{ success: true }`.

---

## 15. Update User Permissions (Cloud Function: `updateUserPermissions`)

**Trigger:** Callable.
**Input:** `{ "user_id": "uid_target", "permissions": { "leads_view_all": true, "leads_export": true, ... } }`.
**Auth Check:** Caller must be `tenant_admin` of the SAME tenant as target user.
**Validation:** Cannot edit own permissions. Cannot edit another `tenant_admin`'s permissions. All permission keys must be from the allowed set (see Doc 21 §9.2).
**Logic:** 
1. Update `users/{user_id}.permissions` map + set `updated_at`, `updated_by`. 
2. Create `activity_logs` entry with action `"permissions_changed"`, `entity_type: "user"`, `entity_id: user_id`, audit fields.
**Return:** `{ success: true }`.

---

End of File
