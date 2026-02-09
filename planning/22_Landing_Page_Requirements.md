# 22. Landing Page & Public Pages Requirements

**Goal:** A public-facing landing page that converts visitors into sign-ups, satisfies Google OAuth branding requirements, and implements version-aware cache busting for rapid early-stage iteration.

---

## 1. Page Inventory

| Route | Page Component | Auth Required | Purpose |
|-------|----------------|:---:|---------|
| `/` | `LandingPage` | No | Marketing + conversion. Public entry point. |
| `/login` | `LoginScreen` | No | Existing screen (Doc 16 §1.1). Linked from landing page. |
| `/privacy` | `PrivacyPolicyPage` | No | Required for Google OAuth consent screen approval. |
| `/terms` | `TermsOfServicePage` | No | Required for Google OAuth consent screen approval. |

**Note:** `/login` already exists in the app (Doc 16 §1.1). The landing page is a NEW addition that sits *before* the login screen in the public user journey.

---

## 2. Landing Page (`/`)

### 2.1 Purpose

- First impression for cold traffic.
- Communicates the CoCRM value proposition.
- Drives visitors to `/login`.
- Displays current app version.
- Satisfies Google branding guidelines.

### 2.2 Layout Sections (Top → Bottom)

#### A. Navigation Bar (Sticky Top)

| Element | Details |
|---------|---------|
| **Logo** | CoCRM logo (left-aligned). Click → scroll to top. |
| **Nav Links** | "Features", "How It Works", "Pricing" (scroll anchors). |
| **CTA Button** | "Get Started Free" → navigates to `/login`. |
| **Version Badge** | `v{VITE_APP_VERSION}` pill. Muted style. |

#### B. Hero Section

| Element | Details |
|---------|---------|
| **Headline** | "Your AI Sales Assistant That Never Sleeps" |
| **Subheadline** | "Find leads on Google Maps. Reach them on WhatsApp. Close deals 10x faster." |
| **Primary CTA** | "Start Free Trial" button → `/login` |
| **Hero Visual** | App screenshot / illustration. |

#### C. Features Section (Grid)

Three feature cards mapping to core tabs:
1. **Find Leads Instantly** (Map icon)
2. **Message on WhatsApp** (Chat icon)
3. **Never Miss a Follow-up** (Task icon)

#### D. How It Works Section (Steps)

1. **Search:** Enter keyword & location.
2. **AI Scores:** We find and rank businesses.
3. **Reach Out:** Send AI-crafted WhatsApp messages.

#### E. Pricing Section (MVP)

- "7-Day Free Trial · ₹500 credits included"
- CTA: "Start My Free Trial"

#### F. Footer

- Copyright info.
- **Legal Links:** `/privacy`, `/terms` (Mandatory).
- Version number.

### 2.3 Technical Notes

- **Implementation:** React Functional Component.
- **Styling:** Tailwind CSS (`apps/web/src/pages/marketing/LandingPage.tsx`).
- **SEO:** Add `<meta>` tags to `index.html` or use `react-helmet-async`.
- **Performance:** Lazy load images. Use `Link` from `react-router-dom` for internal navigation.

---

## 3. Login Page Updates

The existing `LoginScreen` (Doc 16 §1.1) needs these additions:

### 3.1 Version Display
- **Location:** Bottom center.
- **Source:** `import.meta.env.VITE_APP_VERSION`.
- **Format:** `Version 1.0.0` (text-muted-foreground, text-xs).

### 3.2 Legal Links
- **Location:** Below version text.
- **Format:** `Privacy Policy · Terms of Service` (Links).

### 3.3 Back to Home
- **Location:** App logo.
- **Behavior:** Click navigates to `/`.

---

## 4. Privacy & Terms Pages (`/privacy`, `/terms`)

**Requirement:** Static content pages explaining data usage (Google OAuth requirement).

### 4.1 Content
- **Privacy Policy:** Data collection (Google profile, business data), usage (CRM, AI), sharing (Firebase, Vertex AI, MSG91), deletion rights.
- **Terms:** Acceptance, acceptable use (no spam), billing (prepaid credits), AI disclaimers, liability.

### 4.2 Implementation
- Simple text-heavy layout using `prose` (Tailwind Typography plugin) or manual semantic HTML.
- Header with "Last updated" date.
- Footer with version number.

---

## 5. Version Check & Cache Busting

### 5.1 Architecture

**Layer 1: React Env Var**
- `VITE_APP_VERSION` is baked into the build at compile time.

**Layer 2: PWA Service Worker (`vite-plugin-pwa`)**
- Configured in `vite.config.ts`.
- `registerType: 'prompt'` (shows "New content available" toast) OR `'autoUpdate'` (aggressive).
- **Decision:** Use `autoUpdate` for MVP to minimize stale-client support tickets.

**Layer 3: Firestore Soft Check (Periodic)**
- **Doc:** `system_config_public/app_settings`.
- **Fields:** `min_app_version`, `latest_app_version`.
- **Logic:**
  1. App component mounts → `useVersionCheck` hook starts.
  2. Compares `import.meta.env.VITE_APP_VERSION` vs Firestore.
  3. If local < `min` → Redirect to `/force-update`.
  4. If local < `latest` → Show "Update Available" banner.

### 5.2 `useVersionCheck` Hook

```typescript
// apps/web/src/features/shared/hooks/useVersionCheck.ts
export const useVersionCheck = () => {
    // Uses Firestore listener on system_config_public/app_settings
    // Compares versions using semver logic
    // Returns { isForceUpdate, isSoftUpdate, message }
}
```

### 5.3 Firebase Hosting Headers (`firebase.json`)

Prevent caching of the app entry point:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "index.html",
        "headers": [{ "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" }]
      },
      {
        "source": "assets/**",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      }
    ]
  }
}
```

---

## 6. Route Guards (React Router)

Public pages MUST bypass `ProtectedRoute` wrappers.

```tsx
// apps/web/src/routes/AppRoutes.tsx
<Routes>
  {/* Public Routes */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/privacy" element={<PrivacyPolicyPage />} />
  <Route path="/terms" element={<TermsOfServicePage />} />
  
  {/* Auth Routes */}
  <Route element={<ProtectedRoute />}>
    <Route path="/leads" element={<LeadListScreen />} />
    {/* ... other protected routes */}
  </Route>
</Routes>
```

---

## 7. Google OAuth Verification Checklist

- [ ] **Privacy Policy URL:** `https://app.cocrm.com/privacy`
- [ ] **Terms URL:** `https://app.cocrm.com/terms`
- [ ] **Authorized Domain:** `app.cocrm.com` (and `cocrm-dev.web.app` for dev)
- [ ] **Scopes:** `email`, `profile`, `openid`

---
