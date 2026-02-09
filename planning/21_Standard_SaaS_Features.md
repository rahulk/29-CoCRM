"Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable)."

# Standard SaaS Features (Gap Closure)

**Purpose:** This document captures standard multi-tenant SaaS features that are missing from the current specification. Each feature includes data schema, API/CF specs, UI screens, and security rules.

**Build Sequence:** For authoritative phase assignments, step numbers, and acceptance criteria, see `25_Build_Phase_Breakdown.md`. Phase references below are indicative only.

**Principle:** These are not "nice-to-haves" â€” they are foundational expectations of any production SaaS product. Skipping them creates tech debt that compounds with every tenant onboarded.

---

## Priority Matrix

| # | Feature | Priority | Phase | Effort |
|---|---------|----------|-------|--------|
| 1 | Audit Fields (created/updated by/at) | **P0 â€” Must have** | Phase 0 (baked into scaffold) | Low |
| 2 | Forgot Password | **P0** | Phase 0 (Auth flow) | Low |
| 3 | User Profile Screen | **P0** | Phase 0 (Auth flow) | Medium |
| 4 | Search Within Lists | **P1 â€” Should have** | Phase 1 (Onboarding & Discovery) | Medium |
| 5 | Export Lists to CSV/Excel | **P1** | Phase 2 (Lead Pipeline) | Medium |
| 6 | Tenant Dashboard (Home) | **P1** | Phase 2 (Lead Pipeline) | Medium |
| 7 | Soft Delete / Archive Pattern | **P1** | Phase 2 (Lead Pipeline) | Low |
| 8 | Login History / Session Audit | **P2 â€” Nice to have** | Phase 6 (Super Admin + Logging) | Medium |
| 9 | Module-Level Access Rights | **P2** | Phase 5 (Settings + Team) | High |
| 10 | In-App Notification Center | **P2** | Phase 3 (Communication) | Medium |
| 11 | Tenant-Level Activity Log | **P2** | Phase 6 (Super Admin + Logging) | Medium |
| 12 | Configurable Dashboard Cards | **P3 â€” Future** | Phase 2+ | Medium |
| 13 | Session Management | **P3** | Phase 2+ | Medium |

---

## 1. Audit Fields (Global Mandatory Pattern)

**Priority:** P0 â€” Bake into every collection from day one. Retrofitting later is painful.

### 1.1 Standard Audit Fields

Every Firestore document in every **mutable** collection MUST include these 4 fields:

| Field | Type | Set On | Value | Notes |
|-------|------|--------|-------|-------|
| `created_at` | Timestamp | Document creation | `FieldValue.serverTimestamp()` | Never use `Date.now()` |
| `created_by` | String | Document creation | `request.auth.uid` (client) or `context.auth.uid` (CF) | See actor rules below |
| `updated_at` | Timestamp | Every update | `FieldValue.serverTimestamp()` | Must be refreshed on EVERY write |
| `updated_by` | String | Every update | `request.auth.uid` (client) or `context.auth.uid` (CF) | See actor rules below |

### 1.2 Actor Identification Rules

The `created_by` / `updated_by` field value depends on who initiated the write:

| Actor | Value Format | Example |
|-------|-------------|---------|
| Authenticated user (client write) | `{auth.uid}` | `"abc123def456"` |
| Authenticated user via Cloud Function | `{context.auth.uid}` | `"abc123def456"` |
| Cloud Function (automated/cron) | `"system:{function_name}"` | `"system:scoreLead"`, `"system:monthlyReset"` |
| Super Admin impersonating | `"impersonated:{super_admin_uid}"` | `"impersonated:sa_uid_789"` |
| Webhook-initiated (no user context) | `"webhook:{provider}"` | `"webhook:razorpay"`, `"webhook:msg91"` |

### 1.3 Collection-Level Applicability

| Collection | `created_at` | `created_by` | `updated_at` | `updated_by` | Reason |
|------------|:---:|:---:|:---:|:---:|--------|
| `tenants` | âœ… | âœ… | âœ… | âœ… | Mutable (settings, status changes) |
| `users` | âœ… | âœ… | âœ… | âœ… | Mutable (profile edits, role changes) |
| `leads` | âœ… | âœ… | âœ… | âœ… | Mutable (status, assignment, follow-ups) |
| `interactions` | âœ… | âœ… | âŒ | âŒ | Append-only (never updated) |
| `credit_transactions` | âœ… | âœ… | âŒ | âŒ | Immutable ledger (never updated) |
| `products` | âœ… | âœ… | âœ… | âœ… | Mutable (name, price, active status) |
| `invitations` | âœ… | âœ… | âœ… | âœ… | Mutable (status changes: pending â†’ accepted) |
| `system_logs` | âœ… | âœ… | âœ… | âœ… | Mutable (status: open â†’ resolved) |
| `message_queue` | âœ… | âœ… | âœ… | âœ… | Mutable (status: queued â†’ sent/failed) |
| `brochure_vectors` | âœ… | âœ… | âŒ | âŒ | Write-once (replaced entirely on re-index) |
| `search_grids` (sub) | âœ… | âœ… | âœ… | âœ… | Mutable (frequency, last_run_at) |
| `system_config` | âœ… | âœ… | âœ… | âœ… | Mutable (API keys rotation) |
| `system_config_public` | âœ… | âœ… | âœ… | âœ… | Mutable (min_app_version) |
| `login_history` (NEW Â§8) | âœ… | âœ… | âŒ | âŒ | Append-only |
| `activity_logs` (NEW Â§11) | âœ… | âœ… | âŒ | âŒ | Append-only |
| `notifications` (NEW Â§10) | âœ… | âœ… | âœ… | âœ… | Mutable (read status) |

### 1.4 Implementation Rules

