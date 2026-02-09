"Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable)."

# 26. Seed Data for Cloud Environments (Dev/Prod)

**Purpose:** Pre-built Firestore documents for populating the Development (`cocrm-dev`) and Production (`cocrm-prod`) environments. Use this to quickly set up test tenants, products, and user scenarios without manual entry.

**Usage:** Create a `scripts/seed.ts` (using `firebase-admin` SDK) that writes these docs programmatically. Run via `ts-node scripts/seed.ts`.

---

## 1. Super Admin User

```json
// AUTH: Create in Firebase Auth Emulator
{
  "uid": "sa_uid_001",
  "email": "admin@cocrm.com",
  "password": "Admin@123456",
  "displayName": "CoCRM Admin"
}

// CUSTOM CLAIMS
{
  "role": "super_admin",
  "tenant_id": null
}
```

```json
// FIRESTORE: users/sa_uid_001
{
  "email": "admin@cocrm.com",
  "name": "CoCRM Admin",
  "phone": "+919999900000",
  "role": "super_admin",
  "tenant_id": null,
  "auth_provider": "email",
  "avatar_url": null,
  "is_active": true,
  "fcm_token": null,
  "permissions": {},
  "last_login_at": "2026-01-15T10:00:00Z",
  "created_at": "2026-01-01T00:00:00Z",
  "created_by": "system:bootstrap",
  "updated_at": "2026-01-15T10:00:00Z",
  "updated_by": "sa_uid_001"
}
```

---

## 2. Tenant A — Active Trial (Primary Test Tenant)

### 2.1 Tenant Document

```json
// FIRESTORE: tenants/tenant_a
{
  "company_name": "Rahul's Study Center",
  "config": {
    "target_city": "Pune",
    "target_country_code": "IN",
    "whatsapp_phone_id": "wp_phone_001",
    "timezone": "Asia/Kolkata"
  },
  "subscription_status": "trial",
  "credits_balance": 42500,
  "trial_ends_at": "2026-02-20T23:59:59Z",
  "onboarding_step": "trial_activated",
  "plan_id": null,
  "subscription_id": null,
  "next_billing_date": null,
  "payment_method_status": null,
  "usage_limits": {
    "max_leads_per_month": 1000,
    "max_whatsapp_msgs_daily": 500
  },
  "usage_current": {
    "leads_fetched_this_month": 47,
    "whatsapp_sent_this_month": 12,
    "whatsapp_sent_today": 3,
    "preview_searches_used": 2,
    "enrichments_this_month": 15
  },
  "admin_notes": "",
  "last_trial_notification_at": null,
  "last_credits_low_notification_at": null,
  "created_at": "2026-02-01T09:00:00Z",
  "created_by": "user_rahul_001",
  "updated_at": "2026-02-09T08:30:00Z",
  "updated_by": "user_rahul_001"
}
```

### 2.2 Tenant A Users

```json
// AUTH: user_rahul_001
{
  "uid": "user_rahul_001",
  "email": "rahul@studycenter.com",
  "password": "Test@123456",
  "displayName": "Rahul Kulkarni"
}
// CLAIMS: { "tenant_id": "tenant_a", "role": "tenant_admin" }

// FIRESTORE: users/user_rahul_001
{
  "email": "rahul@studycenter.com",
  "name": "Rahul Kulkarni",
  "phone": "+919876543210",
  "role": "tenant_admin",
  "tenant_id": "tenant_a",
  "auth_provider": "email",
  "avatar_url": null,
  "is_active": true,
  "fcm_token": null,
  "permissions": {
    "leads_view_all": true,
    "leads_search": true,
    "leads_export": true,
    "leads_archive": true,
    "communication_send": true,
    "communication_ai_draft": true,
    "billing_view": true,
    "settings_manage": true,
    "team_manage": true
  },
  "last_login_at": "2026-02-09T08:00:00Z",
  "created_at": "2026-02-01T09:00:00Z",
  "created_by": "system:createTenant",
  "updated_at": "2026-02-09T08:00:00Z",
  "updated_by": "user_rahul_001"
}
```

