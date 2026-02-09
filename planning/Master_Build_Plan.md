# Master Build Plan: CoCRM React PWA

**Implementation Philosophy:**
*   **One Prompt Per Step:** Copy and paste the prompt block into your AI coding assistant.
*   **Verify Then Commit:** Do not move to the next step until the current step's acceptance criteria are met.
*   **Deploy Continually:** Every phase ends with a full deployment to Dev and Prod to ensure no integration debt accumulates.

**Reference Documents:**
*   `25_Build_Phase_Breakdown.md` (Detailed Logic)
*   `Manual_Configuration_Guide.md` (External Setup Instructions)
*   `0_Antigravity_Handoff_Guardrails.md` (Strict Rules)

---

## Phase 0: Scaffold, Auth & Landing

### Step 0.1: Project Initialization & Config
**Prompt:**
```text
Phase 0, Step 0.1: Initialize Project Structure

Action:
1. Create a workspace with a Monorepo structure:
   - apps/web (Vite + React + TypeScript)
   - functions (Firebase Cloud Functions)
   - packages/shared (Shared types/logic if needed, or keep simple in proper folders)
2. Initialize Tailwind CSS and Shadcn UI in apps/web.
   - Use 'slate' as default color, css variables: true.
3. Create the file structure defined in `planning/6_Project_Structure.md`.
4. Copy the contents of `planning/5_Security_Rules.md` to `firestore.rules`.
5. Copy the contents of `planning/2_Data_Schema.md` (indexes section) to `firestore.indexes.json`.

References:
- planning/6_Project_Structure.md
- planning/5_Security_Rules.md
- planning/2_Data_Schema.md
```

### Step 0.2: Core UI Components
**Prompt:**
```text
Phase 0, Step 0.2: Build Core UI Layout & Theme

Action:
1. Install lucide-react, sonner (toast), vaul (drawer), clsx, tailwind-merge.
2. Implement the `theme.css` / `index.css` following `planning/17_UI_Design_Standards.md`.
3. Scaffold the basic AppShell:
   - Components: `apps/web/src/components/layout/AppShell.tsx`, `AppBar.tsx`, `BottomNav.tsx`.
   - Routes: Setup React Router with placeholder pages for /leads, /messages, /tasks.
4. Implement shared components: `Button`, `Input`, `Card`, `Skeleton`, `AppBanner`, `EmptyState`.

Constraint:
- Strict TypeScript mode.
- Mobile-first responsive design.

References:
- planning/17_UI_Design_Standards.md
- planning/24_Screen_Map_Component_Registry.md
- planning/27_Error_Code_Registry.md

Action:
5. Implement `apps/web/src/utils/errorMapper.ts` using the logic defined in `planning/27_Error_Code_Registry.md`. This will be used by all API hooks.
```

### Step 0.3: Authentication Implementation
**Prompt:**
```text
Phase 0, Step 0.3: Implement Authentication

Action:
1. Install firebase and ReactFire or standard Firebase SDK hooks.
2. Create `apps/web/src/lib/firebase.ts` (initialize Auth, Firestore, Functions).
3. Implement `LoginScreen.tsx`:
   - Email/Password login.
   - Google Sign-In button.
   - Forgot Password flow (toggle state).
4. Implement `ProfileScreen.tsx` (View/Edit Name, Phone).
5. Create `contexts/AuthContext.tsx` or `useAuth` hook.
6. Create `ProtectedRoute.tsx` wrapper.
7. Implement Cloud Function: `updateUserProfile` (Callable).
   - Updates `users/{uid}`.
   - Adds audit fields (updated_at/by).

References:
- planning/16_UI_Screens.md (Section 1)
- planning/21_Standard_SaaS_Features.md (Profile & Audit Fields)
```