**Cloud Functions (TypeScript):**
```typescript
// On CREATE â€” always set all 4 fields (updated_at = created_at initially)
const now = admin.firestore.FieldValue.serverTimestamp();
const actorId = context.auth?.uid ?? `system:${functionName}`;

const doc = {
  ...data,
  created_at: now,
  created_by: actorId,
  updated_at: now,
  updated_by: actorId,
};

// On UPDATE â€” always refresh updated_at and updated_by
const update = {
  ...changes,
  updated_at: admin.firestore.FieldValue.serverTimestamp(),
  updated_by: context.auth?.uid ?? `system:${functionName}`,
};
```

**React Client (TypeScript):**
```typescript
// On CREATE
const data = {
  ...fields,
  created_at: serverTimestamp(),
  created_by: auth.currentUser?.uid,
  updated_at: serverTimestamp(),
  updated_by: auth.currentUser?.uid,
};

// On UPDATE
const update = {
  ...changes,
  updated_at: serverTimestamp(),
  updated_by: auth.currentUser?.uid,
};
```

**Security Rules Enforcement (add to Doc 5):**
```javascript
// Helper: Ensure updated_at is always refreshed on update
function hasAuditFieldsOnUpdate() {
  return request.resource.data.updated_at == request.time
      && request.resource.data.updated_by == request.auth.uid;
}

// Helper: Ensure audit fields are set on create
function hasAuditFieldsOnCreate() {
  return request.resource.data.created_by == request.auth.uid
      && request.resource.data.updated_by == request.auth.uid;
}
```

### 1.5 Type Definition Impact

All types must include audit fields. Interfaces should expose them as read-only:

```typescript
// types/Lead.ts
export interface Lead {
  // ... existing fields
  created_at: Timestamp;
  created_by: string;
  updated_at?: Timestamp;
  updated_by?: string;
}
```

UI can display: "Last updated by Rahul on 15 Jan 2026" on detail screens.

### 1.6 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add 4 audit fields to EVERY collection definition |
| **Doc 3 (API Workflows)** | Every CF must set audit fields on create/update |
| **Doc 5 (Security Rules)** | Add `hasAuditFieldsOnUpdate()` and `hasAuditFieldsOnCreate()` helpers; enforce on client writes |
| **Doc 0 (Handoff Guardrails)** | Add as B12 mandatory pattern in repository template and CF template |
| **Doc 16 (UI Screens)** | Show "Last updated by X" on detail screens (LeadDetail, Settings, BillingHistory) |

---

## 2. Forgot Password

**Priority:** P0 â€” Must have for launch. Users WILL forget passwords.
**Phase:** Phase 0 (add to Auth flow, Step 0.3)

### 2.1 UI Change (Doc 16 â€” LoginScreen Â§1.1)

Add to the Email Sign-In expanded section:

* **"Forgot Password?"** text link, positioned below the Password field, right-aligned.
* **Tap action:** Shows inline state change (no separate screen needed):
  * Email field remains visible.
  * Password field + Sign In button replaced with: "Enter your email and we'll send a reset link."
  * **"Send Reset Link"** button (full-width).
  * **"Back to Sign In"** text link.

**States:**

| State | UI |
|-------|-----|
| Default | Email field + "Send Reset Link" button |
| Loading | Button shows loading spinner (shadcn `Loader2` icon, animated), input disabled |
| Success | Success toast: "Password reset email sent! Check your inbox." + auto-switch back to Sign In form |
| Error (no account) | Error toast: "No account found with this email." |
| Error (too many requests) | Error toast: "Too many requests. Please try again later." |

### 2.2 Logic

```typescript
// No Cloud Function needed â€” Firebase handles this natively
await sendPasswordResetEmail(auth, email);
```

### 2.3 Route

No new route needed. This is an inline state change within `/login`.

### 2.4 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 16 (UI Screens)** | Add "Forgot Password" to LoginScreen Â§1.1 |

---

## 3. User Profile Screen

**Priority:** P0 â€” Every SaaS app needs this. Users need to view/edit their own info.
**Phase:** Phase 0 (add after Step 0.3, before 0.5)

### 3.1 Route

| Route | Screen | Auth Required | Role Guard |
|-------|--------|:---:|------------|
| `/profile` | ProfileScreen | Yes | Any tenant role |

**Navigation:** Tapping the Avatar/Settings icon in AppBar â†’ opens `/settings`. Add a "My Profile" row at the top of SettingsScreen that navigates to `/profile`.

### 3.2 UI: ProfileScreen

**Route:** `/profile`
**Purpose:** View and edit the current user's personal information.

**Layout (scrollable container â€” `div` with `overflow-y-auto`):**

**Section A: Avatar & Identity (Top, non-editable overview)**
* Large avatar circle (initials or Google profile photo from `auth.currentUser?.photoURL`).
* Name (large, bold).
* Email (grey, below name).
* Role badge: Chip showing "Admin" or "Sales Rep".
* Member since: "Joined {created_at formatted}".

**Section B: Editable Fields (Card)**

| Field | Type | Editable | Validation |
|-------|------|:---:|-----------|
| Name | Text | âœ… | Min 2 chars, max 50 chars |
| Phone | Text | âœ… | Valid phone format, optional |
| Email | Text | âŒ (display only) | â€” |
| Role | Chip | âŒ (display only) | â€” |

* **"Save Changes"** button (only visible when form is dirty).
* On save: Calls CF `updateUserProfile`.

**Section C: Password (Only for Email/Password users, hidden for Google Sign-In)**
* "Change Password" row â†’ tap expands to:
  * Current Password field.
  * New Password field.
  * Confirm New Password field.
  * "Update Password" button.
* Logic: `updatePassword(auth.currentUser!, newPassword)` (requires recent auth â€” may trigger re-authentication).

