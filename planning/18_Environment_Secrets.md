# Environment & Secrets Inventory

> **Purpose:** Single source of truth for every API key, secret, and configuration variable.

---

## 1. Secret Manager (Firebase/GCP Secret Manager)

Accessible via `defineSecret()` in Cloud Functions v2.

| Secret Name | Usage |
|-------------|-------|
| `RAZORPAY_KEY_ID` | `handleRazorpayWebhook`, `createSubscriptionLink` |
| `RAZORPAY_KEY_SECRET` | `createSubscriptionLink` (Basic Auth) |
| `RAZORPAY_WEBHOOK_SECRET` | `handleRazorpayWebhook` (Validation) |
| `MSG91_AUTH_KEY` | `sendWhatsapp` |
| `MSG91_WEBHOOK_SECRET` | `handleInboundMessage` |
| `APIFY_WEBHOOK_SECRET` | `handleApifyWebhook` |
| `APIFY_TOKEN` | `enrichLeads` (Cloud Function) |
| `GOOGLE_PLACES_API_KEY` | `discoverLeads` (Cloud Function) |
| `AI_SERVICE_URL` | `scoreLead`, `aiReply`, `indexBrochure` (Node CF calls Python service) |

**Setup command:**
```bash
firebase functions:secrets:set AI_SERVICE_URL
# Enter: https://ai-service-dev-xyz.a.run.app (for dev)
```

---

## 2. Firestore Collections — System Config

### 2.1 `system_config/global_settings` (Super Admin read/write)

| Field | Purpose |
|-------|---------|
| `vertex_ai_project_id` | GCP project ID (used by Python AI Service) |
| `razorpay_key_id` | Display only in Admin Dashboard |

### 2.2 `system_config_public/app_settings` (Public Read)

| Field | Purpose |
|-------|---------|
| `min_app_version` | Force update check in React PWA |

---

## 3. Firebase Project Configuration

| Environment | Project ID | Hosting URL |
|-------------|------------|-------------|
| **Dev** | `cocrm-dev-project` | `cocrm-dev.web.app` |
| **Prod** | `cocrm-prod-project` | `app.cocrm.com` |

---

## 4. React PWA Configuration (`.env`)

**File:** `apps/web/.env.development` / `.env.production`

These variables are bundled by Vite and visible to the browser.
**NEVER put secrets here.**

| Variable | Value (Example) | Usage |
|----------|-----------------|-------|
| `VITE_FIREBASE_API_KEY` | `AIza...` | Firebase Init |
| `VITE_FIREBASE_AUTH_DOMAIN` | `cocrm-dev.firebaseapp.com` | Firebase Init |
| `VITE_FIREBASE_PROJECT_ID` | `cocrm-dev-project` | Firebase Init |
| `VITE_RAZORPAY_KEY_ID` | `rzp_test_12345` | Razorpay Web Checkout |
| `VITE_APP_VERSION` | `1.0.0` | About Screen, Error Logs |
| `VITE_RECAPTCHA_SITE_KEY` | `6Le...` | App Check (Web) |

---

## 5. External Service Accounts

[Same content as original for Razorpay, MSG91, Apify]

### 5.5 Python Cloud Run Service (`ai-service`)

- **Identity:** Runs as Default Compute Service Account (or custom SA).
- **Permissions:**
  - `roles/aiplatform.user` (Vertex AI access).
  - `roles/logging.logWriter` (Cloud Logging).
- **Invoker:** The Node/TS Cloud Functions SA must have `roles/run.invoker` on this service.

---

## 6. Pre-Flight Checklist

- [ ] Dev Firebase project created (`cocrm-dev-project`)
- [ ] `npm install` run in `apps/web`, `functions`
- [ ] Firebase Auth enabled
- [ ] Firestore database created
- [ ] Cloud Storage bucket created
- [ ] App Check enabled (reCAPTCHA Enterprise)
- [ ] All 9 secrets set in Secret Manager (Section 1)
- [ ] Cloud Run service (`ai-service`) deployed
- [ ] Places API & Vertex AI API enabled
- [ ] Razorpay, MSG91, Apify accounts set up
- [ ] `system_config_public` created
