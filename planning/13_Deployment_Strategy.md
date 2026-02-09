 # Build, Deployment & DevOps Strategy

**Goal:** Zero-friction deployment. Separate environments for dev and production.
**Principle:** "One Command" to build and deploy each component.

## 1. Environments

| Feature | **Dev** | **Production** |
| :--- | :--- | :--- |
| **Firebase Project** | `cocrm-dev-project` | `cocrm-prod-project` |
| **Hosting URL** | `cocrm-dev.web.app` | `app.cocrm.com` (custom domain) |
| **API Keys** | Test Keys (Razorpay Sandbox) | Live Keys (Razorpay Live) |
| **Cloud Run AI Service** | `ai-service-dev` | `ai-service-prod` |
| **Env File** | `.env.development` | `.env.production` |

## 2. Frontend Configuration (React PWA)

**Build Tool:** Vite
**Env Files:** Vite automatically loads `.env.development` or `.env.production` based on mode.

```bash
# .env.development
VITE_FIREBASE_API_KEY=AIza...dev
VITE_FIREBASE_AUTH_DOMAIN=cocrm-dev-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=cocrm-dev-project
VITE_FIREBASE_STORAGE_BUCKET=cocrm-dev-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=12345
VITE_FIREBASE_APP_ID=1:12345:web:abc
VITE_RAZORPAY_KEY_ID=rzp_test_12345
VITE_APP_VERSION=1.0.0
VITE_RECAPTCHA_SITE_KEY=6Le...dev
```

## 3. Deployment Scripts

### A. Unified Deployment Script

```bash
# Deploy to DEV (bumps version)
./deploy.sh dev patch

# Deploy to PROD (uses current version, no bump)
./deploy.sh prod
```

### B. Cloud Functions (Node/TS)

```bash
# Deploy all functions to dev
firebase deploy --only functions --project cocrm-dev-project

# Deploy all functions to prod
firebase deploy --only functions --project cocrm-prod-project
```

### C. Python AI Service (Cloud Run)

```bash
# Build and deploy to dev
cd ai-service
gcloud builds submit --tag gcr.io/cocrm-dev-project/ai-service
gcloud run deploy ai-service \
  --image gcr.io/cocrm-dev-project/ai-service \
  --region asia-south1 \
  --memory 1Gi \
  --min-instances 0 \
  --max-instances 10 \
  --project cocrm-dev-project

# Deploy to prod (same commands with prod project)
gcloud run deploy ai-service \
  --image gcr.io/cocrm-prod-project/ai-service \
  --region asia-south1 \
  --memory 1Gi \
  --min-instances 1 \
  --max-instances 50 \
  --project cocrm-prod-project
```

## 4. Firebase Hosting Setup (`firebase.json`)

```json
{
  "hosting": [
    {
      "target": "dev",
      "public": "apps/web/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }],
      "headers": [
        {
          "source": "/sw.js",
          "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
        }
      ]
    },
    {
      "target": "prod",
      "public": "apps/web/dist",
      "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
      "rewrites": [{ "source": "**", "destination": "/index.html" }],
      "headers": [
        {
          "source": "/sw.js",
          "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
        }
      ]
    }
  ]
}
```

**Note:** The SPA rewrite rule (`"**" → /index.html`) is critical for React Router client-side routing to work.

## 5. PWA Configuration

**Manifest:** `apps/web/public/manifest.json`
```json
{
  "name": "CoCRM",
  "short_name": "CoCRM",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F8F9FA",
  "theme_color": "#1565C0",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## 6. CI/CD (GitHub Actions) — Future Phase

- Push to `dev` branch → Auto-deploy web to Dev Hosting + Functions to Dev + AI Service to Dev Cloud Run.
- Merge to `main` → Auto-deploy all to Prod.

## 7. Deep Linking

Since this is now a web-first PWA, deep linking is native:
- Invitation links (`https://app.cocrm.com/join?token=xyz`) are handled by React Router directly.
- No need for Android App Links or iOS Universal Links configuration.
- If the PWA is installed on the device, the OS will open the link in the PWA automatically (for supported browsers).

Remove the entire Android/iOS deep linking sections (assetlinks.json, apple-app-site-association).