**Section D: Danger Zone (Bottom)**
* "Sign Out" button (red text) â†’ `signOut(auth)`.
* "Delete Account" text link (grey) â†’ Confirmation dialog â†’ calls `deleteAccount` CF (Phase 2 stub from Doc 3 Â§12).

### 3.3 Cloud Function: `updateUserProfile`

**Trigger:** Callable.
**Input Payload:**
```json
{
  "name": "Rahul Kumar",
  "phone": "+919876543210"
}
```

**Auth Check:** `context.auth` must exist. User can only update their OWN profile (`users/{context.auth.uid}`).

**Validation:**
1. `name`: If provided, min 2 chars, max 50 chars, trimmed.
2. `phone`: If provided, valid phone format (E.164 or local).
3. At least one field must be provided.

**Logic:**
1. Build update map from provided fields.
2. Add audit fields: `updated_at: now`, `updated_by: context.auth.uid`.
3. Write to `users/{context.auth.uid}`.

**Return:** `{ success: true }`

**Why CF:** `users` collection is write-locked to Super Admin in security rules (Doc 5 Â§4). This CF acts as a controlled proxy for self-edits, similar to `updateTenantProfile`.

### 3.4 Data Schema Addition (Doc 2 â€” `users` collection)

Add to existing `users` fields:
* `avatar_url` (String, Optional): Google profile photo URL or custom upload. Populated from `auth.currentUser.photoURL` on first login.
* `auth_provider` (String): "google", "email". Set on user creation. Used to show/hide "Change Password" section.
* `last_login_at` (Timestamp): Updated on every sign-in. Used in profile display and admin views.
* `created_at` (Timestamp): When user account was created.
* `created_by` (String): UID of who created (self or CF).
* `updated_at` (Timestamp): Last profile edit.
* `updated_by` (String): UID of who last edited.

### 3.5 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `avatar_url`, `auth_provider`, `last_login_at`, audit fields to `users` |
| **Doc 3 (API Workflows)** | Add `updateUserProfile` CF spec |
| **Doc 5 (Security Rules)** | No change needed (CF uses Admin SDK, bypasses rules) |
| **Doc 6 (Project Structure)** | ProfilePage goes in `features/auth/pages/` or `features/settings/pages/` |
| **Doc 16 (UI Screens)** | Add ProfileScreen spec; add "My Profile" row to SettingsScreen |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 0, Step 0.3.1 |

---

## 4. Search Within Lists

**Priority:** P1 â€” Users will have 100s-1000s of leads. Without search, the product feels broken.
**Phase:** Phase 1 (Onboarding & First Discovery)

### 4.1 Approach (MVP)

Firestore doesn't support native full-text search. For MVP, use a **two-tier strategy:**

| Tier | Method | When to Use | Limit |
|------|--------|-------------|-------|
| **Client-side filter** | Filter locally on already-loaded paginated data | Datasets < 500 items loaded in memory | Fast, free |
| **Firestore prefix search** | `.where('search_name', '>=', query).where('search_name', '<=', query + '\uf8ff')` | When client-side isn't enough | Prefix only, no substring |

**Phase 2 upgrade path:** Algolia or Typesense integration for full-text, typo-tolerant search.

### 4.2 New Field: `search_name`

Add to `leads` collection (Doc 2):
* `search_name` (String): Lowercase, trimmed version of `business_details.name`. Set by `discoverLeads` CF and `enrichLeads` CF. Example: `"rahul's study center"` â†’ `"rahul's study center"`.

This enables Firestore prefix queries without case-sensitivity issues.

### 4.3 UI: Search Bar Component (Reusable)

**Component:** `<ListSearchBar />` â€” a reusable component used across multiple screens.

```tsx
<div className="relative">
  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
  <Input
    placeholder="Search leads by name..."
    onChange={(e) => handleSearch(e.target.value)}
    className="pl-8"
  />
</div>
```

**Screens that get search:**

| Screen | Search By | Method |
|--------|-----------|--------|
| LeadListScreen | Business name, phone | Client-side filter on loaded data + Firestore prefix fallback |
| InboxScreen | Business name | Client-side filter on loaded conversations |
| TaskListScreen | Business name | Client-side filter |
| TeamScreen | Member name, email | Client-side (small dataset) |
| BillingScreen (transactions) | Reason, reference ID | Client-side |
| SystemLogsScreen (admin) | Error message, source | Client-side + Firestore prefix on `error_message` |

### 4.4 Firestore Index Addition

| Index # | Collection | Fields | Purpose |
|---------|-----------|--------|---------|
| 17 | `leads` | `tenant_id` (ASC) + `search_name` (ASC) | Prefix search on lead name |

### 4.5 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `search_name` to `leads`; add index #17 |
| **Doc 3 (API Workflows)** | `discoverLeads` and `enrichLeads` must set `search_name` on write |
| **Doc 16 (UI Screens)** | Add `ListSearchBar` to LeadListScreen, InboxScreen, TaskListScreen, TeamScreen |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 1 |

---

## 5. Export Lists to CSV/Excel

**Priority:** P1 â€” Every business user expects "Export to Excel". Non-negotiable for paid SaaS.
**Phase:** Phase 2 (Lead Pipeline polish)

### 5.1 Approach

**Client-side generation** (no CF needed for MVP):
* Use the `papaparse` npm package for CSV export.
* Use the `xlsx` (SheetJS) npm package for XLSX export (Phase 2).
* Generate file locally â†’ trigger browser download via `Blob` + `URL.createObjectURL()`.

**Why not a Cloud Function?**
* For MVP, datasets per tenant are < 5,000 leads. Client-side is sufficient.
* Avoids cold-start latency and temporary file storage complexity.
* **Phase 2:** If datasets grow > 10K, add a CF that generates file in Cloud Storage and returns a signed download URL.

