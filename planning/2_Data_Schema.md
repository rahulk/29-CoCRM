# Database Schema (Firestore NoSQL)

**Architecture Principle:** Shared Database, Logical Isolation.
**CRITICAL RULE:** Every document in EVERY collection (except `system_config`) **MUST** have a `tenant_id` field.
**CRITICAL RULE #2:** Every document in every mutable collection MUST have `created_at`, `created_by`, `updated_at`, `updated_by` audit fields. Append-only collections (`interactions`, `credit_transactions`, `brochure_vectors`, `login_history`, `activity_logs`) need only `created_at` and `created_by`. See `21_Standard_SaaS_Features.md` §1 for actor identification rules.

## 1. Collection: `tenants` (Root Level)

* **Purpose:** Stores the "Business Customer" details and their subscription state.
* **Document ID:** `tenant_id` (Auto-generated UUID or slug like "rahuls-classes").
* **Fields:**
* `company_name` (String): e.g., "Rahul's Study Center".
* `owner_email` (String): Primary contact.
* `subscription_plan` (String): "basic_monthly", "pro_yearly".
* `subscription_status` (String): "pending", "active", "past_due", "trial", "suspended", "cancelled".
* `trial_ends_at` (Timestamp): When the free trial expires.
* `credits_balance` (Integer): **CRITICAL.** Ledger for usage in **paisa** (e.g., 50000 = ₹500.00). ALL deductions are in paisa.
* `subscription_id` (String): Razorpay subscription ID (e.g., `sub_12345`). Set by `handleWebhook` CF on `subscription.activated` event.
* `plan_id` (String): Razorpay plan identifier. "plan_basic_monthly", "plan_pro_yearly". Maps to `subscription_plan` for display.
* `next_billing_date` (Timestamp): Next Razorpay charge date. Updated by webhook on each successful payment.
* `payment_method_status` (String): "valid", "expiring_soon", "failed". Updated by Razorpay webhook.
* `onboarding_step` (String): Tracks onboarding progress. CF-set values: "company_created" (set by `createTenant`), "trial_activated" (set by `activateTrial`), "complete" (set post-onboarding checklist). Intermediate steps (search, preview) are NOT persisted — they are inferred from data at runtime. See `14_Self_Serve_Onboarding.md` §2.5 for resumption logic.
* `config` (Map):
* `whatsapp_phone_id` (String): From messaging provider (MSG91 in MVP). The business phone number ID used for WhatsApp messaging.
* `target_city` (String): e.g., "Pune".
* `target_country_code` (String): e.g., "IN", "US".
* `timezone` (String): e.g., "Asia/Kolkata". Tenant's local timezone for quiet hours enforcement. Default: "Asia/Kolkata" for country_code "IN". Set during onboarding or auto-derived from `target_country_code`.
* `dashboard_cards` (Map, Optional): Toggle visibility of dashboard metrics. Keys: `leads_count`, `messages_today`, `credits`, `follow_ups_due`, `hot_leads`, `unread_messages`, `response_rate`. All Boolean. Phase 2.
* `session_timeout_minutes` (Number, Optional): Auto-logout threshold. Default: null (no timeout). Phase 2+.


* `usage_limits` (Map):
* `max_leads_per_month` (Number): e.g., 1000.
* `max_whatsapp_msgs_daily` (Number): e.g., 500.


* `usage_current` (Map):
* `leads_fetched_this_month` (Number).
* `whatsapp_sent_this_month` (Number).
* `whatsapp_sent_today` (Number): Resets daily. Used for cap enforcement.
* `preview_searches_used` (Number): Max 3 for trial accounts.
* `enrichments_this_month` (Number): Count of enrichment operations this billing cycle. Reset monthly.


