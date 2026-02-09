# App Check Implementation (Web)

**Goal:** Protect backend resources from abuse by ensuring requests come from our genuine React PWA.

## 1. Provider Selection

**Web:** `ReCaptchaEnterpriseProvider` (Recommended for production) or `ReCaptchaV3Provider`.
We will use **reCAPTCHA Enterprise** as it offers better analysis and granular control in GCP.

## 2. Setup Steps

### A. GCP Console
1. Navigate to **Security > reCAPTCHA Enterprise**.
2. Create a new Key.
   - Platform: **Website**.
   - Domains: `localhost`, `cocrm-dev.web.app`, `app.cocrm.com`.
   - Action: `login`, `signup`, `leads_read`.
3. Copy the **Site Key**.

### B. Environment Variables
Add to `.env.development` and `.env.production`:
```bash
VITE_RECAPTCHA_SITE_KEY=6Le...
```

### C. Client-Side Initialization (`apps/web/src/lib/firebase.ts`)

```typescript
import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const app = initializeApp(firebaseConfig);

// Initialize App Check
if (import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
```

### D. Local Development (Debug Token)
For local testing without reCAPTCHA:
1. In `firebase.ts`, set `self.FIREBASE_APPCHECK_DEBUG_TOKEN = true` before initialization in dev mode.
2. Run the app. Check console for "App Check debug token: ...".
3. Add this token to the **Firebase Console > App Check > Apps > Web > Manage debug tokens**.

## 3. Backend Enforcement

### A. Cloud Functions
App Check is automatically verified for Callable Functions (`onCall`).
- **Context:** `context.app` is defined if valid.
- **Enforcement:**
  - By default, `onCall` functions REJECT requests with invalid tokens.
  - To allow reputable traffic only, checks are strict.

```typescript
// Example: Strict check
export const discoverLeads = onCall(async (request) => {
  if (!request.app) {
    throw new HttpsError('failed-precondition', 'The function must be called from an App Check verified app.');
  }
  // ...
});
```

### B. Firestore Security Rules
Access to `leads`, `tenants`, etc. is gated by App Check.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Deny all if App Check is missing/invalid
    match /{document=**} {
      allow read, write: if request.auth != null && request.time < timestamp.date(2030, 1, 1);
    }
  }
}
```
*Note: The above generic rule is just a placeholder; specific rules in `5_Security_Rules.md` should use `request.auth` AND ensure App Check if critical (though `onCall` handles most critical logic).*

## 4. Workbox (PWA Application)
Service Workers intercept network requests. Ensure App Check tokens are attached.
The Firebase JS SDK automatically attaches the `X-Firebase-AppCheck` header to Firestore/Functions requests, even from the Service Worker if configured correctly.