### 5.2 UI: Export Button

Add an "Export" icon button (or overflow menu item) to the AppBar of each list screen.

**Behavior:**
1. User taps "Export" â†’ shows bottom sheet:
   * "Export Current View (filtered)" â€” exports only what's currently filtered/visible.
   * "Export All" â€” fetches all records for this tenant (with progress indicator).
2. Format: CSV for MVP. (Add XLSX option in Phase 2.)
3. File naming: `{collection}_{tenant_name}_{YYYY-MM-DD}.csv`
   * Example: `leads_rahuls_study_center_2026-01-15.csv`
4. **Browser:** Triggers file download via `Blob` + anchor tag click.
5. **PWA (installed):** Same browser download behavior. On mobile devices, the OS download manager handles the file.

**Screens that get export:**

| Screen | Collection | Columns Exported |
|--------|-----------|-----------------|
| LeadListScreen | `leads` | Name, Phone, Email, Status, Priority, Rating, Source, Created, Last Contacted |
| BillingScreen (transactions) | `credit_transactions` | Date, Amount (â‚¹), Reason, Reference ID, Status |
| TeamScreen | `users` | Name, Email, Phone, Role, Status, Joined Date |
| SystemLogsScreen (admin) | `system_logs` | Date, Severity, Source, Error Message, Status |
| TaskListScreen | `leads` (filtered) | Name, Phone, Follow-up Date, Priority, Owner |

### 5.3 Permission Control

* **LeadListScreen export:** `tenant_admin` only (by default). Configurable in Phase 2 via module permissions (Â§9).
* **BillingScreen export:** `tenant_admin` only.
* **TeamScreen export:** `tenant_admin` only.
* **SystemLogsScreen export:** `super_admin` only.

### 5.4 Export Utility (Shared)

```typescript
// utils/csvExporter.ts
export const exportToCsv = (
  headers: string[],
  rows: any[][],
  filename: string
) => {
  // Generate CSV string using papaparse
  // Create Blob and trigger download
}
```

### 5.5 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 7 (Dependencies)** | Add `papaparse` package (and `xlsx`/SheetJS for Phase 2) |
| **Doc 16 (UI Screens)** | Add Export button to LeadListScreen, BillingScreen, TeamScreen, SystemLogsScreen, TaskListScreen |
| **Doc 6 (Project Structure)** | Add `utils/csvExporter.ts` |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 2, Step 2.6 |

---

## 6. Tenant Dashboard (Home Screen)

**Priority:** P1 â€” Without a dashboard, users land on the lead list with no context. A dashboard gives instant situational awareness.
**Phase:** Phase 2 (Lead Pipeline)

### 6.1 Route

| Route | Screen | Auth Required | Role Guard |
|-------|--------|:---:|------------|
| `/dashboard` | TenantDashboardScreen | Yes | Any tenant role |

**Navigation change:** Bottom nav tab 0 changes from `/leads` to `/dashboard`. Leads are accessible from the dashboard via a "View All Leads" link and the "Leads" section in the nav.

**Alternative approach (simpler):** Keep `/leads` as tab 0 but add a collapsible summary card at the TOP of LeadListScreen. This avoids a route change and keeps the product snappy. **Recommended for MVP.**

### 6.2 UI: Dashboard Summary Card (at top of LeadListScreen)

**Component:** `<DashboardSummaryCard />` â€” a collapsible card shown at the top of LeadListScreen.

**Layout (Collapsed â€” default):** A single horizontal row of 4 metric chips:

| Metric | Value Source | Format |
|--------|-------------|--------|
| Leads This Month | `usage_current.leads_fetched_this_month` / `usage_limits.max_leads_per_month` | "450 / 1,000" |
| Messages Today | `usage_current.whatsapp_sent_today` / `usage_limits.max_whatsapp_msgs_daily` | "23 / 500" |
| Credits | `credits_balance / 100` | "â‚¹340.00" |
| Follow-ups Due | Count from tasks query (`next_follow_up_at <= now`) | "7 due" |

**Layout (Expanded â€” tap to expand):** Additional rows:

| Metric | Value Source |
|--------|-------------|
| Hot Leads | Count where `priority == 'hot'` |
| Unread Messages | Count where `has_unread_message == true` |
| Trial Days Left | `trial_ends_at - now` (only shown during trial) |
| Response Rate | (leads with `status == 'responded'`) / (leads with `status == 'contacted'`) Ã— 100 |

**Visibility:**
* Shown for all tenant roles.
* `tenant_admin` sees all metrics.
* `sales_rep` sees only their own metrics (leads assigned to them, their sent messages).

### 6.3 Data Provider

```typescript
// hooks/useDashboardMetrics.ts
export const useDashboardMetrics = () => {
  const { tenant } = useTenant();
  const { data: dueTasks } = useDueTasksCount();
  
  return {
    leadsThisMonth: tenant?.usage_current?.leads_fetched_this_month,
    leadsLimit: tenant?.usage_limits?.max_leads_per_month,
    // ... mapped metrics
  };
};
```

### 6.4 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 16 (UI Screens)** | Add `DashboardSummaryCard` to LeadListScreen Â§3.1 |
| **Doc 6 (Project Structure)** | Add to `components/common/` (reusable shared component) |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 2, Step 2.5 |

---

## 7. Soft Delete / Archive Pattern

**Priority:** P1 â€” Accidental permanent deletion is a support nightmare. Archive first, delete later.
**Phase:** Phase 1 (pattern) / Phase 2 (ArchivedLeadsScreen)

### 7.1 Pattern