* `admin_notes` (String): Internal notes for Super Admin only. Written directly to Firestore by Super Admin via TenantDetailScreen (not via Cloud Function).
* `last_trial_notification_at` (Timestamp, Optional): Tracks last "trial expiring" push notification sent. Used by scheduled function (Doc 3 §11.3) to send only once at 48h and once at 24h before trial expiry.
* `last_credits_low_notification_at` (Timestamp, Optional): Tracks last "credits low" push notification sent. Used by sendWhatsapp CF (Doc 3 §11.4) to throttle to max 1 notification per tenant per 24 hours.
* `created_at` (Timestamp).
* `created_by` (String).
* `updated_at` (Timestamp).
* `updated_by` (String).
* `search_grids` (Subcollection):
    * **Document ID:** Auto-ID.
    * **Fields:**
        * `keyword` (String).
        * `latitude` (Number).
        * `longitude` (Number).
        * `radius_meters` (Number).
        * `frequency` (String): "weekly", "manual".
        * `is_recurring` (Boolean).
        * `last_run_at` (Timestamp).
        * `next_run_at` (Timestamp).
        * `leads_found_total` (Number).
        * `created_at` (Timestamp).
        * `created_by` (String).
        * `updated_at` (Timestamp).
        * `updated_by` (String).

## 1.1 Collection: `credit_transactions` (Root Level)
* **Purpose:** Immutable ledger of every credit change.
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String): **Foreign Key.**
    * `amount` (Integer): Negative for usage, Positive for top-up.
    * `reason` (String): "whatsapp_sent", "topup_inr_500", "opening_balance".
    * `reference_id` (String): e.g., `message_id` or `payment_id`.
    * `idempotency_key` (String, Optional): Unique key to prevent duplicate processing. For Razorpay webhooks: `razorpay_{payment_id}` or `razorpay_{event_id}`. Before creating a credit_transactions doc, check if one with this `idempotency_key` already exists. If so, skip processing.
    * `status` (String): Transaction processing state. Values:
        * `"confirmed"`: Transaction completed successfully. This is the default for top-ups, enrichment deductions, and trial opening balance.
        * `"reserved"`: Credits temporarily held during `sendWhatsapp` Phase 1 — the messaging provider API call has not yet completed.
        * `"refunded"`: The reserved credits were returned because the messaging provider API call failed or a validation check failed after reservation.
    * **Reconciliation Rule:** When summing credit_transactions for balance reconciliation, EXCLUDE docs where `status == "refunded"` (those deductions were reversed via FieldValue.increment on `credits_balance`). Sum only `"confirmed"` and `"reserved"` transactions. Any `"reserved"` docs older than 60 seconds indicate a stuck sendWhatsapp call — flag for manual review.
    * `timestamp` (Timestamp).
    * `created_at` (Timestamp).
    * `created_by` (String).
    * **Field Clarification:** `timestamp` is the canonical event time (used by Composite Index #4 for ledger ordering). `created_at` is the standard audit field required by CRITICAL RULE #2. Both are retained: `timestamp` for backward-compatible queries, `created_at` for audit consistency. Do NOT consolidate — update both on every write.



## 2. Collection: `users` (Root Level)

* **Purpose:** The staff members belonging to a Tenant.
* **Document ID:** `auth_uid` (Matches Firebase Authentication UID).
* **Fields:**
* `tenant_id` (String): **Foreign Key.** Links user to their specific company.
* `role` (String): "tenant_admin", "sales_rep", "super_admin".
* `name` (String).
* `email` (String).
* `phone` (String).
* `avatar_url` (String, Optional): Google profile photo URL or custom upload.
* `auth_provider` (String): "google", "email". Set on user creation.
* `last_login_at` (Timestamp): Updated on every sign-in.
* `permissions` (Map): Module-level access rights. Keys: `leads_view_all`, `leads_search`, `leads_export`, `leads_archive`, `communication_send`, `communication_ai_draft`, `billing_view`, `settings_manage`, `team_manage`. All Boolean. Defaults set by role — see `21_Standard_SaaS_Features.md` §9.4.
* `fcm_token` (String): For Push Notifications.
* `is_active` (Boolean).
* `created_at` (Timestamp).
* `created_by` (String).
* `updated_at` (Timestamp).
* `updated_by` (String).



## 3. Collection: `leads` (Root Level)

* **Purpose:** Potential customers found via Google Maps or Manual Entry.
* **Document ID:** 
    * **Google Leads:** `SHA256(tenant_id + google_place_id)` (Deterministic).
    * **Manual Leads:** Auto-ID.
* **Fields:**
* `tenant_id` (String): **Foreign Key.**
* `source` (String): "google_maps", "manual", "whatsapp_inbound" (auto-created when an unknown number sends an inbound WhatsApp message — see Doc 3 §4.1 Step 2), "facebook_ads" (Phase 2 — not implemented in MVP).
* `status` (String): "new", "qualified", "contacted", "responded", "demo_booked", "closed_won", "closed_lost". NOTE: `enrichment_pending` was REMOVED from this enum — enrichment state is tracked solely via the separate `enrichment_status` field to avoid desync. UI displays "Enriching..." based on `enrichment_status == 'pending'`, not `status`.
* `search_name` (String): Lowercase trimmed version of `business_details.name`. Set by `discoverLeads` and `enrichLeads` CFs. Used for prefix search.
* `is_archived` (Boolean, Default: false): Soft-delete flag.
* `archived_at` (Timestamp, Optional): When archived.
* `archived_by` (String, Optional): Who archived.
* `opt_in_status` (String): "none", "opted_in", "opted_out" (STOP received).
* `enrichment_status` (String): "pending", "completed", "failed".
* **Operational Fields (SMB Execution):**
    * `priority` (String): "hot", "warm", "cold". (Derived from AI Score).
    * `next_follow_up_at` (Timestamp).
    * `last_contacted_at` (Timestamp).
    * `follow_up_owner` (String): UID of responsible person (Owner/Manager).
* `business_details` (Map):
* `name` (String).
* `address` (String).
* `phone` (String).
* `google_place_id` (String): For de-duplication.
* `website` (String).
* `rating` (Number).
* `review_count` (Number).


* `contact_details` (Map) - *Populated by Apify*:
    * `phone` (String): Contact phone number (may differ from business_details.phone). Used by handleInboundMessage (Doc 3 §4.1) for lead lookup: `contact_details.phone == sender_phone`. Indexed by Composite Index #15.
    * `email` (String).
    * `social` (Map):
        * `facebook` (String).
        * `instagram` (String).
        * `linkedin` (String).


* `ai_analysis` (Map):
* `score` (Number): 1-100 (Propensity to buy).
* `summary` (String): "High potential. Has website but no booking engine."
* `suggested_pitch` (String).


* `assigned_to` (String): User UID (Sales Rep).
* `created_at` (Timestamp).
* `created_by` (String).
* `updated_at` (Timestamp).
* `updated_by` (String).
* `last_interaction_at` (Timestamp).
* **Inbox Denormalization Fields (MVP):**
    * `last_message_preview` (String): Truncated last WhatsApp message text (~100 chars). Updated atomically by `sendWhatsapp` CF (outbound) and inbound WhatsApp webhook handler.
    * `has_unread_message` (Boolean): Set `true` by inbound webhook, set `false` by client when ConversationScreen opens. Drives blue dot indicator in InboxScreen.
    * `has_pending_draft` (Boolean): Set `true` by `aiReply` CF when a draft is generated, set `false` by client on draft approve/dismiss. Drives "✨ Draft ready" indicator in InboxScreen.



## 4. Collection: `interactions` (Root Level)

* **Purpose:** Audit trail of all communications.
* **Document ID:** Auto-ID.
* **Fields:**
* `tenant_id` (String): **Foreign Key.**
* `lead_id` (String): **Foreign Key.**
* `type` (String): "call", "whatsapp", "email", "sms", "note".
* `direction` (String): "inbound", "outbound".
* `content` (String): Message body or Call summary.
* `cost` (Integer): e.g., 80 (₹0.80).
* **Default cost values:** WhatsApp marketing = 80, WhatsApp utility = 30, Enrichment = 50, Calls = 0, Notes = 0, Email = 0. Client-created interactions (calls, notes) MUST set `cost: 0`.
* `metadata` (Map):
    * `duration_seconds` (Number).
    * `recording_url` (String).
    * `whatsapp_message_id` (String).
    * **Template Tracking:**
        * `template_name` (String): "intro_offer_v1".
        * `category` (String): "marketing", "utility", "authentication".
        * `pricing_unit_cost` (Integer): 80 (paisa).
    * **Draft Tracking:**
        * `is_draft` (Boolean): `true` if this interaction is an AI-generated draft awaiting approval. Set by `aiReply` CF. Draft interactions are excluded from the chat bubble list in the UI and shown only in the AI Draft Banner. Drafts are never updated or deleted (append-only rule) — they remain in history even after dismiss.
        * **IMPORTANT:** ALL non-draft interactions MUST set `is_draft: false` explicitly (never null/undefined). This enables clean Firestore queries filtering `where('metadata.is_draft', '==', false)` in ConversationScreen. `aiReply` CF sets `is_draft: true`; `sendWhatsapp` CF and client-created interactions (calls, notes) set `is_draft: false`.


* `timestamp` (Timestamp).
* `created_at` (Timestamp).
* `created_by` (String).




## 5. Collection: `products` (Root Level)

* **Purpose:** Catalog of items/services for AI Context (RAG).
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String): **Foreign Key.**
    * `name` (String): e.g., "MPSC Course - Monthly".
    * `price` (Integer): e.g., 150000 (= ₹1500.00). Stored in **paisa**.
    * `description` (String): "Access to AC library + 2 Mock Tests".
    * `billing_cycle` (String): "one_time", "monthly", "yearly". Used by AI for accurate quoting.
    * `is_active` (Boolean).
    * `created_at` (Timestamp).
    * `created_by` (String).
    * `updated_at` (Timestamp).
    * `updated_by` (String).
    * `is_archived` (Boolean, Default: false): Soft-delete flag. See Doc 0 B13.
    * `archived_at` (Timestamp, Optional): When archived.
    * `archived_by` (String, Optional): UID of user who archived.
    * `metadata` (Map, Optional):
        * `duration` (String): e.g., "6 months".
        * `mode` (String): e.g., "Offline", "Online", "Hybrid".