```json
// AUTH: user_priya_001
{
  "uid": "user_priya_001",
  "email": "priya@studycenter.com",
  "password": "Test@123456",
  "displayName": "Priya Sharma"
}
// CLAIMS: { "tenant_id": "tenant_a", "role": "sales_rep" }

// FIRESTORE: users/user_priya_001
{
  "email": "priya@studycenter.com",
  "name": "Priya Sharma",
  "phone": "+919876543211",
  "role": "sales_rep",
  "tenant_id": "tenant_a",
  "auth_provider": "google",
  "avatar_url": null,
  "is_active": true,
  "fcm_token": null,
  "permissions": {
    "leads_view_all": false,
    "leads_search": true,
    "leads_export": false,
    "leads_archive": false,
    "communication_send": true,
    "communication_ai_draft": true,
    "billing_view": false,
    "settings_manage": false,
    "team_manage": false
  },
  "last_login_at": "2026-02-08T14:00:00Z",
  "created_at": "2026-02-03T10:00:00Z",
  "created_by": "system:assignTenantOnSignup",
  "updated_at": "2026-02-08T14:00:00Z",
  "updated_by": "user_priya_001"
}
```

### 2.3 Tenant A Leads (8 leads across pipeline)

```json
// FIRESTORE: leads/{SHA256("tenant_a" + "ChIJ_lead_001")}
{
  "tenant_id": "tenant_a",
  "source": "google_maps",
  "status": "new",
  "search_name": "elite fitness gym",
  "is_archived": false,
  "opt_in_status": "none",
  "enrichment_status": "completed",
  "priority": "hot",
  "next_follow_up_at": "2026-02-10T10:00:00Z",
  "last_contacted_at": null,
  "last_interaction_at": null,
  "follow_up_owner": "user_rahul_001",
  "assigned_to": "user_rahul_001",
  "has_unread_message": false,
  "has_pending_draft": false,
  "last_message_preview": null,
  "business_details": {
    "name": "Elite Fitness Gym",
    "address": "FC Road, Shivajinagar, Pune 411004",
    "phone": "+912025551001",
    "google_place_id": "ChIJ_lead_001",
    "website": "https://elitefitnesspune.com",
    "rating": 4.5,
    "review_count": 230
  },
  "contact_details": {
    "phone": "+919800001001",
    "email": "info@elitefitness.com",
    "social": {
      "facebook": "https://facebook.com/elitefitnesspune",
      "instagram": "https://instagram.com/elitefitnesspune",
      "linkedin": null
    }
  },
  "ai_analysis": {
    "score": 85,
    "summary": "High potential. Active online presence with no digital marketing strategy. 230+ reviews indicate strong footfall.",
    "suggested_pitch": "Offer a free digital footprint audit. They have strong reviews but no WhatsApp channel."
  },
  "created_at": "2026-02-02T10:00:00Z",
  "created_by": "system:discoverLeads",
  "updated_at": "2026-02-05T12:00:00Z",
  "updated_by": "system:scoreLead"
}
```

```json
// FIRESTORE: leads/{SHA256("tenant_a" + "ChIJ_lead_002")}
{
  "tenant_id": "tenant_a",
  "source": "google_maps",
  "status": "contacted",
  "search_name": "bright minds coaching",
  "is_archived": false,
  "opt_in_status": "opted_in",
  "enrichment_status": "completed",
  "priority": "hot",
  "next_follow_up_at": "2026-02-11T14:00:00Z",
  "last_contacted_at": "2026-02-07T11:30:00Z",
  "last_interaction_at": "2026-02-07T11:30:00Z",
  "follow_up_owner": "user_rahul_001",
  "assigned_to": "user_rahul_001",
  "has_unread_message": false,
  "has_pending_draft": false,
  "last_message_preview": "Hi, we help coaching centers like yours...",
  "business_details": {
    "name": "Bright Minds Coaching",
    "address": "JM Road, Deccan Gymkhana, Pune 411004",
    "phone": "+912025551002",
    "google_place_id": "ChIJ_lead_002",
    "website": "https://brightminds.in",
    "rating": 4.2,
    "review_count": 89
  },
  "contact_details": {
    "phone": "+919800001002",
    "email": "contact@brightminds.in",
    "social": { "facebook": null, "instagram": "https://instagram.com/brightmindspune", "linkedin": null }
  },
  "ai_analysis": {
    "score": 78,
    "summary": "Strong coaching center with growing reviews. Website is basic. Good candidate for WhatsApp marketing.",
    "suggested_pitch": "Highlight WhatsApp-based parent communication and batch-wise follow-ups."
  },
  "created_at": "2026-02-02T10:01:00Z",
  "created_by": "system:discoverLeads",
  "updated_at": "2026-02-07T11:30:00Z",
  "updated_by": "user_rahul_001"
}
```