No document is ever hard-deleted by the client or standard Cloud Functions. Instead:

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `is_archived` | Boolean | `false` | Soft-delete flag |
| `archived_at` | Timestamp | `null` | When archived |
| `archived_by` | String | `null` | Who archived |

### 7.2 Collections That Need Archive

| Collection | Archive Supported | Hard Delete | Notes |
|------------|:---:|:---:|-------|
| `leads` | âœ… | Never (MVP) | "Archive" action on LeadDetailScreen |
| `products` | âœ… | Never (MVP) | "Deactivate" already exists via `is_active`, but archive is different â€” archived = hidden from all views |
| `interactions` | âŒ | Never | Append-only audit trail â€” never hidden |
| `credit_transactions` | âŒ | Never | Immutable ledger |
| `users` | âŒ (uses `is_active`) | Never | Deactivation via `removeUser` CF already exists |
| `invitations` | âŒ | Never | Short-lived, expire naturally |

### 7.3 Query Impact

**EVERY list query** on archivable collections must include `.where('is_archived', '==', false)` by default.

```typescript
// api/leadsApi.ts â€” updated useLeads
const q = query(
  collection(db, 'leads'),
  where('tenant_id', '==', tenantId)
);

if (!includeArchived) {
  // Add archive filter
  // q = query(q, where('is_archived', '==', false));
}
```

### 7.4 UI: Archive Action

**LeadDetailScreen** â€” add to overflow menu (â‹®):
* "Archive Lead" â†’ Confirmation dialog: "Archive {business_name}? You can restore it later from Settings." â†’ sets `is_archived: true`, `archived_at: now`, `archived_by: uid`.

**SettingsScreen** â€” add new row:
* "Archived Leads ({count})" â†’ navigates to `/settings/archived-leads` â†’ list of archived leads with "Restore" action.

**Restore action:** Sets `is_archived: false`, `archived_at: null`, `archived_by: null`, updates `updated_at/by`.

### 7.5 Firestore Index Addition

| Index # | Collection | Fields | Purpose |
|---------|-----------|--------|---------|
| 18 | `leads` | `tenant_id` (ASC) + `is_archived` (ASC) + `created_at` (DESC) | Default lead list (excluding archived) |

**Note:** Several existing indexes (1, 2, 5, 8, 10, 11, 12) may need to be updated to include `is_archived` as a prefix filter. Evaluate during implementation â€” Firestore may handle this via index merging, or explicit composite indexes may be needed.

### 7.6 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `is_archived`, `archived_at`, `archived_by` to `leads` and `products`; add index #18 |
| **Doc 3 (API Workflows)** | No new CF needed (client writes allowed for archive fields via security rules) |
| **Doc 5 (Security Rules)** | Add `is_archived`, `archived_at`, `archived_by` to allowed client write fields for `leads` |
| **Doc 16 (UI Screens)** | Add archive action to LeadDetailScreen; add Archived Leads screen to Settings |
| **Doc 0 (Handoff Guardrails)** | Add `.where('is_archived', '==', false)` to repository pattern template |

---

## 8. Login History / Session Audit

**Priority:** P2 â€” Important for security-conscious tenants, but not launch-blocking.
**Phase:** Phase 6 (Super Admin & Logging)

### 8.1 New Collection: `login_history`

* **Purpose:** Audit trail of every authentication event.
* **Document ID:** Auto-ID.
* **Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `tenant_id` | String | Foreign Key (null for pre-tenant users) |
| `user_id` | String | Firebase Auth UID |
| `event_type` | String | "login_success", "login_failed", "logout", "password_reset_requested", "password_changed" |
| `auth_method` | String | "google", "email_password" |
| `ip_address` | String | Client IP (from request headers in CF) |
| `user_agent` | String | Browser/device user agent string |
| `device_info` | Map | `{ browser, os, app_version }` |
| `location` | Map (Optional) | `{ country, city }` (derived from IP via free GeoIP, Phase 2) |
| `created_at` | Timestamp | Event time |
| `created_by` | String | Same as `user_id` |

### 8.2 How It's Captured

**Client-side:** After successful `FirebaseAuth` sign-in, call a lightweight CF:

```typescript
// After successful login
const logLogin = httpsCallable(functions, 'logLoginEvent');
await logLogin({
  event_type: 'login_success',
  auth_method: 'google',
  device_info: {
    os: navigator.userAgent, // Simplified
    app_version: import.meta.env.VITE_APP_VERSION,
  }
});
```

**Cloud Function: `logLoginEvent`**
* **Trigger:** Callable.
* **Auth Check:** `context.auth` must exist.
* **Logic:**
  1. Extract IP from `context.rawRequest.ip`.
  2. Extract user agent from `context.rawRequest.headers['user-agent']`.
  3. Write to `login_history` collection.
* **Rate Limit:** Max 5 calls per minute per user.

### 8.3 UI: Login History (in ProfileScreen Â§3)

Add **Section E: Recent Activity** to ProfileScreen:
* Last 5 login events shown as a timeline.
* Each entry: "{auth_method} login â€¢ {device_info.os} â€¢ {relative_time}"
* "View All" link â†’ modal/bottom sheet with full paginated history.

**For tenant_admin** (in TeamScreen):
* When viewing a team member, show their last login time: "Last active: 2 hours ago".

### 8.4 Security Rules

```javascript
match /login_history/{logId} {
  // Users can read their own login history
  allow read: if request.auth != null && request.auth.uid == resource.data.user_id;
  // Tenant admin can read login history for users in their tenant
  allow read: if request.auth != null 
    && request.auth.token.role == 'tenant_admin' 
    && belongsToTenant(resource.data);
  // Super admin can read all
  allow read: if isSuperAdmin();
  // No client writes â€” CF only
  allow write: if false;
}
```