## 5.1 Collection: `invitations` (Root Level)

* **Purpose:** Tracks pending and accepted team invitations. Created by `sendInvite` CF, consumed by `assignTenantOnSignup` CF.
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String): **Foreign Key.** The tenant this invitation belongs to.
    * `email` (String): Invitee's email address.
    * `role` (String): "sales_rep", "tenant_admin". The role to assign on acceptance.
    * `token` (String): Secure, hashed invitation token. Included in the join link.
    * `status` (String): "pending", "accepted".
    * `invited_by` (String): UID of the tenant_admin who sent the invite.
    * `created_at` (Timestamp).
    * `created_by` (String).
    * `updated_at` (Timestamp).
    * `updated_by` (String).
    * `expires_at` (Timestamp): Token expiry. Default: 48 hours after creation.

## 6. Collection: `system_logs` (Root Level)

* **Purpose:** Error logging for AI Auto-Debugging.
* **Document ID:** Auto-ID.
* **Fields:**
* `tenant_id` (String): Optional.
* `user_id` (String): Optional.
* `source` (String): "web_app", "cloud_function", "web_dashboard", "pwa".
* `severity` (String): "critical", "warning", "info".
* `error_message` (String).
* `stack_trace` (String).
* `device_info` (Map):
    * `browser` (String): e.g., "Chrome 120", "Safari 17.2".
    * `os` (String): e.g., "Windows 11", "macOS 14", "Android 14".
    * `app_version` (String): PWA version from build metadata.


