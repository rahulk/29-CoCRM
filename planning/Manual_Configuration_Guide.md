# Manual Configuration & External Setup Guide

**Purpose:** This document accompanies the `Master_Build_Plan.md`. It provides the precise, step-by-step external configurations (Firebase Console, Google Cloud, Third-Party Dashboards) required to make each release functional in Development and Production.

**Timing:** Perform these steps **AFTER** the coding prompts for the phase are complete, but **BEFORE** the Deployment step.

---

## Phase 0: Scaffold, Auth & Landing

### 0.1 Firebase Console Setup (Dev & Prod)
1. **Create Projects:** Ensure `cocrm-dev` and `cocrm-prod` projects exist in Firebase Console.
2. **Enable Authentication:**
   - Go to **Build > Authentication > Sign-in method**.
   - Enable **Email/Password**.
   - Enable **Google**:
     - You will need the "Web SDK configuration" (Client ID/Secret).
     - **Dev:** Add `localhost` and your dev firebase domain (`cocrm-dev.web.app`) to "Authorized domains".
     - **Prod:** Add your custom domain (if any) and prod firebase domain.
3. **Enable Firestore:**
   - **Build > Firestore Database > Create Database**.
   - Choose location (e.g., `asia-south1` or `us-central1` - MUST match Cloud Functions location).
   - Start in **Production mode** (we will deploy rules via CLI).
4. **Enable Storage:**
   - **Build > Storage > Get Started**.
   - Use same location.
5. **Enable App Check (Optional but Recommended for Dev):**
   - **Build > App Check**.
   - Register your web app (ReCAPTCHA Enterprise).
   - For `localhost` development, generate a **Debug Token** and add it to `.env.local`: `VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN`.

### 0.2 Google Cloud Console (OAuth & API Keys)
1. **OAuth Consent Screen:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials/consent).
   - Select User Type: **External**.
   - App Name: "CoCRM Dev" / "CoCRM".
   - Support Email: Your email.
   - **Authorized Domains:** Add `firebaseapp.com` and `web.app`.
   - **Test Users (Dev only):** Add your email if status is "Testing".
2. **Obtain Client IDs:**
   - Credentials > Create Credentials > OAuth Client ID > Web Application.
   - **Authorized Origins:** `http://localhost:5173`, `https://cocrm-dev.web.app`.
   - Copy Client ID to `VITE_GOOGLE_CLIENT_ID` in `.env`.

### 0.3 Secrets Management (Cloud Functions)
*Run these commands in your local terminal for both Dev and Prod projects:*

```bash
# Enable Secret Manager API
firebase projects:addfirebase --project cocrm-dev
# (Follow prompts to enable APIs if needed)

# Set Secrets (Empty/Placeholder values allowed for Phase 0 logic, but keys must exist)
firebase functions:secrets:set RAZORPAY_KEY_ID --project cocrm-dev
firebase functions:secrets:set RAZORPAY_KEY_SECRET --project cocrm-dev
firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET --project cocrm-dev
firebase functions:secrets:set MSG91_AUTH_KEY --project cocrm-dev
firebase functions:secrets:set MSG91_WEBHOOK_SECRET --project cocrm-dev
firebase functions:secrets:set APIFY_TOKEN --project cocrm-dev
firebase functions:secrets:set VERTEX_AI_PROJECT_ID --project cocrm-dev
firebase functions:secrets:set GOOGLE_MAPS_API_KEY --project cocrm-dev
# Repeat for prod
```

### 0.4 Database Seeding (Dev Environment)
1. **Generate Service Account Key:**
   - Go to **Project Settings > Service accounts**.
   - Generate new private key.
   - Save as `service-account-dev.json` in root (gitignored).
2. **Run Seed Script:**
   - `export GOOGLE_APPLICATION_CREDENTIALS="./service-account-dev.json"`
   - `npm run seed:dev`
   - Verify data in Firestore Console (users, tenants, products).

---

## Phase 1: Onboarding & First Discovery

