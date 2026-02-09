# UI Screens & Navigation Specification

**Purpose:** Screen-by-screen spec for React PWA code generation. Defines routes, data sources, component patterns, actions, and state handling.
**Architecture:** React Router v6 + React Query + Zustand. All screens are functional components.
**Design Language:** Tailwind CSS + shadcn/ui. Mobile-first, responsive.

### Global Write Rules (Security Compliance)

**CRITICAL for code generation:** Not all Firestore collections allow client-side writes. The following rules apply across ALL screens:


| Collection            | Client Read | Client Write               | Notes                                          |
|-----------------------|-------------|----------------------------|-------------------------------------------------|
| `tenants`             | ✅ Own only  | ❌ Never                   | ALL writes via Cloud Functions.                 |
| `users`               | ✅ Own tenant | ❌ Never                  | ALL writes via Cloud Functions.                 |
| `leads`               | ✅ Own tenant | ✅ Create + Update         | Client may update specific fields. Business details & AI fields are server-side only. |
| `interactions`        | ✅ Own tenant | ✅ Create ONLY (append)    | No update, no delete. WhatsApp interactions created server-side only. |
| `credit_transactions` | ✅ Own tenant | ❌ Never                   | Server-side only (immutable ledger).            |
| `products`            | ✅ Own tenant | ✅ tenant_admin only       | Direct Firestore write allowed.                 |
| `invitations`         | ✅ Own tenant | ❌ Never                   | ALL writes via Cloud Functions.                 |
| `message_queue`       | ✅ Own tenant | ❌ Never                   | Server-side only.                               |
| `system_logs`         | ❌ Super only | ❌ Never                  | Via Cloud Function `logError`.                  |
| `system_config`       | ❌ Super only | ❌ Super only              | Super Admin direct write.                       |
| `system_config_public`| ✅ Any auth user | ❌ Super only              | Public read for `min_app_version`.              |
| `brochure_vectors`    | ✅ Own tenant | ❌ Never                   | Server-side only (`indexBrochure` CF).          |

### Global Error Code Mapping

**CRITICAL:** Cloud Function errors should be mapped to user-friendly messages using a shared `errorMapper` utility.

[Table identical to original]

---

## 0. Navigation Architecture

### Shell: Bottom Navigation (3 Tabs)

**Route:** `/` (Redirect to `/leads`)
**Component:** `AppShell` (Layout component with `Outlet`).
**Tabs:**

| Index | Label       | Icon              | Route       |
|-------|-------------|-------------------|-------------|
| 0     | "Leads"     | `Users` (Lucide)  | `/leads`    |
| 1     | "Messages"  | `MessageSquare`   | `/messages` |
| 2     | "Tasks"     | `CheckCircle`     | `/tasks`    |

**Top AppBar (Persistent):**
* Left: Company Name (from `tenants` doc).
* Right: Credits Pill (displays `credits_balance / 100` formatted as "₹340.00", tappable → navigates to `/billing`).
* Right: NotificationBell with red badge. Provider: `useUnreadNotifications`. Tap → `/notifications`.
* Right: Avatar/Settings icon → `/settings`.

**Visibility Rule:**
* Bottom nav is **hidden** during onboarding (`/onboarding/*`), super admin (`/admin/*`), and blocking screens (`/suspended`, `/force-update`).

### Route Table (React Router v6)