### Step 0.4: Landing Page
**Prompt:**
```text
Phase 0, Step 0.4: Landing Page & Public Routes

Action:
1. Create `LandingPage.tsx` at route `/`.
   - Hero section, Features Grid, Pricing, Footer.
   - Link "Get Started" to `/login`.
2. Create `PrivacyPolicy.tsx` and `TermsOfService.tsx` at `/privacy` and `/terms`.
   - Use static placeholder text (lorem ipsum or standard legal boilerplate).
3. Ensure unauthenticated users can see these 3 pages.
4. Ensure authenticated users are redirected to `/leads` if they try to visit `/login`.

References:
- planning/22_Landing_Page_Requirements.md
```

### Step 0.5: Database Seeding
**Prompt:**
```text
Phase 0, Step 0.5: Database Seeding Scripts

Action:
1. Create `scripts/seed_firestore.ts` using `firebase-admin`.
2. Implement the seed data logic defined in `planning/26_Seed_Data.md`.
   - Should target `cocrm-dev` project by default.
   - Should be idempotent (check if exists before creating).
3. Create a `package.json` script: `"seed:dev": "ts-node scripts/seed_firestore.ts"`.

References:
- planning/26_Seed_Data.md
```

### 🛑 Manual Configuration (User Action Required)
> **STOP:** Follow instructions in `planning/Manual_Configuration_Guide.md` -> **Section 0**.
> * Enable Auth (Email/Google).
> * Create Firestore Database.
> * Set Secrets (`firebase functions:secrets:set`).

### 🚀 Deployment Command
**Prompt:**
```text
Phase 0: Deployment

Action:
1. Write a script `deploy.ps1` (or .sh) that:
   - Bumps version number in package.json.
   - Builds the web app (`npm run build`).
   - Deploys Rules, Indexes, Functions, and Hosting to the 'dev' target.
   - Command: `firebase deploy --only firestore:rules,firestore:indexes,functions,hosting --project cocrm-dev`
2. Run the deployment for cocrm-dev.
```

### ✅ Verification Checklist
- [ ] Visitor can see Landing Page at `https://cocrm-dev.web.app`.
- [ ] User can sign up with Google.
- [ ] Firestore `users` document created with audit fields.
- [ ] User can edit profile name.
- [ ] User can sign out.

---

## Phase 1: Onboarding & Discovery

### Step 1.1: Tenant & Lead Logic (Backend)
**Prompt:**
```text
Phase 1, Step 1.1: Cloud Functions for Onboarding

Action:
1. Implement `createTenant` (Callable):
   - Creates `tenants/{tenantId}`.
   - Sets custom claims on user (token refresh required).
   - Rate Limit: Implement `functions/src/config/limits.ts` and `functions/src/utils/rateLimiter.ts` (Doc 28). Enforce limits here.
2. Implement `discoverLeads` (Callable):
   - Accepts keyword + location.
   - Uses `GOOGLE_MAPS_API_KEY` (Places API).
   - Writes to `leads` collection.
   - Implements preview mode (limit 5, no credits).
3. Implement `activateTrial` (Callable):
   - Sets subscription_status: 'trial'.
   - Adds 500.00 credits.
   - Logs transaction.

References:
- planning/3_API_Workflows.md (Section 1)
- planning/14_Self_Serve_Onboarding.md
```

### Step 1.2: Onboarding UI
**Prompt:**
```text
Phase 1, Step 1.2: Onboarding Screens

Action:
1. Implement `CompanySetupScreen` (Step 1).
2. Implement `FirstSearchScreen` (Step 2).
3. Implement `LeadPreviewScreen` (Step 3).
4. Implement `TrialActivationScreen` (Step 4).
5. Implement `OnboardingFlow` layout/wrapper to manage steps.

References:
- planning/16_UI_Screens.md (Section 2)
```

### Step 1.3: Lead List & Detail
**Prompt:**
```text
Phase 1, Step 1.3: Lead Management UI

Action:
1. Create `leads/components/LeadListScreen.tsx`.
   - Infinite scroll (useIntersectionObserver).
   - Status filters tabs.
   - LeadCard component.
2. Create `leads/components/LeadDetailScreen.tsx`.
   - Business Info Card.
   - Status changing action.
3. Wire up `useLeads` and `useLead` React Query hooks.
4. Implement `NewSearchScreen` for "Find More Leads" (Full mode).

References:
- planning/16_UI_Screens.md (Section 3)
```