### 8.5 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `login_history` collection |
| **Doc 3 (API Workflows)** | Add `logLoginEvent` CF spec |
| **Doc 5 (Security Rules)** | Add `login_history` rules |
| **Doc 16 (UI Screens)** | Add "Recent Activity" section to ProfileScreen; add "Last active" to TeamScreen |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 6 |

---

## 9. Module-Level Access Rights (Granular Permissions)

**Priority:** P2 â€” Current system has only 2 roles. Real-world teams need more nuance.
**Phase:** Phase 5 (Settings & Team)

### 9.1 Current State

Only 2 roles: `tenant_admin` (full access) and `sales_rep` (limited). No way to customize what a `sales_rep` can or cannot do.

### 9.2 Proposed Permission Model

**Approach:** A `permissions` map on each `users` document, controlled by `tenant_admin`.

**Default permissions by role:**

| Permission Key | Description | `tenant_admin` Default | `sales_rep` Default |
|---------------|-------------|:---:|:---:|
| `leads.view_all` | View all leads (vs only assigned) | âœ… | âŒ |
| `leads.search` | Run new lead discovery | âœ… | âŒ |
| `leads.export` | Export lead data | âœ… | âŒ |
| `leads.archive` | Archive/restore leads | âœ… | âŒ |
| `communication.send` | Send WhatsApp messages | âœ… | âœ… |
| `communication.ai_draft` | Use AI draft feature | âœ… | âœ… |
| `billing.view` | View billing & credits | âœ… | âŒ |
| `settings.manage` | Edit tenant settings | âœ… | âŒ |
| `team.manage` | Invite/remove team members | âœ… | âŒ |

### 9.3 Data Schema Addition (Doc 2 â€” `users` collection)

Add to `users` fields:
```
permissions (Map):
  leads_view_all (Boolean)
  leads_search (Boolean)
  leads_export (Boolean)
  leads_archive (Boolean)
  communication_send (Boolean)
  communication_ai_draft (Boolean)
  billing_view (Boolean)
  settings_manage (Boolean)
  team_manage (Boolean)
```

### 9.4 Default Assignment

When a user is created (via `createTenant` or `assignTenantOnSignup`), set default permissions based on role:

```typescript
const DEFAULT_PERMISSIONS = {
  tenant_admin: {
    leads_view_all: true, leads_search: true, leads_export: true, leads_archive: true,
    communication_send: true, communication_ai_draft: true,
    billing_view: true, settings_manage: true, team_manage: true,
  },
  sales_rep: {
    leads_view_all: false, leads_search: false, leads_export: false, leads_archive: false,
    communication_send: true, communication_ai_draft: true,
    billing_view: false, settings_manage: false, team_manage: false,
  },
};
```

### 9.5 UI: Permission Editor (TeamScreen)

In TeamScreen, when tenant_admin taps on a team member â†’ show permission toggles:

**Component:** `<PermissionEditor />` â€” a list of toggle switches grouped by module.

```
[Leads]
  â˜‘ View all leads (vs only assigned)
  â˜ Run lead search
  â˜ Export lead data
  â˜ Archive leads

[Communication]
  â˜‘ Send WhatsApp messages
  â˜‘ Use AI drafts

[Other]
  â˜ View billing
```

**Save action:** Calls CF `updateUserPermissions`.

### 9.6 Cloud Function: `updateUserPermissions`

**Trigger:** Callable. Tenant admin updates a team member's permissions.
**Input:** `{ "user_id": "uid", "permissions": { "leads_view_all": true, ... } }`
**Auth Check:** Caller must be `tenant_admin` of the SAME tenant. Cannot edit own permissions. Cannot edit permissions of another `tenant_admin`.
**Logic:** Update `users/{user_id}.permissions` map.

### 9.7 Frontend Enforcement

```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useAuth();
  return user?.permissions || DEFAULT_PERMISSIONS;
};

// Usage in UI:
const { leads_export } = usePermissions();
if (leads_export) {
  // Show export button
}
```

**Note:** Frontend enforcement is for UX only. Backend enforcement (security rules + CF checks) is the real gate.

### 9.8 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `permissions` map to `users` |
| **Doc 3 (API Workflows)** | Add `updateUserPermissions` CF; update `createTenant` and `assignTenantOnSignup` to set default permissions |
| **Doc 5 (Security Rules)** | Add permission checks where applicable (e.g., export, search) |
| **Doc 11 (User Management)** | Reference permission defaults on user creation |
| **Doc 16 (UI Screens)** | Add PermissionEditor to TeamScreen; conditionally show/hide UI elements |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 5 |

---

## 10. In-App Notification Center

**Priority:** P2 â€” Push notifications exist (fcm_token in users), but there's no in-app notification feed.
**Phase:** Phase 3 (Communication)

### 10.1 New Collection: `notifications`

* **Purpose:** In-app notification feed per user.
* **Document ID:** Auto-ID.
* **Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `tenant_id` | String | Foreign Key |
| `user_id` | String | Recipient UID |
| `title` | String | "New reply from Rahul's Gym" |
| `body` | String | "They asked about pricing for your monthly plan." |
| `type` | String | "lead_reply", "team_invite", "credits_low", "trial_expiring", "task_due", "system" |
| `reference_type` | String | "lead", "invitation", "billing", "task" |
| `reference_id` | String | ID of the referenced entity (lead_id, invitation_id, etc.) |
| `is_read` | Boolean | Default: `false` |
| `created_at` | Timestamp | |
| `created_by` | String | Usually `"system:{function_name}"` |

### 10.2 Notification Triggers

