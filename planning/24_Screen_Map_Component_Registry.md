# 24. Screen Map, Navigation Flows & Shared Component Registry

**Goal:** Provide a single-file map of the entire React PWA application for AI code generation.

**Core Stack:**
- **Navigation:** React Router v6
- **State:** React Query + Zustand
- **UI:** Tailwind CSS + shadcn/ui

---

## 1. Complete Route Table (Master Reference)

Canonical route definitions.

### 1.1 Public Routes (No Auth)

| Route | Component | Feature | Wrapper |
|-------|-----------|---------|---------|
| `/` | `LandingPage` | `landing` | `PublicLayout` |
| `/login` | `LoginScreen` | `auth` | `PublicLayout` |
| `/join` | `InviteAcceptScreen` | `auth` | `PublicLayout` |
| `/privacy` | `PrivacyPolicyPage` | `legal` | `PublicLayout` |
| `/terms` | `TermsOfServicePage` | `legal` | `PublicLayout` |
| `/force-update` | `ForceUpdateScreen` | `auth` | `PublicLayout` |

### 1.2 Auth Required — Blocking Screens (No Shell)

| Route | Component | Guard Trigger | Wrapper |
|-------|-----------|---------------|---------|
| `/suspended` | `AccountBlockedScreen` | `subscription_status` is `suspended`/`cancelled` | `ProtectedRoute` |

### 1.3 Auth Required — Onboarding Flow (No Shell)

| Route | Component | Step | Wrapper |
|-------|-----------|------|---------|
| `/onboarding/company` | `CompanySetupScreen` | Step 1 | `ProtectedRoute` |
| `/onboarding/search` | `FirstSearchScreen` | Step 2 | `ProtectedRoute` |
| `/onboarding/preview` | `LeadPreviewScreen` | Step 3 | `ProtectedRoute` |
| `/onboarding/activate` | `TrialActivationScreen` | Step 4 | `ProtectedRoute` |

### 1.4 Auth Required — Main App (Bottom Nav Shell)

| Route | Component | Tab | Guard | Wrapper |
|-------|-----------|-----|-------|---------|
| `/leads` | `LeadListScreen` | Leads | None | `AppShell` |
| `/leads/search` | `NewSearchScreen` | — | `tenant_admin` | `AppShell` |
| `/leads/:id` | `LeadDetailScreen` | — | None | `AppShell` |
| `/messages` | `InboxScreen` | Messages | None | `AppShell` |
| `/messages/:leadId` | `ConversationScreen` | — | None | `AppShell` |
| `/tasks` | `TaskListScreen` | Tasks | None | `AppShell` |

### 1.5 Auth Required — Non-Tab Screens (No Shell) or Modals

| Route | Component | Feature | Guard | Wrapper |
|-------|-----------|---------|-------|---------|
| `/billing` | `BillingScreen` | `billing` | `tenant_admin` | `AppShell` |
| `/settings` | `SettingsScreen` | `settings` | `tenant_admin` | `AppShell` |
| `/settings/team` | `TeamScreen` | `settings` | `tenant_admin` | `AppShell` |
| `/profile` | `ProfileScreen` | `auth` | None | `AppShell` |
| `/notifications` | `NotificationsScreen` | `shared` | None | `AppShell` |

### 1.6 Super Admin (Sidebar Shell)

| Route | Component | Feature | Guard | Wrapper |
|-------|-----------|---------|-------|---------|
| `/admin` | `AdminDashboardScreen` | `admin` | `super_admin` | `AdminShell` |
| `/admin/tenants/:id` | `TenantDetailScreen` | `admin` | `super_admin` | `AdminShell` |
| `/admin/logs` | `SystemLogsScreen` | `admin` | `super_admin` | `AdminShell` |

---

## 2. Navigation Flow Diagrams (React Router)

### 2.1 Master App Flow

```mermaid
flowchart TD
    START([App Launch]) -->|Load Check| VER{Version Check}
    VER -->|Outdated| FORCE[/force-update/]
    VER -->|OK| AUTH{User Signed In?}
    
    AUTH -->|No| PUB{Which public route?}
    PUB --> LAND[/]
    PUB --> LOGIN[/login]
    
    AUTH -->|Yes| GUARD{Route Guard}
    GUARD -->|Blocked Claim| SUSPEND[/suspended/]
    GUARD -->|No Tenant| ONBOARD[/onboarding/company/]
    GUARD -->|OK| SHELL[AppShell]
    
    SHELL --> TABS{Tabs}
    TABS --> LEADS[/leads/]
    TABS --> MSG[/messages/]
    TABS --> TASKS[/tasks/]
```