### 🛑 Manual Configuration
> **STOP:** Follow instructions in `planning/Manual_Configuration_Guide.md` -> **Section 1**.
> * Enable Google Places API.
> * Enable Billing on Google Cloud Project.

### 🚀 Deployment Command
**Prompt:**
```text
Phase 1: Deployment

Action:
Run the deployment script for 'dev': `npm run deploy:dev` (or equivalent).
```

### ✅ Verification Checklist
- [ ] New user flows through onboarding steps 1-4.
- [ ] "First Search" returns real results from Google Maps.
- [ ] Trial activation adds credits.
- [ ] Lead List shows the discovered leads.

---

## Phase 2: Lead Pipeline (Enrichment, AI, Dashboard)

### Step 2.1: Enrichment & Scoring (Backend)
**Prompt:**
```text
Phase 2, Step 2.1: Enrichment & AI Cloud Functions

Action:
1. Implement `enrichLeads` (Callable).
   - Call Apify Actor.
   - Deduct credits.
2. Implement `handleApifyWebhook`.
   - Update lead with email/socials.
3. Implement `scoreLead` (Firestore Trigger on update).
   - Triggered when enrichment completes.
   - Call Vertex AI (Gemini Flash).
   - Update `ai_analysis` map and `priority`.

References:
- planning/3_API_Workflows.md (Section 2 & 3)
```

### Step 2.2: Advanced Lead UI & Exports
**Prompt:**
```text
Phase 2, Step 2.2: Lead UI Polish

Action:
1. Update `LeadDetailScreen` to show:
   - AI Insight Card (Summary, Score, Priority).
   - Contact Details (Email, Website, Socials).
2. Implement `ListSearchBar` (Client-side + Prefix).
3. Implement `ExportButton` (CSV generation using papaparse).
4. Implement `ArchiveLead` action and `ArchivedLeadsScreen`.
5. Add `DashboardSummaryCard` to top of Lead List.

References:
- planning/21_Standard_SaaS_Features.md
```

### 🛑 Manual Configuration
> **STOP:** Follow `planning/Manual_Configuration_Guide.md` -> **Section 2**.
> * Apify Token.
> * Vertex AI Permissions.

### 🚀 Deployment Command
**Prompt:**
```text
Phase 2: Deployment

Action:
Run deployment script for 'dev'.
```

---

## Phase 3: Communication (WhatsApp)

### Step 3.1: Messaging Backend
**Prompt:**
```text
Phase 3, Step 3.1: WhatsApp Cloud Functions

Action:
1. Create `providers/messaging/msg91Adapter.ts` implementing IMessagingProvider.
2. Implement `sendWhatsapp` (Callable):
   - 3-phase credit flow (Reserve -> Send -> Confirm).
   - Template handling.
3. Implement `handleInboundMessage` (HTTP Function):
   - Webhook parser.
   - Log interaction.
   - Trigger AI Reply.
4. Implement `aiReply` (Trigger):
   - Generate draft response using RAG logic.

References:
- planning/3_API_Workflows.md (Section 4)
- planning/19_WhatsApp_Templates.md
```

### Step 3.2: Messaging UI
**Prompt:**
```text
Phase 3, Step 3.2: Inbox & Conversation UI

Action:
1. Implement `InboxScreen`:
   - List of conversations sorted by recency.
   - Unread and Draft indicators.
2. Implement `ConversationScreen`:
   - Chat bubble list (Inbound/Outbound).
   - Sticky "AI Draft" banner with Approve/Edit.
   - Send Template button.
3. Implement `NotificationBell` and `NotificationsScreen`.

References:
- planning/16_UI_Screens.md (Section 4)
- planning/21_Standard_SaaS_Features.md (Notifications)
```

### 🛑 Manual Configuration
> **STOP:** Follow `planning/Manual_Configuration_Guide.md` -> **Section 3**.
> * MSG91 Auth Key & Webhooks.
> * Template Approval.