| Event | Type | Recipients | Created By |
|-------|------|-----------|-----------|
| Inbound WhatsApp reply | `lead_reply` | Assigned user (or all if unassigned) | `handleInboundMessage` CF |
| AI draft ready | `ai_draft_ready` | Assigned user | `aiReply` CF |
| Credits below â‚¹100 | `credits_low` | All `tenant_admin` users | `sendWhatsapp` CF (post-deduction check) |
| Trial expires in 2 days | `trial_expiring` | All `tenant_admin` users | Cron CF |
| Follow-up due today | `task_due` | `follow_up_owner` | Cron CF (morning batch) |
| New team member joined | `team_joined` | All `tenant_admin` users | `assignTenantOnSignup` CF |

### 10.3 UI: Notification Bell

**Location:** AppBar, between Credits Pill and Avatar icon.

**Component:** `<NotificationBell />` â€” icon with unread count badge.

* **Badge:** Red circle with count of unread notifications (max "9+").
* **Tap:** Opens `/notifications` screen (or a bottom sheet/overlay).

**NotificationsScreen:**
* List of notification cards, newest first.
* Each card: icon (by type) + title + body + relative time + unread indicator (blue dot).
* Tap â†’ navigates to referenced entity (e.g., tap lead_reply â†’ go to `/messages/:leadId`).
* "Mark All Read" button in AppBar.
* Pull-to-refresh.
* Pagination (20 per page).

### 10.4 Security Rules

```javascript
match /notifications/{notifId} {
  // Users can only read their own notifications
  allow read: if request.auth != null && request.auth.uid == resource.data.user_id;
  // Users can mark as read (update is_read only)
  allow update: if request.auth != null 
    && request.auth.uid == resource.data.user_id
    && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['is_read', 'updated_at', 'updated_by']);
  // No client creates/deletes â€” CF only
  allow create, delete: if false;
}
```

### 10.5 Firestore Index Addition

| Index # | Collection | Fields | Purpose |
|---------|-----------|--------|---------|
| 19 | `notifications` | `user_id` (ASC) + `is_read` (ASC) + `created_at` (DESC) | Notification feed with unread filter |

### 10.6 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `notifications` collection; add index #19 |
| **Doc 3 (API Workflows)** | Update `handleInboundMessage`, `aiReply`, `sendWhatsapp`, cron CFs to create notifications |
| **Doc 5 (Security Rules)** | Add `notifications` rules |
| **Doc 16 (UI Screens)** | Add NotificationBell to AppBar; add NotificationsScreen |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 3 |

---

## 11. Tenant-Level Activity Log

**Priority:** P2 â€” Distinct from `system_logs` (which is for errors). This tracks who did what.
**Phase:** Phase 6 (Super Admin & Logging)

### 11.1 New Collection: `activity_logs`

* **Purpose:** Tenant-scoped audit trail of significant user actions.
* **Document ID:** Auto-ID.
* **Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `tenant_id` | String | Foreign Key |
| `user_id` | String | Who performed the action |
| `user_name` | String | Denormalized for display (avoid extra read) |
| `action` | String | "lead_created", "lead_archived", "lead_exported", "whatsapp_sent", "team_invited", "team_removed", "settings_updated", "product_added", "brochure_uploaded", "permissions_changed" |
| `entity_type` | String | "lead", "product", "user", "tenant", "brochure" |
| `entity_id` | String | ID of affected entity |
| `entity_name` | String | Denormalized display name (e.g., "Rahul's Gym") |
| `details` | Map (Optional) | Additional context: `{ old_status: "new", new_status: "contacted" }` |
| `created_at` | Timestamp | |
| `created_by` | String | Same as `user_id` |

### 11.2 When to Log

| Action | Logged By | Priority |
|--------|-----------|----------|
| Lead status change | Client (on update) | MVP |
| Lead archived/restored | Client (on update) | MVP |
| WhatsApp message sent | `sendWhatsapp` CF | MVP |
| Lead export triggered | Client (on export) | MVP |
| Team member invited | `sendInvite` CF | MVP |
| Team member removed | `removeUser` CF | MVP |
| Settings updated | `updateTenantProfile` CF | MVP |
| Product added/edited | Client (on write) | MVP |
| Permissions changed | `updateUserPermissions` CF | Phase 2 |
| Brochure uploaded | `indexBrochure` CF | Phase 2 |

### 11.3 UI: Activity Log (SettingsScreen)

Add to SettingsScreen:
* "Activity Log" row â†’ navigates to `/settings/activity-log`.
* **ActivityLogScreen:** Paginated list of activity entries.
  * Each entry: Avatar (user) + "{user_name} {action description}" + relative time.
  * Example: "Rahul K archived lead Fitness Hub â€¢ 2 hours ago"
  * Filter by: action type, user, date range.

**Visibility:** `tenant_admin` only.

### 11.4 Security Rules

```javascript
match /activity_logs/{logId} {
  // Tenant admin can read their tenant's logs
  allow read: if request.auth != null 
    && request.auth.token.role == 'tenant_admin' 
    && belongsToTenant(resource.data);
  // Super admin can read all
  allow read: if isSuperAdmin();
  // Client can create activity logs for their own tenant
  allow create: if request.auth != null && assigningCorrectTenant() && hasAppendOnlyAuditFields();
  // No updates or deletes â€” append-only
  allow update, delete: if false;
}
```

### 11.5 Firestore Index Addition

| Index # | Collection | Fields | Purpose |
|---------|-----------|--------|---------|
| 20 | `activity_logs` | `tenant_id` (ASC) + `created_at` (DESC) | Activity feed |
| 21 | `activity_logs` | `tenant_id` (ASC) + `action` (ASC) + `created_at` (DESC) | Filtered activity feed |

### 11.6 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `activity_logs` collection; add indexes #20, #21 |
| **Doc 3 (API Workflows)** | Update relevant CFs to write activity logs |
| **Doc 5 (Security Rules)** | Add `activity_logs` rules |
| **Doc 16 (UI Screens)** | Add ActivityLogScreen; add row to SettingsScreen |
| **Doc 25 (Build Phase Breakdown)** | Included in Phase 6 |