---

## 3. Screen Templates (Layout Patterns)

Use these standard layouts (`apps/web/src/components/layout/`):

| Template | Screens |
|----------|---------|
| **Standard List** | LeadList, Inbox, TaskList, ProductCatalog |
| **Standard Detail** | LeadDetail, Billing, TenantDetail, Profile |
| **Conversation** | ConversationScreen (Chat UI) |
| **Onboarding** | CompanySetup, FirstSearch, LeadPreview, TrialActivation |
| **Centered Card** | Login, ForceUpdate, Blocked, InviteAccept |
| **Admin Dashboard** | AdminDashboard, SystemLogs |

---

## 4. Shared Component Registry (shadcn/ui + custom)

**Reuse these components (`apps/web/src/components/ui/` or `common/`):**

### 4.1 Common Components

| Component | Props | Usage |
|-----------|-------|-------|
| `AppBanner` | `variant` (info/warning/destructive), `title`, `action` | Global Banners |
| `EmptyState` | `icon`, `title`, `description`, `action` | List Screens |
| `ErrorState` | `message`, `onRetry` | List Screens |
| `Skeleton` | `className` | Loading States |
| `StatusBadge` | `status` (new/hot/etc.) | LeadList, LeadDetail |
| `Button` | `variant` (default/outline/destructive/ghost) | Everywhere |
| `Avatar` | `src`, `fallback` | Everywhere |
| `Dialog` | `open`, `onOpenChange`, `title` | Modals |
| `Sheet` | `open`, `onOpenChange`, `side` | Drawers/Bottom Sheets |
| `AppHeader` | `title`, `actions` | Screen Headers |

### 4.2 Feature-Specific Components

| Component | Feature | Usage |
|-----------|---------|-------|
| `LeadCard` | `leads` | Lead List Item |
| `ConversationTile` | `communication` | Inbox List Item |
| `BillingHistoryCard` | `billing` | Billing Screen |
| `TeamMemberRow` | `settings` | Team Screen |
| `AddNoteDialog` | `leads` | Lead Detail |
| `FollowUpDialog` | `tasks` | Lead Detail, Task List |

---

## 5. Hook Registry (React Query + Zustand)

**Standard Hooks (`apps/web/src/hooks/`):**

### 5.1 Core Hooks

| Hook | Returns | Usage |
|------|---------|-------|
| `useAuth()` | `user`, `loading`, `signIn`, `signOut` | Auth |
| `useTenant()` | `tenant`, `isLoading` | Global Context |
| `useVersionCheck()` | `isForceUpdate`, `message` | Version Control |
| `useNotificationCount()` | `count` | App Header |

### 5.2 Feature Hooks (React Query)

| Hook | Query Key | Returns |
|------|-----------|---------|
| `useLeads(filters)` | `['leads', filters]` | `data` (List), `isLoading` |
| `useLead(id)` | `['lead', id]` | `data` (Lead) |
| `useInteractions(id)` | `['interactions', id]` | `data` (List) |
| `useInbox()` | `['inbox']` | `data` (List) |
| `useConversation(id)` | `['conversation', id]` | `data` (List) |
| `useTasks()` | `['tasks']` | `data` (List) |
| `useBilling()` | `['billing']` | `data` (Tenant Billing) |
| `useTeamMembers()` | `['team']` | `data` (List) |

---

## 6. Route Guard Logic (`ProtectedRoute.tsx`)

Core logic for the route wrapper:

```typescript
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const { tenant } = useTenant();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check Subscription Status
  if (tenant?.subscription_status === 'suspended' && location.pathname !== '/suspended') {
     return <Navigate to="/suspended" replace />;
  }

  // Check Onboarding
  if (!tenant && !location.pathname.startsWith('/onboarding')) {
     return <Navigate to="/onboarding/company" replace />;
  }

  return children;
};
```

---

## 7. Implementation Checklist

- [ ] **Components:** Verify all shadcn/ui components installed.
- [ ] **Routes:** Ensure `AppRoutes.tsx` imports all screens correctly.
- [ ] **Guards:** Test `ProtectedRoute` logic with various auth states.
- [ ] **Layouts:** Build `AppShell` (Mobile Bottom Nav + Desktop Sidebar fallback).
- [ ] **State:** Set up `QueryClientProvider` and `useAuth` store.

---