| Route                        | Screen                  | Auth Required | Role Guard         |
|------------------------------|-------------------------|---------------|--------------------|
| `/login`                     | LoginScreen             | No            | —                  |
| `/join`                      | InviteAcceptScreen      | No            | —                  |
| `/force-update`              | ForceUpdateScreen       | No            | —                  |
| `/suspended`                 | AccountBlockedScreen    | Yes           | —                  |
| `/onboarding/company`        | CompanySetupScreen      | Yes           | No tenant_id yet   |
| `/onboarding/search`         | FirstSearchScreen       | Yes           | tenant_admin       |
| `/onboarding/preview`        | LeadPreviewScreen       | Yes           | tenant_admin       |
| `/onboarding/activate`       | TrialActivationScreen   | Yes           | tenant_admin       |
| `/leads`                     | LeadListScreen          | Yes           | Any tenant role    |
| `/leads/search`              | NewSearchScreen         | Yes           | tenant_admin       |
| `/leads/:id`                 | LeadDetailScreen        | Yes           | Any tenant role    |
| `/messages`                  | InboxScreen             | Yes           | Any tenant role    |
| `/messages/:leadId`          | ConversationScreen      | Yes           | Any tenant role    |
| `/tasks`                     | TaskListScreen          | Yes           | Any tenant role    |
| `/billing`                   | BillingScreen           | Yes           | tenant_admin       |
| `/billing/topup`             | TopUpScreen             | Yes           | tenant_admin       |
| `/settings`                  | SettingsScreen          | Yes           | tenant_admin       |
| `/settings/team`             | TeamScreen              | Yes           | tenant_admin       |
| `/settings/team/invite`      | InviteMemberScreen      | Yes           | tenant_admin       |
| `/settings/whatsapp`         | WhatsAppSetupScreen     | Yes           | tenant_admin       |
| `/settings/products`         | ProductCatalogScreen    | Yes           | tenant_admin       |
| `/settings/products/add`     | AddProductScreen        | Yes           | tenant_admin       |
| `/settings/brochures`        | BrochureListScreen      | Yes           | tenant_admin       |
| `/admin`                     | AdminDashboardScreen    | Yes           | super_admin        |
| `/admin/tenants/:id`         | TenantDetailScreen      | Yes           | super_admin        |
| `/admin/logs`                | SystemLogsScreen        | Yes           | super_admin        |
| `/profile`                   | ProfileScreen           | Yes           | Any tenant role    |
| `/notifications`              | NotificationsScreen      | Yes           | Any tenant role    |
| `/settings/archived-leads`    | ArchivedLeadsScreen     | Yes           | tenant_admin       |
| `/settings/activity-log`      | ActivityLogScreen       | Yes           | tenant_admin       |

### React Router ProtectedRoute Guards

Implemented as a wrapper component `<ProtectedRoute>`:

1. **Force Update Check:** If `current_app_version < system_config.min_app_version` → redirect to `/force-update`.
2. **Auth Check:** If user not authenticated → redirect to `/login`.
3. **Account Blocked Check:** If suspended/cancelled/trial-expired → redirect to `/suspended`.
4. **Tenant Check:** If `token.tenant_id` is null → redirect to `/onboarding/company`.
4.5. **Onboarding Resumption:** If `subscription_status == 'pending'` → Check onboarding step and leads count → redirect to correct step.
5. **Role Check:** Check tenant_admin / super_admin claims.

---

## 1. Authentication

### 1.1 LoginScreen
**Route:** `/login`
**Layout:** Centered card. "Continue with Google" button. Toggle for Email/Password forms (Sign In / Sign Up / Forgot Password).
**Hooks:** `useAuth`.
**Actions:** `signInWithGoogle`, `signInWithEmailAndPassword`. Call `logLoginEvent`.

### 1.2 ForceUpdateScreen
**Route:** `/force-update`
**Layout:** Blocking screen. "Update Now" button (opens proper store link).
**Data:** `min_app_version` from public Firestore config. `VITE_APP_VERSION` env var.

### 1.3 AccountBlockedScreen
**Route:** `/suspended`
**Layout:** Blocking screen. Status-specific message (Suspended, Cancelled, Trial Expired).
**Actions:** "Go to Billing" or "Contact Support".

### 1.4 ProfileScreen
**Route:** `/profile`
**Layout:** Form fields for Name, Phone. Change Password section. Danger zone (Sign Out).
**Actions:** `updateProfile`, `updatePassword`, `signOut`.

---

## 2. Onboarding Flow

### 2.1 CompanySetupScreen
**Route:** `/onboarding/company`
**Layout:** Step 1/4. Form: Company Name, City.
**Action:** `createTenant` Cloud Function.

### 2.2 FirstSearchScreen
**Route:** `/onboarding/search`
**Layout:** Step 2/4. Form: Keyword, Location.
**Action:** `discoverLeads` CF (`preview_mode=true`).

### 2.3 LeadPreviewScreen
**Route:** `/onboarding/preview`
**Layout:** Step 3/4. List of 5 pre-fetched leads. "Start Free Trial" CTA.
**Data:** Passed via React Router state (location.state).

### 2.4 TrialActivationScreen
**Route:** `/onboarding/activate`
**Layout:** Step 4/4. Summary card. "Start My Free Trial" button.
**Action:** `activateTrial` CF.

### 2.5 InviteAcceptScreen
**Route:** `/join`
**Layout:** Validates token from URL query param. "Join Team" button.
**Action:** `assignTenantOnSignup` CF.

---

## 3. Tab A: Leads

### 3.1 LeadListScreen
**Route:** `/leads`
**Layout:**
* Header: Search, Filter Chips (All, Hot, Warm, etc.).
* Body: Virtualized List of `LeadCard` components.
* FAB: "Find Leads".
**Data:** `useLeads` hook (React Query + Firestore). Search filters applied client-side on fetched data.