```json
// FIRESTORE: leads/{SHA256("tenant_a" + "ChIJ_lead_003")}
{
  "tenant_id": "tenant_a",
  "source": "google_maps",
  "status": "responded",
  "search_name": "zen yoga studio",
  "is_archived": false,
  "opt_in_status": "opted_in",
  "enrichment_status": "completed",
  "priority": "warm",
  "next_follow_up_at": "2026-02-12T09:00:00Z",
  "last_contacted_at": "2026-02-06T15:00:00Z",
  "last_interaction_at": "2026-02-08T09:15:00Z",
  "follow_up_owner": "user_priya_001",
  "assigned_to": "user_priya_001",
  "has_unread_message": true,
  "has_pending_draft": true,
  "last_message_preview": "Yes, I am interested. Can you share pricing?",
  "business_details": {
    "name": "Zen Yoga Studio",
    "address": "Koregaon Park, Pune 411001",
    "phone": "+912025551003",
    "google_place_id": "ChIJ_lead_003",
    "website": null,
    "rating": 4.8,
    "review_count": 156
  },
  "contact_details": {
    "phone": "+919800001003",
    "email": "zen.yoga.pune@gmail.com",
    "social": { "facebook": null, "instagram": "https://instagram.com/zenyogapune", "linkedin": null }
  },
  "ai_analysis": {
    "score": 65,
    "summary": "No website. High ratings. Relies on word-of-mouth. Good fit for WhatsApp marketing.",
    "suggested_pitch": "Offer a simple WhatsApp-based booking system. No website needed."
  },
  "created_at": "2026-02-02T10:02:00Z",
  "created_by": "system:discoverLeads",
  "updated_at": "2026-02-08T09:15:00Z",
  "updated_by": "system:handleInboundMessage"
}
```

```json
// FIRESTORE: leads/{SHA256("tenant_a" + "ChIJ_lead_004")}
{
  "tenant_id": "tenant_a",
  "source": "google_maps",
  "status": "new",
  "search_name": "prime academy classes",
  "is_archived": false,
  "opt_in_status": "none",
  "enrichment_status": "pending",
  "priority": null,
  "next_follow_up_at": null,
  "last_contacted_at": null,
  "last_interaction_at": null,
  "follow_up_owner": null,
  "assigned_to": null,
  "has_unread_message": false,
  "has_pending_draft": false,
  "last_message_preview": null,
  "business_details": {
    "name": "Prime Academy Classes",
    "address": "Kothrud, Pune 411038",
    "phone": "+912025551004",
    "google_place_id": "ChIJ_lead_004",
    "website": "https://primeacademy.co.in",
    "rating": 3.9,
    "review_count": 42
  },
  "contact_details": {},
  "ai_analysis": {},
  "created_at": "2026-02-05T14:00:00Z",
  "created_by": "system:discoverLeads",
  "updated_at": "2026-02-05T14:00:00Z",
  "updated_by": "system:discoverLeads"
}
```

```json
// FIRESTORE: leads/{SHA256("tenant_a" + "ChIJ_lead_005")}
{
  "tenant_id": "tenant_a",
  "source": "google_maps",
  "status": "new",
  "search_name": "powerhouse gym",
  "is_archived": false,
  "opt_in_status": "none",
  "enrichment_status": "failed",
  "priority": null,
  "next_follow_up_at": null,
  "last_contacted_at": null,
  "last_interaction_at": null,
  "follow_up_owner": null,
  "assigned_to": null,
  "has_unread_message": false,
  "has_pending_draft": false,
  "last_message_preview": null,
  "business_details": {
    "name": "Powerhouse Gym",
    "address": "Baner, Pune 411045",
    "phone": "+912025551005",
    "google_place_id": "ChIJ_lead_005",
    "website": null,
    "rating": 4.1,
    "review_count": 67
  },
  "contact_details": {},
  "ai_analysis": {},
  "created_at": "2026-02-05T14:01:00Z",
  "created_by": "system:discoverLeads",
  "updated_at": "2026-02-05T15:00:00Z",
  "updated_by": "system:handleApifyWebhook"
}
```