### 🚀 Deployment Command
**Prompt:**
```text
Phase 3: Deployment

Action:
Run deployment script for 'dev'.
```

---

## Phase 4: Tasks & Follow-ups

### Step 4.1: Tasks & Logic
**Prompt:**
```text
Phase 4, Step 4.1: Tasks & Scheduling

Action:
1. Add `next_follow_up_at` picker to `LeadDetailScreen`.
2. Implement `TaskListScreen`:
   - Group by Overdue, Today, Upcoming.
3. Implement Scheduled Function `checkDueTasks`:
   - Runs daily.
   - Creates notifications for due tasks.

References:
- planning/16_UI_Screens.md (Section 5)
```

### 🚀 Deployment Command
**Prompt:**
```text
Phase 4: Deployment

Action:
Run deployment script for 'dev'.
```

---

## Phase 5: Settings & Team

### Step 5.1: Settings & Permissions
**Prompt:**
```text
Phase 5, Step 5.1: Team & Config UI

Action:
1. Implement `SettingsScreen` menu.
2. Implement `TeamScreen`:
   - List members.
   - Invite Member (via `sendInvite` CF).
   - `PermissionEditor` component.
3. Implement `ProductCatalogScreen` (CRUD products).
4. Implement `BrochureUploadScreen` (Upload PDF -> Index).

References:
- planning/16_UI_Screens.md (Section 7)
- planning/8_Super_Admin_Workflows.md
```

### 🛑 Manual Configuration
> **STOP:** Follow `planning/Manual_Configuration_Guide.md` -> **Section 5**.
> * Storage CORS rules.

### 🚀 Deployment Command
**Prompt:**
```text
Phase 5: Deployment

Action:
Run deployment script for 'dev'.
```

---

## Phase 6: Super Admin & Logs

### Step 6.1: Admin Portal
**Prompt:**
```text
Phase 6, Step 6.1: Super Admin Features

Action:
1. Implement `AdminDashboardScreen` (Tenant table).
2. Implement `TenantDetailScreen` (Impersonation logic).
3. Implement `SystemLogsScreen` (View `system_logs` collection).
4. Implement `logErrors` backend utility usage audit.

References:
- planning/8_Super_Admin_Workflows.md
```

### 🚀 Deployment Command
**Prompt:**
```text
Phase 6: Deployment

Action:
Run deployment script for 'dev'.
```

---

## Phase 7: Billing

### Step 7.1: Razorpay Integration
**Prompt:**
```text
Phase 7, Step 7.1: Billing Implementation

Action:
1. Implement `BillingScreen` (Transactions history, Plan info).
2. Implement `TopUpScreen` (Packages selection).
3. Implement `handleRazorpayWebhook` (Backend):
   - Verify signature.
   - Credit wallet.

References:
- planning/10_Billing_Subscription.md
```

### 🛑 Manual Configuration
> **STOP:** Follow `planning/Manual_Configuration_Guide.md` -> **Section 7**.
> * Razorpay Keys & Webhooks.

### 🚀 Deployment Command
**Prompt:**
```text
Phase 7: Deployment

Action:
Run deployment script for 'dev'.
```

---

## Phase 8: PWA & Polish

### Step 8.1: Final Config
**Prompt:**
```text
Phase 8, Step 8.1: PWA & Force Update

Action:
1. Configure `vite-plugin-pwa` (manifest, service worker).
2. Implement `ForceUpdateScreen` logic (compare versions).
3. Add `OnboardingChecklist` component.

References:
- planning/13_Deployment_Strategy.md
```

### 🛑 Manual Configuration
> **STOP:** Follow `planning/Manual_Configuration_Guide.md` -> **Section 8**.
> * Asset Generation (icons).

### 🚀 Final Deployment
**Prompt:**
```text
Phase 8: Final Deployment

Action:
1. Run deployment script for 'dev'.
2. Verify all acceptance criteria.
3. Run deployment script for 'prod': `npm run deploy:prod`.
```