### 1.1 Google Maps Platform
1. Go to [Google Cloud Console > APIs & Services > Library](https://console.cloud.google.com/apis/library).
2. Enable **Places API (New)**.
3. Enable **Maps JavaScript API** (for displaying maps).
4. **Credentials:**
   - Create a generic API Key for backend (Cloud Functions): `GOOGLE_MAPS_API_KEY`.
     - *Restriction:* IP addresses of your Cloud Functions (hard to lock down, or leave unrestricted for dev).
   - Create a specific API Key for frontend (if using Maps JS API): `VITE_GOOGLE_MAPS_KEY`.
     - *Restriction:* HTTP Referrer (`localhost:5173`, `*.web.app`).

### 1.2 Enable Cloud Billing (Required for Node.js 18+ Functions)
1. Ensure the Firebase project is on the **Blaze (Pay as you go)** plan.
2. This is required for external network calls (Google Maps API) from Cloud Functions.

---

## Phase 2: Lead Pipeline (Enrichment & AI)

### 2.1 Apify Setup
1. Create account at [Apify.com](https://apify.com/).
2. Go to **Settings > Integrations**.
3. Copy **Personal API Token**.
4. Set secret:
   ```bash
   firebase functions:secrets:set APIFY_TOKEN <your_token> --project cocrm-dev
   ```
5. Choose/Rent an Actor (e.g., `google-maps-scraper`) and note its Actor ID for the config.

### 2.2 Vertex AI (Google Cloud)
1. Go to Google Cloud Console > **Vertex AI**.
2. Click **Enable Recommended APIs**.
3. **IAM Permissions:** Ensure the "App Engine default service account" (used by Cloud Functions) has the **Vertex AI User** role.
   - IAM & Admin > IAM > Find `<project-id>@appspot.gserviceaccount.com` > Edit > Add Role "Vertex AI User".

---

## Phase 3: Communication (MSG91)

### 3.1 MSG91 Setup
1. Create account / Log in to MSG91.
2. **Sender ID:** Create a WhatsApp Sender ID (requires Facebook Business Manager verification).
3. **API Key:** Create a new Auth Key.
   - Set secret: `firebase functions:secrets:set MSG91_AUTH_KEY <key>`
4. **Templates:**
   - Create WhatsApp templates in MSG91 dashboard matching `19_WhatsApp_Templates.md`.
   - Wait for approval (usually 10-30 mins).
5. **Webhooks:**
   - *After deployment*, grab the `handleInboundMessage` URL.
   - Configure it in MSG91 > WhatsApp > Webhooks > Inbound Message.
   - Generate/Copy Webhook Secret.
   - Set secret: `firebase functions:secrets:set MSG91_WEBHOOK_SECRET <secret>`

---

## Phase 5: Settings & Storage

### 5.1 Storage CORS (for Brochure Uploads)
1. Run this `gsutil` command locally to allow browser uploads:
   ```json
   // cors.json
   [
     {
       "origin": ["http://localhost:5173", "https://cocrm-dev.web.app", "https://cocrm-prod.web.app"],
       "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
       "responseHeader": ["Content-Type", "x-goog-resumable"],
       "maxAgeSeconds": 3600
     }
   ]
   ```
2. Apply:
   ```bash
   gsutil cors set cors.json gs://<your-dev-bucket>
   gsutil cors set cors.json gs://<your-prod-bucket>
   ```

---

## Phase 7: Billing (Razorpay)

### 7.1 Razorpay Dashboard
1. Log in to [Razorpay](https://dashboard.razorpay.com/).
2. **API Keys:**
   - Settings > API Keys > Generate Key (Test Mode for Dev).
   - Set secrets: `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. **Webhooks:**
   - *After deployment*, grab the `handleRazorpayWebhook` URL.
   - Settings > Webhooks > Add New Webhook.
   - URL: `https://.../handleRazorpayWebhook`
   - Secret: Create a strong string.
   - Events: `payment.captured`, `subscription.activated`, `subscription.charged`, `subscription.pending`, `subscription.halted`, `subscription.cancelled`.
   - Set key: `firebase functions:secrets:set RAZORPAY_WEBHOOK_SECRET`

---

## Phase 8: PWA & Polish

### 8.1 Asset Generation
1. Use [RealFaviconGenerator](https://realfavicongenerator.net/) or similar.
2. Upload Logo.
3. Generate assets (favicon.ico, apple-touch-icon, android-chrome-192x192, etc.).
4. Replace files in `apps/web/public/`.

### 8.2 Firestore Config (Force Update)
1. In Firestore Console, create collection `system_config_public` (if not exists).
2. Create document `app_settings`.
3. Add fields:
   * `min_app_version`: "1.0.0"
   * `latest_app_version`: "1.0.0"
   * `maintenance_mode`: false


---