```json
// leads/{SHA256("tenant_a" + "ChIJ_lead_006")} — status: "demo_booked", priority: warm
// leads/{SHA256("tenant_a" + "ChIJ_lead_007")} — status: "closed_won", priority: hot
// leads/{SHA256("tenant_a" + "ChIJ_lead_008")} — status: "closed_lost", priority: cold, is_archived: true
```

*Note: Leads 6–8 follow the same schema as above. Create with variety across statuses to test the full pipeline view.*

### 2.4 Tenant A Interactions (Message Thread for Lead 002)

```json
// FIRESTORE: interactions/int_001
{
  "tenant_id": "tenant_a",
  "lead_id": "{SHA256('tenant_a' + 'ChIJ_lead_002')}",
  "direction": "outbound",
  "channel": "whatsapp",
  "message_type": "template",
  "template_name": "intro_offer_v1",
  "content": "Hi Bright Minds Coaching! We help coaching centers grow their student base through WhatsApp. Interested in a free demo?",
  "whatsapp_message_id": "wamid_out_001",
  "status": "sent",
  "is_draft": false,
  "cost_paisa": 80,
  "sent_by": "user_rahul_001",
  "created_at": "2026-02-07T11:30:00Z",
  "created_by": "system:sendWhatsapp"
}

// FIRESTORE: interactions/int_002
{
  "tenant_id": "tenant_a",
  "lead_id": "{SHA256('tenant_a' + 'ChIJ_lead_002')}",
  "direction": "inbound",
  "channel": "whatsapp",
  "message_type": "text",
  "template_name": null,
  "content": "Sounds interesting! Can you tell me more about the pricing?",
  "whatsapp_message_id": "wamid_in_001",
  "status": "delivered",
  "is_draft": false,
  "cost_paisa": 0,
  "sent_by": null,
  "created_at": "2026-02-07T14:20:00Z",
  "created_by": "system:handleInboundMessage"
}

// FIRESTORE: interactions/int_003 — AI Draft (pending approval)
{
  "tenant_id": "tenant_a",
  "lead_id": "{SHA256('tenant_a' + 'ChIJ_lead_002')}",
  "direction": "outbound",
  "channel": "whatsapp",
  "message_type": "text",
  "template_name": null,
  "content": "Hi! We offer flexible plans starting at ₹999/month. Would you like to schedule a quick 10-minute demo this week?",
  "whatsapp_message_id": null,
  "status": "draft",
  "is_draft": true,
  "cost_paisa": 0,
  "sent_by": null,
  "created_at": "2026-02-07T14:21:00Z",
  "created_by": "system:aiReply"
}
```

### 2.5 Tenant A Credit Transactions

```json
// FIRESTORE: credit_transactions/ct_001 — Trial opening
{
  "tenant_id": "tenant_a",
  "amount": 50000,
  "reason": "trial_opening_balance",
  "reference_id": "tenant_a",
  "idempotency_key": "trial_opening_tenant_a",
  "status": "confirmed",
  "created_at": "2026-02-01T09:01:00Z",
  "created_by": "system:activateTrial"
}

// FIRESTORE: credit_transactions/ct_002 — WhatsApp send
{
  "tenant_id": "tenant_a",
  "amount": -80,
  "reason": "whatsapp_sent",
  "reference_id": "int_001",
  "idempotency_key": null,
  "status": "confirmed",
  "created_at": "2026-02-07T11:30:00Z",
  "created_by": "system:sendWhatsapp"
}

// FIRESTORE: credit_transactions/ct_003 — Enrichment
{
  "tenant_id": "tenant_a",
  "amount": -750,
  "reason": "enrichment",
  "reference_id": "batch_enrich_001",
  "idempotency_key": null,
  "status": "confirmed",
  "created_at": "2026-02-03T12:00:00Z",
  "created_by": "system:enrichLeads"
}

// FIRESTORE: credit_transactions/ct_004 — Enrichment refund (for failed lead_005)
{
  "tenant_id": "tenant_a",
  "amount": 50,
  "reason": "enrichment_refund",
  "reference_id": "{SHA256('tenant_a' + 'ChIJ_lead_005')}",
  "idempotency_key": null,
  "status": "confirmed",
  "created_at": "2026-02-05T15:00:00Z",
  "created_by": "system:handleApifyWebhook"
}
```