* `state_snapshot` (Map): Context (e.g., last route, memory usage).
* `status` (String): "open", "resolved".
* `timestamp` (Timestamp).
* `created_at` (Timestamp).
* `created_by` (String).
* `updated_at` (Timestamp).
* `updated_by` (String).



## 7. Collection: `system_config` (Root Level - PROTECTED)

* **Purpose:** Global SaaS configuration. Only Super Admin can read.
* **Document ID:** `global_settings`.
* **Fields:**
* `google_places_api_key` (String).
* `apify_token` (String).
* `vertex_ai_project_id` (String).
* `razorpay_key_id` (String).
* `razorpay_key_secret` (String).
* `min_app_version` (String): Force update mechanism.
* `created_at` (Timestamp).
* `created_by` (String).
* `updated_at` (Timestamp).
* `updated_by` (String).



## 7.1 Collection: `system_config_public` (Root Level - PUBLIC)

* **Purpose:** Public-readable subset of system configuration. Separated from `system_config` so regular users can read `min_app_version` without super_admin access.
* **Document ID:** `app_settings`.
* **Fields:**
    * `min_app_version` (String): e.g., "1.2.0". If client version is lower, ForceUpdateScreen blocks all access.
    * `created_at` (Timestamp).
    * `created_by` (String).
    * `updated_at` (Timestamp).
    * `updated_by` (String).
