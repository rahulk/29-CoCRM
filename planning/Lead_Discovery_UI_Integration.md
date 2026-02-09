# Lead Discovery UI - Full Integration Guide

## Overview
The Lead Discovery UI is now fully wired up and ready to use. The flow takes users from initial company setup through lead discovery to trial activation.

## User Flow

### 1. Company Setup
**Screen:** `CompanySetupScreen` (`/onboarding/setup`)
- User enters company name, admin name, and target city
- Calls `createTenant` Cloud Function
- **Security**: Requires Auth + App Check
- On success, navigates to `/onboarding/search`

### 2. Lead Discovery Search
**Screen:** `FirstSearchScreen` (`/onboarding/search`)
- Auto-loads the tenant's target city from Firestore
- User enters search keyword (e.g., "Study Center")
- Calls `discoverLeads` Cloud Function in **preview mode**
- **Security**: Requires Auth + App Check
- **Quota**: Limited to 3 preview searches before trial activation
- On success, navigates to `/onboarding/preview` with lead data

**Key Features:**
- Fetches tenant city from `currentTenantRecordProvider`
- Uses preview mode to limit results to 5 leads
- Improved error handling for:
  - App Check failures
  - Authentication errors
  - Quota exhaustion
  - Generic search failures

### 3. Lead Preview
**Screen:** `LeadPreviewScreen` (`/onboarding/preview`)
- Displays up to 5 preview leads from Google Places API
- Shows business name, address, and rating
- Calls to action to unlock all leads
- Navigates to `/onboarding/trial`

**Data Schema:**
```json
{
  "displayName": {"text": "Business Name"},
  "formattedAddress": "123 Street, City",
  "rating": 4.5,
  "userRatingCount": 100,
  "internationalPhoneNumber": "+91 99999 99999",
  "websiteUri": "https://example.com"
}
```

### 4. Trial Activation
**Screen:** `TrialActivationScreen` (`/onboarding/trial`)
- Presents the trial offer (7 days + ₹500 credits)
- Calls `activateTrial` Cloud Function
- **Security**: Requires Auth + App Check
- On success, navigates to `/leads` (main dashboard)

## Backend Integration

### Cloud Functions Used

#### 1. `createTenant`
```typescript
// React code
await createTenant({
  companyName: "Rahul's Study Center",
  adminName: "Rahul Kumar",
  city: "Mumbai",
});
```

**Backend Processing:**
- Creates tenant document with default limits
- Creates user document with admin permissions
- Sets custom claims (`tenant_id`, `role`)
- **Returns:** `{success: true, tenant_id: "xxx"}`

#### 2. `discoverLeads` (Preview Mode)
```typescript
// React code
const result = await discoverLeads({
  location: { lat: 0, lng: 0 },
  radius: 5000,
  keyword: "Study Center in Mumbai",
  previewMode: true,
});
```

**Backend Processing:**
- Checks preview quota (max 3 searches)
- Calls Google Places API with textQuery
- Returns up to 5 results (limited by preview mode)
- **Does NOT save** leads to Firestore
- Increments `usage_current.preview_searches_used`
- **Returns:** `{success: true, leads: [...], quota_remaining: 2}`

#### 3. `activateTrial`
```typescript
// React code
await activateTrial();
```

**Backend Processing:**
- Updates tenant to `subscription_status: 'trial'`
- Sets `credits_balance: 50000` (₹500)
- Sets `trial_ends_at` to 7 days from now
- Creates credit transaction record
- **Returns:** `{success: true, trial_ends_at: "2026-02-16T..."}`

## App Check Integration

### Debug Mode Setup (Development against Cloud)
1. **Enable App Check in firebase.ts:**
```typescript
// src/lib/firebase.ts
if (import.meta.env.DEV) {
  // Use a fixed debug token for localhost development
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN;
}
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('recaptcha-site-key'),
  isTokenAutoRefreshEnabled: true,
});
```

2. **Generate Debug Token:**
   - In your browser console (localhost), look for: `App Check debug token: XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`.
   - Copy this token.