### 2.6 Tenant A Products

```json
// FIRESTORE: products/prod_001
{
  "tenant_id": "tenant_a",
  "name": "Foundation Batch (Class 8-10)",
  "description": "Covers Maths, Science, English for Class 8, 9, and 10 boards.",
  "price": 350000,
  "category": "coaching",
  "is_active": true,
  "created_at": "2026-02-02T10:00:00Z",
  "created_by": "user_rahul_001",
  "updated_at": "2026-02-02T10:00:00Z",
  "updated_by": "user_rahul_001"
}

// FIRESTORE: products/prod_002
{
  "tenant_id": "tenant_a",
  "name": "IIT-JEE Crash Course",
  "description": "60-day intensive prep for JEE Mains. Includes test series.",
  "price": 1500000,
  "category": "coaching",
  "is_active": true,
  "created_at": "2026-02-02T10:01:00Z",
  "created_by": "user_rahul_001",
  "updated_at": "2026-02-02T10:01:00Z",
  "updated_by": "user_rahul_001"
}
```

### 2.7 Tenant A Notifications

```json
// FIRESTORE: notifications/notif_001
{
  "user_id": "user_priya_001",
  "tenant_id": "tenant_a",
  "type": "lead_reply",
  "title": "New reply from Zen Yoga Studio",
  "body": "Yes, I am interested. Can you share pricing?",
  "target_route": "/conversations/{lead_003_id}",
  "is_read": false,
  "created_at": "2026-02-08T09:15:00Z",
  "created_by": "system:handleInboundMessage"
}
```

---

## 3. Tenant B — Active Subscription (Isolation Testing)

```json
// FIRESTORE: tenants/tenant_b
{
  "company_name": "FitZone Gyms",
  "config": {
    "target_city": "Mumbai",
    "target_country_code": "IN",
    "whatsapp_phone_id": "wp_phone_002",
    "timezone": "Asia/Kolkata"
  },
  "subscription_status": "active",
  "credits_balance": 150000,
  "trial_ends_at": "2026-01-20T23:59:59Z",
  "onboarding_step": "trial_activated",
  "plan_id": "plan_basic_monthly",
  "subscription_id": "sub_rzp_001",
  "next_billing_date": "2026-03-01T00:00:00Z",
  "payment_method_status": "valid",
  "usage_limits": {
    "max_leads_per_month": 2000,
    "max_whatsapp_msgs_daily": 1000
  },
  "usage_current": {
    "leads_fetched_this_month": 234,
    "whatsapp_sent_this_month": 89,
    "whatsapp_sent_today": 12,
    "preview_searches_used": 3,
    "enrichments_this_month": 50
  },
  "admin_notes": "Upgraded from trial on Jan 20",
  "created_at": "2026-01-13T09:00:00Z",
  "created_by": "user_amit_001",
  "updated_at": "2026-02-08T10:00:00Z",
  "updated_by": "system:handleRazorpayWebhook"
}
```

```json
// AUTH + FIRESTORE: users/user_amit_001
// email: amit@fitzone.com, role: tenant_admin, tenant_id: tenant_b
// (Full structure same as Rahul's user doc above)
```

*Tenant B exists to test data isolation: Tenant A users must NEVER see Tenant B data.*

---

## 4. Tenant C — Suspended Account (Edge Case Testing)

