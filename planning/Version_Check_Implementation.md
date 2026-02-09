# Version Check & Display Implementation

## Overview
The app now has a complete version check system that:
1. ✅ Shows a Force Update screen when a new version is deployed
2. ✅ Displays version number on the Login screen
3. ✅ Displays version number in the Profile/Account menu

## How Version Check Works

### 1. Version Service
Located at: `src/hooks/useVersionCheck.ts`

**Hooks:**
- `useVersionCheck` - Subscribes to Firestore config and compares with `import.meta.env.VITE_APP_VERSION`.

**How it works:**
```typescript
// apps/web/src/hooks/useVersionCheck.ts
export const useVersionCheck = () => {
  const currentVersion = import.meta.env.VITE_APP_VERSION;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system_config_public', 'app_settings'), (doc) => {
      const minVersion = doc.data()?.min_app_version;
      if (minVersion && isVersionLower(currentVersion, minVersion)) {
        // Trigger force update state
      }
    });
    return () => unsub();
  }, []);
}
```

### 2. Force Update Screen
Located at: `src/features/auth/components/ForceUpdateScreen.tsx`

**Features:**
- Shows current version and required version side-by-side
- Highlights the required version in amber
- Provides a "Refresh Now" button that reloads the page
- Beautiful UI with premium design

**When it appears:**
- Automatically triggered by the router when `isUpdateRequired` returns `true`
- User cannot bypass this screen (forced redirect)
- Appears before login/authentication

### 3. Router Integration

```tsx
// apps/web/src/routes/AppRoutes.tsx
const { isForceUpdate } = useVersionCheck();

if (isForceUpdate) {
  return <ForceUpdateScreen />;
}
```



### 4. Version Display Locations

#### A. Login Screen
Located at: `src/features/auth/components/LoginScreen.tsx`

- Shows version at the bottom after "Privacy Policy" link
- Small, subtle text (11pt, gray)
- Format: `v1.1.24`

#### B. Profile/Account Screen
#### B. Profile/Account Screen
Located at: `src/features/profile/ProfileScreen.tsx`

- Shows version at the bottom.
- Format: `v1.1.24`

## How to Trigger Force Update

### Method 1: Update `min_app_version` in Firestore
1. Go to Firestore Console
2. Navigate to `system_config_public` collection
3. Open `app_settings` document
4. Update `min_app_version` to a version higher than current (e.g., `"1.2.0"`)
5. Users on older versions will see the Force Update screen

### Method 2: Using `initializeSystemSettings` Cloud Function
```javascript
// Call from Firebase Console or Client SDK
const initializeSystemSettings = httpsCallable(functions, 'initializeSystemSettings');
initializeSystemSettings({ min_app_version: "1.2.0" });
```

**Important:** The `min_app_version` must be in semantic versioning format: `MAJOR.MINOR.PATCH` (e.g., `"1.1.24"`)

## Testing the Version Check

### Test Force Update Screen
1. **Current version in package.json:** `1.1.24`
2. **Set min_app_version in Firestore:** `1.2.0`
3. **Visit the app:** https://cocrm-sales-tool-dev.web.app
4. **Expected:** Force Update screen should appear

### Test Version Display
1. **Visit Login Screen:** https://cocrm-sales-tool-dev.web.app/login
2. **Expected:** Version number (`v1.1.24`) shown at bottom
3. **Login and go to Profile:** Click profile icon in menu
4. **Expected:** Version shown with label "App Version" and value "v1.1.24"

## Version Comparison Logic

```typescript
function isVersionLower(current: string, min: string): boolean {
  return semver.lt(current, min); // Using 'semver' package or custom split logic
}
```

**Examples:**
- `isVersionLower("1.1.24", "1.2.0")` → `true` (update required)
- `isVersionLower("1.2.0", "1.1.24")` → `false` (no update needed)
- `isVersionLower("1.1.24", "1.1.24")` → `false` (same version)

## Deployment Version Workflow

### Automatic Version Bumping
- **Dev deployments:** Automatically bump patch version (e.g., `1.1.24 → 1.1.25`)
- **Prod deployments:** Use the exact same version as Dev (no bump)

### Manual Version Control
```bash
# Deploy to Dev with automatic patch bump
.\scripts\deploy.ps1 -Flavor dev

# Deploy to Prod with same version
.\scripts\deploy.ps1 -Flavor prod

# Check current version

grep version package.json
```

## Firestore Schema

### Collection: `system_config_public`
### Document: `app_settings`
```json
{
  "min_app_version": "1.1.24",
  "created_at": "2026-02-09T01:00:00Z",
  "updated_at": "2026-02-09T01:00:00Z"
}
```

**Security Rules:**
```javascript
// Allow public read
match /system_config_public/{document=**} {
  allow read: if true;
  allow write: if request.auth != null 
    && request.auth.token.role == 'super_admin';
}
```

## UI/UX Details

### Force Update Screen Design
- **Background:** Primary color (blue)
- **Icon:** Large system update icon (white)
- **Heading:** "Update Required" (white, large)
- **Description:** Clear explanation of why update is needed
- **Version Box:**
  - Semi-transparent white container with border
  - Shows "Current Version" and "Required Version"
  - Required version highlighted in amber
- **CTA Button:** White button with "Refresh Now" and refresh icon
- **Footer:** Small text "The page will reload automatically"

### Version Display Design
- **Login Screen:**
  - Small gray text at bottom
  - Format: `v1.1.24`
  - Non-intrusive, informational

- **Profile Screen:**
  - Two-line centered layout
  - Label: "App Version" (small gray)
  - Value: `v1.1.24` (medium bold)
  - Clear separation from other UI elements

## Common Issues & Solutions

### Issue: Force Update screen doesn't appear
**Cause:** `min_app_version` in Firestore might be `null` or lower than current version
**Solution:** Check Firestore `system_config_public/app_settings` document

### Issue: Version shows as "..." or blank
**Cause:** `VITE_APP_VERSION` environment variable issue
**Solution:** This is normal during initial load - version appears after 1-2 seconds

### Issue: Force Update appears even after refreshing
**Cause:** Browser cache might be serving old version
**Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

### Issue: Different version on Dev vs Prod
**Cause:** Forgot to deploy to Prod after Dev
**Solution:** Run `.\scripts\deploy.ps1 -Flavor prod` to sync versions

## Best Practices

1. **Always test Force Update on Dev first**
   - Set `min_app_version` in Dev environment
   - Verify the screen appears correctly
   - Test refresh functionality

2. **Use semantic versioning**
   - MAJOR: Breaking changes
   - MINOR: New features (backward compatible)
   - PATCH: Bug fixes

3. **Coordinate version updates**
   - Plan force updates during low-traffic periods
   - Communicate to users via email/notifications
   - Keep old version accessible for a grace period

4. **Update version in Firestore after deployment**
   - Don't force update unless necessary
   - Only force update for critical security/breaking changes

## Future Enhancements

- [ ] Add "What's New" changelog in Force Update screen
- [ ] Add optional "Update Later" button with countdown
- [ ] Show version in app footer (all screens)
- [ ] Add version history tracking in Firestore
- [ ] Implement gradual rollout (percentage-based)
- [ ] Add analytics tracking for force update events