* **Write Access:** Super Admin only (via direct Firestore write or when updating `system_config`).
* **Read Access:** Any authenticated user.



## 7.2 Collection: `brochure_vectors` (Root Level)

* **Purpose:** Stores text chunks + vector embeddings from uploaded tenant PDFs for the RAG pipeline. Written exclusively by the `indexBrochure` Cloud Function (triggered on Storage upload). Queried by `aiReply` CF using Firestore `findNearest()` vector search.
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String): **Foreign Key.**
    * `filename` (String): Original PDF filename (e.g., "rate_card_2025.pdf"). Used with `tenant_id` to delete all chunks when a brochure is removed.
    * `chunk_index` (Number): Zero-based position of this chunk within the source document. Used for ordering context snippets.
    * `text` (String): The raw text content of this chunk (~500 tokens with 50-token overlap with adjacent chunks).
    * `embedding` (Vector): Vertex AI embedding vector (`textembedding-gecko@003`). Uses Firestore's native vector field type for `findNearest()` queries.
    * `created_at` (Timestamp).
    * `created_by` (String).




## 7.3 Collection: `login_history` (Root Level)

* **Purpose:** Audit trail of every authentication event.
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String, optional).
    * `user_id` (String).
    * `event_type` (String): "login_success", "login_failed", "logout", "password_reset_requested", "password_changed".
    * `auth_method` (String): "google", "email_password".
    * `ip_address` (String).
    * `user_agent` (String).
    * `device_info` (Map): `{ browser, os, app_version }`.
    * `created_at` (Timestamp).
    * `created_by` (String).

## 7.4 Collection: `notifications` (Root Level)

* **Purpose:** In-app notification feed per user.
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String).
    * `user_id` (String).
    * `title` (String).
    * `body` (String).
    * `type` (String): "lead_reply", "ai_draft_ready", "credits_low", "trial_expiring", "task_due", "team_joined", "system".
    * `reference_type` (String): "lead", "invitation", "billing", "task".
    * `reference_id` (String).
    * `is_read` (Boolean, default false).
    * `created_at` (Timestamp).
    * `created_by` (String).
    * `updated_at` (Timestamp).
    * `updated_by` (String).

## 7.5 Collection: `activity_logs` (Root Level)

* **Purpose:** Tenant-scoped audit trail of significant user actions.
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String).
    * `user_id` (String).
    * `user_name` (String, denormalized).
    * `action` (String): "lead_created", "lead_archived", "lead_exported", "whatsapp_sent", "team_invited", "team_removed", "settings_updated", "product_added", "brochure_uploaded", "permissions_changed".
    * `entity_type` (String): "lead", "product", "user", "tenant", "brochure".
    * `entity_id` (String).
    * `entity_name` (String, denormalized).
    * `details` (Map, optional).
    * `created_at` (Timestamp).
    * `created_by` (String).