```json
// FIRESTORE: tenants/tenant_c
{
  "company_name": "QuickMart Retail",
  "config": {
    "target_city": "Delhi",
    "target_country_code": "IN",
    "whatsapp_phone_id": null,
    "timezone": "Asia/Kolkata"
  },
  "subscription_status": "suspended",
  "credits_balance": 0,
  "trial_ends_at": "2026-01-10T23:59:59Z",
  "onboarding_step": "trial_activated",
  "plan_id": "plan_basic_monthly",
  "subscription_id": "sub_rzp_002",
  "next_billing_date": null,
  "payment_method_status": "failed",
  "usage_limits": {
    "max_leads_per_month": 1000,
    "max_whatsapp_msgs_daily": 500
  },
  "usage_current": {
    "leads_fetched_this_month": 0,
    "whatsapp_sent_this_month": 0,
    "whatsapp_sent_today": 0,
    "preview_searches_used": 3,
    "enrichments_this_month": 0
  },
  "admin_notes": "Payment halted. Contacted via email.",
  "created_at": "2026-01-03T09:00:00Z",
  "created_by": "user_vijay_001",
  "updated_at": "2026-02-01T00:00:00Z",
  "updated_by": "system:handleRazorpayWebhook"
}
```

*Tenant C tests: AccountBlockedScreen renders, route guards redirect to `/suspended`, all CFs throw `PERMISSION_DENIED`.*

---

## 5. Tenant D — Pending Onboarding (Incomplete Signup)

```json
// FIRESTORE: tenants/tenant_d
{
  "company_name": "New Startup Co",
  "config": {
    "target_city": "Bangalore",
    "target_country_code": "IN",
    "whatsapp_phone_id": null,
    "timezone": "Asia/Kolkata"
  },
  "subscription_status": "pending",
  "credits_balance": 0,
  "trial_ends_at": null,
  "onboarding_step": "company_created",
  "plan_id": null,
  "subscription_id": null,
  "next_billing_date": null,
  "payment_method_status": null,
  "usage_limits": {
    "max_leads_per_month": 1000,
    "max_whatsapp_msgs_daily": 500
  },
  "usage_current": {
    "leads_fetched_this_month": 0,
    "whatsapp_sent_this_month": 0,
    "whatsapp_sent_today": 0,
    "preview_searches_used": 0,
    "enrichments_this_month": 0
  },
  "admin_notes": "",
  "created_at": "2026-02-09T06:00:00Z",
  "created_by": "user_neha_001",
  "updated_at": "2026-02-09T06:00:00Z",
  "updated_by": "system:createTenant"
}
```

*Tenant D tests: Onboarding resumption logic. User should be redirected to FirstSearchScreen.*

---

## 6. System Config Documents

```json
// FIRESTORE: system_config/api_keys
{
  "google_places_api_key": "PLACEHOLDER_OR_REAL_KEY",
  "apify_api_token": "PLACEHOLDER_OR_REAL_KEY",
  "vertex_ai_project": "cocrm-dev-project",
  "vertex_ai_location": "us-central1",
  "created_at": "2026-01-01T00:00:00Z",
  "created_by": "system:bootstrap",
  "updated_at": "2026-01-01T00:00:00Z",
  "updated_by": "system:bootstrap"
}

// FIRESTORE: system_config_public/app
{
  "min_app_version": "1.0.0",
  "maintenance_mode": false,
  "created_at": "2026-01-01T00:00:00Z",
  "created_by": "system:bootstrap",
  "updated_at": "2026-01-01T00:00:00Z",
  "updated_by": "system:bootstrap"
}
```

---

## 7. Test Scenarios Covered by Seed Data

| Scenario | Tenant | Data Present |
|----------|--------|-------------|
| Full pipeline view (all 5 statuses) | A | 8 leads across statuses |
| Unread message + pending AI draft | A | Lead 003 (Zen Yoga) |
| Enrichment pending | A | Lead 004 (Prime Academy) |
| Enrichment failed + refund | A | Lead 005 (Powerhouse Gym) |
| Outbound → Inbound → AI Draft thread | A | Interactions for Lead 002 |
| Credit transaction ledger | A | 4 transactions (grant, send, enrich, refund) |
| Data isolation | A vs B | Different tenant_ids |
| Suspended account | C | subscription_status: "suspended" |
| Incomplete onboarding | D | onboarding_step: "company_created" |
| Super admin access | SA | role: "super_admin" |
| Sales rep permissions | A | Priya (limited permissions) |
| Trial expiry warning | A | trial_ends_at within range |
| Active subscription | B | plan_id + subscription_id set |

---

**End of File**