---

## 12. Configurable Dashboard Cards

**Priority:** P3 â€” Nice to have. Some users don't want all metrics visible.
**Phase:** Phase 2+

### 12.1 Approach

Add to `tenants.config`:
```
dashboard_cards (Map):
  leads_count (Boolean): true
  messages_today (Boolean): true
  credits (Boolean): true
  follow_ups_due (Boolean): true
  hot_leads (Boolean): true
  unread_messages (Boolean): true
  response_rate (Boolean): false  // hidden by default
```

**UI:** In SettingsScreen â†’ "Dashboard Preferences" â†’ toggle switches for each card.

**Implementation:** The `<DashboardSummaryCard />` component reads these preferences and only renders visible cards.

### 12.2 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `dashboard_cards` to `tenants.config` |
| **Doc 16 (UI Screens)** | Add "Dashboard Preferences" to SettingsScreen |

---

## 13. Session Management

**Priority:** P3 â€” Future feature. Not critical for MVP.
**Phase:** Phase 2+

### 13.1 Features

* View all active sessions across devices (from `login_history`).
* "Sign out all other devices" â€” revoke Firebase refresh tokens: `admin.auth().revokeRefreshTokens(uid)`.
* Auto-logout after inactivity (configurable per tenant).
  * Add `config.session_timeout_minutes` to `tenants` (default: `null` = no timeout).
  * React side: `useIdle` hook (or `useEffect` on mouse/key events) that monitors user activity, logs out after threshold.

### 13.2 Documents Impacted

| Document | Change Required |
|----------|----------------|
| **Doc 2 (Data Schema)** | Add `session_timeout_minutes` to `tenants.config` |
| **Doc 3 (API Workflows)** | Add `revokeAllSessions` CF |
| **Doc 16 (UI Screens)** | Add session list to ProfileScreen; add timeout setting to SettingsScreen |

---

## Summary: New Routes Added

| Route | Screen | Phase |
|-------|--------|-------|
| `/profile` | ProfileScreen | Phase 0 |
| `/notifications` | NotificationsScreen | Phase 3 |
| `/settings/archived-leads` | ArchivedLeadsScreen | Phase 2 |
| `/settings/activity-log` | ActivityLogScreen | Phase 6 |

## Summary: New Collections Added

| Collection | Purpose | Phase |
|-----------|---------|-------|
| `login_history` | Authentication audit trail | Phase 6 |
| `notifications` | In-app notification feed | Phase 3 |
| `activity_logs` | Tenant-scoped action audit | Phase 6 |

## Summary: New Cloud Functions Added

| Function | Purpose | Phase |
|----------|---------|-------|
| `updateUserProfile` | User self-edits profile | Phase 0 |
| `logLoginEvent` | Record login events | Phase 6 |
| `updateUserPermissions` | Admin edits team permissions | Phase 5 |

## Summary: New Firestore Indexes Added

| Index # | Collection | Fields | Purpose |
|---------|-----------|--------|---------|
| 17 | `leads` | `tenant_id` + `search_name` | Prefix search |
| 18 | `leads` | `tenant_id` + `is_archived` + `created_at` | Archived filter |
| 19 | `notifications` | `user_id` + `is_read` + `created_at` | Notification feed |
| 20 | `activity_logs` | `tenant_id` + `created_at` | Activity feed |
| 21 | `activity_logs` | `tenant_id` + `action` + `created_at` | Filtered activity |

## Summary: New Dependencies Added

| Package (npm) | Purpose | Phase |
|---------------|---------|-------|
| `papaparse` | CSV export | Phase 2 |
| `xlsx` (SheetJS) | XLSX export (Phase 2) | Phase 2 |

---

## Cross-Reference: Document Changes Required

This is the master list of changes needed in existing documents due to this spec. Each change should be made atomically to keep docs consistent.

| Document | Changes |
|----------|---------|
| **Doc 0 (Handoff Guardrails)** | B12 Audit Fields pattern added. Build sequence now delegated to `25_Build_Phase_Breakdown.md`. |
| **Doc 2 (Data Schema)** | Add 4 audit fields to ALL collections; add `avatar_url`, `auth_provider`, `last_login_at`, `permissions` to `users`; add `search_name`, `is_archived`, `archived_at`, `archived_by` to `leads`; add 3 new collections (`login_history`, `notifications`, `activity_logs`); add 5 new indexes (#17â€“#21) |
| **Doc 3 (API Workflows)** | Add `updateUserProfile`, `logLoginEvent`, `updateUserPermissions` CFs; update ALL existing CFs to set audit fields; update `handleInboundMessage`, `aiReply`, `sendWhatsapp`, cron CFs to create notifications |
| **Doc 5 (Security Rules)** | Add `hasAuditFieldsOnUpdate()` and `hasAuditFieldsOnCreate()` helpers; add rules for `login_history`, `notifications`, `activity_logs`; add archive fields to allowed lead update fields |
| **Doc 6 (Project Structure)** | Add `utils/csvExporter.ts`; note ProfilePage location |
| **Doc 7 (Dependencies)** | Add `papaparse` package; add `xlsx` package (Phase 2) |
| **Doc 11 (User Management)** | Reference default permissions on user creation |
| **Doc 16 (UI Screens)** | Add Forgot Password to LoginScreen; add ProfileScreen; add DashboardSummaryCard to LeadListScreen; add ListSearchBar to list screens; add Export button to list screens; add Archive action to LeadDetailScreen; add NotificationBell to AppBar; add NotificationsScreen; add ArchivedLeadsScreen; add ActivityLogScreen; add PermissionEditor to TeamScreen |

---

**End of File**