## 8. Firestore Indexes (Required)

**Composite Indexes:**
1. **Leads Query:** `leads` -> `tenant_id` (ASC) + `created_at` (DESC)
2. **Leads Status:** `leads` -> `tenant_id` (ASC) + `status` (ASC) + `created_at` (DESC)
3. **Interactions:** `interactions` -> `tenant_id` (ASC) + `lead_id` (ASC) + `timestamp` (DESC)
4. **Credit Ledger:** `credit_transactions` -> `tenant_id` (ASC) + `timestamp` (DESC)
5. **My Leads:** `leads` -> `tenant_id` (ASC) + `assigned_to` (ASC) + `last_interaction_at` (DESC)
6. **Contactable Leads:** `leads` -> `tenant_id` (ASC) + `opt_in_status` (ASC)
7. **Enrichment Queue:** `leads` -> `tenant_id` (ASC) + `enrichment_status` (ASC)
8. **Tasks Due:** `leads` -> `tenant_id` (ASC) + `next_follow_up_at` (ASC) + `priority` (ASC)
9. **Message Queue:** `message_queue` -> `tenant_id` (ASC) + `status` (ASC) + `scheduled_at` (ASC)
10. **Inbox Query:** `leads` -> `tenant_id` (ASC) + `last_interaction_at` (DESC)
11. **Opted Out Filter:** `leads` -> `tenant_id` (ASC) + `opt_in_status` (ASC) + `created_at` (DESC)
12. **Priority Filter:** `leads` -> `tenant_id` (ASC) + `priority` (ASC) + `created_at` (DESC)
13. **Invitation Lookup:** `invitations` -> `email` (ASC) + `status` (ASC) + `expires_at` (DESC)
14. **Phone Lookup:** `leads` -> `tenant_id` (ASC) + `business_details.phone` (ASC)
15. **Contact Phone Lookup:** `leads` -> `tenant_id` (ASC) + `contact_details.phone` (ASC)
16. **Conversation Query:** `interactions` -> `tenant_id` (ASC) + `lead_id` (ASC) + `metadata.is_draft` (ASC) + `timestamp` (ASC)
17. **Lead Prefix Search:** `leads` → `tenant_id` (ASC) + `search_name` (ASC)
18. **Archived Leads Filter:** `leads` → `tenant_id` (ASC) + `is_archived` (ASC) + `created_at` (DESC)
19. **Notification Feed:** `notifications` → `user_id` (ASC) + `is_read` (ASC) + `created_at` (DESC)
20. **Activity Feed:** `activity_logs` → `tenant_id` (ASC) + `created_at` (DESC)
21. **Filtered Activity:** `activity_logs` → `tenant_id` (ASC) + `action` (ASC) + `created_at` (DESC)

**Note on `is_archived` and existing lead indexes:** Default lead list queries now include `.where('is_archived', '==', false)`. Composite Index #18 (`tenant_id` + `is_archived` + `created_at`) covers the primary archived-leads filter. For indexes 1, 2, 5, 8, 10, 11, and 12: Firestore's query planner handles the additional equality filter on `is_archived` via index merging with Index #18. If query performance degrades, add `is_archived` as an explicit field to those indexes. Monitor query performance post-launch and promote to explicit composite indexes as needed.

## 9. Collection: `message_queue` (Root Level)

* **Purpose:** Buffers WhatsApp messages during quiet hours or high load.
* **Document ID:** Auto-ID.
* **Fields:**
    * `tenant_id` (String): **Foreign Key.**
    * `lead_id` (String): **Foreign Key.**
    * `template_name` (String).
    * `payload` (Map): Variable values for the template.
    * `scheduled_at` (Timestamp): When it should be sent.
    * `status` (String): "queued", "processing", "sent", "failed".
    * `created_at` (Timestamp).
    * `created_by` (String).
    * `updated_at` (Timestamp).
    * `updated_by` (String).
    * `attempts` (Number).
    * `last_error` (String).

---