### 3.2 NewSearchScreen
**Route:** `/leads/search`
**Layout:** Search form (Keyword, Location).
**Action:** `discoverLeads` CF (`preview_mode=false`).

### 3.3 LeadDetailScreen
**Route:** `/leads/:id`
**Layout:**
* **Business Card:** Info, Map, Calls, Socials.
* **AI Insight:** Score, Summary.
* **Actions:** Call, WhatsApp, Note, Follow-up.
* **Timeline:** Interaction history list.
* **Edit Status/Assign:** Form controls.
**Data:** `useLead(id)`, `useInteractions(id)`.

### 3.4 CallOutcomeDialog
**Component:** Modal/Dialog.
**Layout:** Interest chips, Note field, Follow-up toggle.
**Action:** creating `interaction` (call), updating `lead` status.

### 4. Tab B: Messages

### 4.1 InboxScreen
**Route:** `/messages`
**Layout:** List of `ConversationTile`. Unread indicators.
**Data:** `leads` query sorted by `last_interaction_at` DESC.

### 4.2 ConversationScreen
**Route:** `/messages/:leadId`
**Layout:** Chat UI.
* **AI Draft Banner:** Sticky top if `has_pending_draft`.
* **Bubbles:** Inbound/Outbound/Template.
* **Input:** Text field + Send.
**Action:** `sendWhatsapp` CF.

### 4.3 NotificationsScreen
**Route:** `/notifications`
**Layout:** Feed of notification items.
**Data:** `notifications` collection query.

### 5. Tab C: Tasks

### 5.1 TaskListScreen
**Route:** `/tasks`
**Layout:** Grouped list (Overdue, Today, Upcoming).
**Data:** `leads` with `next_follow_up_at` set.

---

## 6. Billing

### 6.1 BillingScreen
**Route:** `/billing`
**Layout:** Credits Hero Card, Plan Card, Usage Stats, History List.
**Data:** `useTenant` (balance), `useCreditTransactions`.

### 6.2 TopUpScreen
**Route:** `/billing/topup`
**Layout:** Grid of credit packages.
**Action:** Razorpay Web Checkout (`window.Razorpay`).

---

## 7. Settings

### 7.1 SettingsScreen
**Route:** `/settings`
**Layout:** Menu list (Profile, Team, WhatsApp, Products, Brochures).

### 7.2 TeamScreen & 7.3 InviteMemberScreen
Manage users. Use `sendInvite`, `removeUser` CFs.

### 7.4 WhatsAppSetupScreen
Connect/Disconnect WhatsApp via Meta flow.

### 7.5 ProductCatalogScreen & 7.6 AddProductScreen
Manage `products` collection.

### 7.7 BrochureListScreen
**Route:** `/settings/brochures`
**Purpose:** Manage RAG knowledge base.
**Layout:**
* **List:** Table of brochures (Filename, Status, Uploaded At, Actions).
* **Status:** "Indexing..." (spinner), "Ready" (green check), "Failed" (red x).
* **Actions:** "Delete" (trash icon) -> calls `deleteBrochure`.
* **Header:** "Upload Brochure" button -> opens `BrochureUploadDialog`.

### 7.8 BrochureUploadDialog (Component)
**Purpose:** Upload PDF to Storage.
**Behavior:**
* File picker (PDF only, max 10MB).
* Uploads to `gs://{bucket}/{tenant_id}/brochures/{filename}`.
* On success: Close dialog. `indexBrochure` CF triggers automatically.
* UI optimistically adds row or re-fetches list.

---

## 8. Super Admin
**Route:** `/admin/*`
**Layout:** Admin Sidebar.
**Screens:** Dashboard, TenantDetail, SystemLogs.
**Actions:** Impersonation (sets custom claims), System Config updates.

---

## 9. Shared UI Patterns

### 9.1 Onboarding Checklist
Component: `OnboardingChecklist`. Shows progress during trial.

### 9.2 Banners
Components: `CreditsWarningBanner`, `TrialExpiryBanner`, `DailyCapBanner`, `ImpersonationBanner`.
Use fixed positioning or layout insertion.

### 9.6 Empty State Pattern
Component: `EmptyState`. Illustration + Text + Action.

### 9.7 Error State Pattern
Component: `ErrorState`. Message + Retry button.

### 9.8 Loading Pattern
Component: `Skeleton` (Shimmer).

### 9.9 Pagination
React Query `useInfiniteQuery`.

### 9.12 Export
`csvExporter` utility + `saveAs` (FileSaver.js).

---

## 10. Schema Impact Summary
[Same content as original regarding schema fields and indexes]