3. **Register Token in Firebase Console:**
   - **Build > App Check > Apps**.
   - Select your web app.
   - Click the **kebab menu (three dots)** > **Manage debug tokens**.
   - Add the token you copied.
   - **Important:** This allows `localhost` requests to access your real `cocrm-dev` resources.

### Production Mode (firebase.ts)
```typescript
// src/lib/firebase.ts
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider('recaptcha-site-key'),
  isTokenAutoRefreshEnabled: true,
});
```

## Error Handling

### App Check Errors
```
Error: failed-precondition
Message: "The function must be called from an App Check verified app."
```

**Solution:**
- Add debug token in Firebase Console
- Or ensure Play Integrity/App Attest is configured for production

### Authentication Errors
```
Error: unauthenticated
Message: "The function must be called while authenticated."
```

**Solution:**
- Ensure user is signed in before navigating to onboarding
- Check that `authStateChangesProvider` returns a valid user

### Quota Errors
```
Error: resource-exhausted
Message: "Preview searches exhausted. Activate trial."
```

**Solution:**
- User must click "Activate Trial" to proceed
- This unlocks unlimited searches for 7 days

## State Management

### Hooks / Stores Used
1. **`useOnboarding` (Zustand Store)**
   - Manages state for createTenant, discoverLeads, activateTrial
2. **`useTenant` (Context/Hook)**
   - Fetches tenant document from Firestore
3. **`useUser` (Context/Hook)**
   - Fetches user document
4. **`useAuth`**
   - Stream Firebase Auth state

## Testing Checklist

### Prerequisites
- [ ] Firebase project created
- [ ] App Check enabled for your platform
- [ ] Debug token registered (for localhost testing against Cloud)
- [ ] Secrets configured (can use placeholders for UI testing)

### Test Flow
1. [ ] Sign up with email/password
2. [ ] Fill in company setup form
3. [ ] Verify tenant is created in Firestore
4. [ ] Enter search keywords and city
5. [ ] Verify preview leads are displayed
6. [ ] Try 4th preview search (should fail with quota error)
7. [ ] Click "Activate Trial"
8. [ ] Verify redirect to `/leads` dashboard
9. [ ] Check Firestore for updated tenant status and credits

### Expected Data After Onboarding

**Tenant Document:**
```json
{
  "company_name": "Rahul's Study Center",
  "subscription_status": "trial",
  "credits_balance": 50000,
  "trial_ends_at": "2026-02-16T...",
  "usage_current": {
    "preview_searches_used": 3,
    "leads_fetched_this_month": 0
  },
  "config": {
    "target_city": "Mumbai"
  }
}
```

**User Document:**
```json
{
  "tenant_id": "xxx",
  "role": "tenant_admin",
  "name": "Rahul Kumar",
  "email": "rahul@example.com",
  "permissions": {
    "leads_view_all": true,
    "leads_search": true
  }
}
```

## Next Steps

1. **Replace Placeholder Secrets**
   ```bash
   firebase functions:secrets:set GOOGLE_PLACES_API_KEY --project cocrm-sales-tool
   # Enter your actual Google Places API key when prompted
   ```

2. **Configure Google Places API**
   - Enable Places API (New) in Google Cloud Console
   - Add billing account
   - Restrict API key to your Cloud Function IPs

3. **Build Main Dashboard**
   - Create LeadsScreen to display saved leads
   - Implement lead filtering and search
   - Add lead enrichment UI

4. **Implement WhatsApp Messaging**
   - Create ConversationScreen
   - Wire up sendWhatsapp Cloud Function
   - Test template and freeform messages

## Common Issues

### Issue: App hangs after lead search
**Cause:** Waiting for Google Places API with invalid key
**Solution:** Set valid API key in Secret Manager or use mock data

### Issue: "App Check verification failed"
**Cause:** Debug token not registered
**Solution:** Follow Debug Mode Setup steps above

### Issue: "User is not associated with a tenant"
**Cause:** Custom claims not refreshed after tenant creation
**Solution:** The code now automatically refreshes token with `await auth.currentUser?.getIdToken(true);`

### Issue: Preview leads showing mock data
**Cause:** `GOOGLE_PLACES_API_KEY` is set to "PLACEHOLDER"
**Solution:** Update secret with real API key, or this is expected behavior for testing
