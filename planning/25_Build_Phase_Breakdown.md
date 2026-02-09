"Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable)."

# 25. Build Phase Breakdown & Acceptance Criteria

**Purpose:** This document defines the exact deliverables, dependencies, and acceptance tests for every build phase. No phase is "done" until every acceptance criterion passes. Use this as the milestone review checklist between CoCRM and Antigravity.

**Rule:** Phases are sequential. A phase cannot begin until the previous phase's acceptance criteria are fully met, unless explicitly marked as parallelizable.

---

## Phase Summary

| Phase | Name | Focus | Estimated Steps | Dependencies |
|-------|------|-------|:-:|--------------|
| **0** | Scaffold, Auth & Landing | Project setup, authentication, routing, shared UI, public pages | 14 | None (starting point) |
| **1** | Onboarding & First Discovery | Self-serve signup, Google Maps discovery, trial activation, basic lead screens, banners | 13 | Phase 0 complete |
| **2** | Lead Pipeline (Enrich + Score) | Apify enrichment, AI scoring, search, export, dashboard, archive | 8 | Phase 1 complete |
| **3** | Communication | WhatsApp send/receive, AI drafts, inbox, notifications | 8 | Phase 1 complete (leads exist) |
| **4** | Tasks & Follow-ups | Task list, overdue tracking, scheduled queue | 3 | Phase 1 + Phase 3 complete |
| **5** | Settings & Team | Tenant settings, team management, invitations, permissions, brochures, products | 7 | Phase 0 + Phase 1 complete |
| **6** | Super Admin & Logging | Admin dashboard, tenant management, system logs, login history, activity logs | 6 | Phase 2 + Phase 5 complete |
| **7** | Billing & Subscription | Razorpay integration, credit top-ups, subscription lifecycle, payment failure handling | 5 | Phase 1 complete (build just before launch) |
| **8** | PWA & Final Polish | PWA config, onboarding checklist, force update, final QA | 3 | All prior phases complete |

---

## Phase 0: Scaffold, Auth & Landing Page

**Goal:** A working React PWA shell with Firebase Auth, role-based routing, shared UI components, and a public-facing landing page with legal pages. A developer should be able to log in, see route guards working, navigate an empty app shell, and visitors should see the marketing landing page.

**Parallelizable with:** Nothing — this is the foundation.

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 0.1 | **Firebase Project Setup (Dev)** — Create `cocrm-dev-project`, enable Auth (Email + Google), Firestore, Storage, App Check. Deploy `firestore.rules` and `firestore.indexes.json`. Set all 9 secrets in Secret Manager. | Doc 13 §1, Doc 18 §1–§6, Doc 23 |
| 0.2 | **React + Vite + Router Setup** — Initialize monorepo (`apps/web/`, `functions/`, `ai-service/`). Configure Vite, TypeScript strict mode, Tailwind CSS, shadcn/ui. Set up React Router v6 with all route definitions from Doc 24 §1. Configure `.env.development`. | Doc 6 §1, Doc 7 §1, Doc 24 §1 |
| 0.3 | **Auth Flow** — Implement LoginScreen (Email/Password + Google Sign-In), sign-up, sign-out. Firebase Auth integration with `onAuthStateChanged`. Forgot Password flow (email reset). | Doc 16 §1, Doc 21 §2 |
| 0.3.1 | **Profile Screen** — ProfileScreen with name/phone edit (Section A–B), change password (Section C), sign-out + delete account stub (Section D). Implement `updateUserProfile` Cloud Function. | Doc 21 §3, Doc 3 §13 |
| 0.4 | **Custom Claims Setup** — Cloud Function to set custom claims (`tenant_id`, `role`). Claims structure: `{ tenant_id, role: "tenant_admin" | "sales_rep" | "super_admin" }`. | Doc 5 §helpers, Doc 11 |
| 0.5 | **Route Guards** — `ProtectedRoute` (requires auth), `RoleGuard` (checks `tenant_admin` / `super_admin`), subscription status guard (redirects suspended → `/suspended`), onboarding guard (redirects incomplete onboarding → `/onboarding/*`). | Doc 24 §2, Doc 5 |
| 0.6 | **App Shell & Navigation** — `AppShell` with Bottom Nav (3 tabs: Leads, Messages, Tasks), `AppBar` with NotificationBell placeholder, `AdminShell` with sidebar for super admin. `PublicLayout` for unauthenticated routes. | Doc 24 §2, Doc 16 §9 |
| 0.7 | **Shared UI Components** — Build full shared component library: `Button`, `Input`, `Dialog`, `Skeleton`, `ErrorState`, `EmptyState`, `SnackBar/Toast` (sonner), `LoadingSkeleton`, `ListSearchBar`. | Doc 16 §9, Doc 17 |
| 0.8 | **Shared Utilities** — `errorMapper.ts`, `dateUtils.ts`, `currencyUtils.ts` (paisa → ₹), `csvExporter.ts`, `withAuditFields()` helper. | Doc 6 §3, Doc 0 B8/B12 |
| 0.9 | **React Query + Zustand Setup** — Configure `QueryClient` provider, set default stale/cache times. Create `uiStore.ts` (Zustand) for client-only state. Create `useAuth`, `useTenant` shared hooks. | Doc 0 B5, Doc 6 §3 |
| 0.10 | **App Check Integration** — Initialize reCAPTCHA Enterprise provider in `firebase.ts`. Debug token setup for local dev. Verify `onCall` functions reject unchecked requests. | Doc 23 §2–§3 |
| 0.11 | **Cloud Functions Scaffold** — Set up `functions/` directory structure per Doc 6 §4. Create `logErrors` wrapper. Create `config/`, `providers/messaging/` (IMessagingProvider interface + MSG91 adapter stub), `triggers/`, `services/`, `utils/`, `types/` folders. Deploy a health-check function. | Doc 6 §4–§5, Doc 0 B4/B9, Doc 20 |
| 0.12 | **Landing Page** — Route: `/`. Hero section (headline, subheadline, CTA), Features grid (3 cards mapping to 3 tabs), How It Works (3 steps), Pricing section (trial CTA), Footer with legal links. Version badge (`VITE_APP_VERSION`). SEO meta tags. "Get Started Free" → `/login`. | Doc 22 §2 |
| 0.13 | **Privacy Policy + Terms of Service** — Routes: `/privacy`, `/terms`. Static pages with legal content. Required for Google OAuth consent screen approval. Linked from landing page footer and login page. | Doc 22 §1 |
| 0.14 | **Login Page ↔ Landing Page Link** — Add "Back to Home" link on LoginScreen. Add version display at bottom of LoginScreen. Ensure smooth navigation between `/` → `/login` → onboarding flow. | Doc 22 §3 |
| 0.15 | **Database Seeding** — `scripts/seed_firestore.ts` script. Populates initial `products` (PLG tiers), `system_config` (public settings). Run via `npm run seed:dev`. | Doc 26 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 0-AC1 | **Auth: Email signup** | New user can sign up with email/password. `users` doc created in Firestore with audit fields. User lands on onboarding flow. |
| 0-AC2 | **Auth: Google sign-in** | New user can sign in with Google. `users` doc created with `auth_provider: "google"`. Password section hidden on ProfileScreen. |
| 0-AC3 | **Auth: Forgot password** | "Forgot Password" link on LoginScreen sends Firebase reset email. User can reset and log in with new password. |
| 0-AC4 | **Auth: Profile edit** | User can edit name/phone on ProfileScreen. `updateUserProfile` CF validates input, writes to Firestore, sets audit fields. |
| 0-AC5 | **Route guard: Unauthenticated** | Unauthenticated user visiting `/leads` is redirected to `/login`. |
| 0-AC6 | **Route guard: Role-based** | `sales_rep` visiting `/settings` is redirected. `tenant_admin` can access `/settings`. `super_admin` can access `/admin`. |
| 0-AC7 | **Route guard: Subscription** | User with `subscription_status: "suspended"` is redirected to `/suspended` on any app route. |
| 0-AC8 | **App Shell renders** | Bottom nav shows 3 tabs. Tapping each tab navigates to correct route. AppBar renders with placeholder notification bell. |
| 0-AC9 | **Shared components render** | All shared components render correctly in isolation: `EmptyState`, `ErrorState`, `Skeleton`, `Toast`. |
| 0-AC10 | **App Check blocks** | Callable function called WITHOUT App Check token returns `failed-precondition`. With valid token, proceeds normally. |
| 0-AC11 | **Cloud Functions deploy** | `firebase deploy --only functions` succeeds with zero errors. Health-check function returns 200. |
| 0-AC12 | **TypeScript compiles** | `tsc --noEmit` passes with zero errors in both `apps/web/` and `functions/`. |
| 0-AC13 | **ESLint passes** | `eslint .` reports zero errors across the entire codebase. |
| 0-AC14 | **Audit fields utility** | `withAuditFields()` correctly sets `created_at`, `created_by`, `updated_at`, `updated_by` on create and update operations. |
| 0-AC15 | **Security rules deployed** | `firestore.rules` deployed. Security rules tests pass: Tenant A cannot read Tenant B's docs. `credit_transactions` client write blocked. `users` client write blocked. |
| 0-AC16 | **Landing page renders** | All sections visible: Nav, Hero, Features, How It Works, Pricing, Footer. "Get Started Free" CTA navigates to `/login`. Version badge shows correct `VITE_APP_VERSION`. |
| 0-AC17 | **Legal pages render** | `/privacy` and `/terms` render static content. Links work from landing page footer and login page. |
| 0-AC18 | **Landing → Login flow** | Clicking "Get Started Free" or "Start Free Trial" on landing page navigates to `/login`. LoginScreen has "Back to Home" link. Version displayed on login page. |

### Phase 0 Exit Gate

> **All 18 acceptance criteria pass. A visitor can see the landing page, navigate to login, sign up, see the empty app shell with correct routing, and sign out. Legal pages are live for Google OAuth approval. Cloud Functions deploy without errors. Security rules are enforced.**

---

## Phase 1: Onboarding & First Discovery

**Goal:** The complete first-run experience: a new visitor lands on the app, signs up, creates a tenant, searches Google Maps, sees real leads (the "Aha Moment"), activates a free trial, and lands on a basic lead list where they can browse their discovered leads. This is the most critical phase — if the first 3 minutes don't work, nothing else matters.

**Depends on:** Phase 0 complete.

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 1.1 | **Cloud Function: `createTenant`** — Creates `tenants` doc with `subscription_status: "pending"`, `credits_balance: 0`, `trial_ends_at: null`. Sets custom claims (`tenant_id`, `role: "tenant_admin"`). Links `users` doc. Rate limited by IP. Sets default `usage_limits` and `config`. | Doc 3 §1.3, Doc 14 §2 Step A |
| 1.2 | **Cloud Function: `discoverLeads`** — Google Places API integration. Deterministic ID (`SHA256(tenant_id + google_place_id)`). Sets `search_name`. Rate limit: 10 calls/min per tenant. `preview_mode` support (limit=5, no credits, max 3 searches for pending tenants). Full mode: quota check against `usage_limits.max_leads_per_month`. | Doc 3 §1 |
| 1.3 | **Cloud Function: `activateTrial`** — Precondition: `subscription_status` must be "pending". Sets `subscription_status: "trial"`, `credits_balance: 50000` (₹500), `trial_ends_at: now + 7 days`. Creates `credit_transactions` doc. Sets `onboarding_step: "trial_activated"`. | Doc 3 §1.1, Doc 14 §2 Step C |
| 1.4 | **CompanySetupScreen** — Onboarding Step 1/4. Form: Company Name + City. Calls `createTenant` CF. Routes to FirstSearchScreen on success. | Doc 14 §2 Step A |
| 1.5 | **FirstSearchScreen** — Onboarding Step 2/4. Keyword + Location inputs. Calls `discoverLeads` with `preview_mode=true`, `limit=5`. Routes to LeadPreviewScreen with results. | Doc 14 §2 Step B |
| 1.6 | **LeadPreviewScreen** — Onboarding Step 3/4. Shows 5 real business results (name, rating, review count) on a map/list. Hook: "We found {X}+ more matches. Start your trial to contact them." CTA routes to TrialActivationScreen. | Doc 14 §2 Step B |
| 1.7 | **TrialActivationScreen** — Onboarding Step 4/4. Summary: "{count} leads found, 7 days free, ₹500 credits." Button: "Start My Free Trial". Calls `activateTrial` CF. On success, routes to main app (`/leads`). | Doc 14 §2 Step C |
| 1.8 | **Onboarding Resumption Logic** — If user drops off mid-flow, detect `onboarding_step` on next login and resume at correct screen. No tenant yet → CompanySetupScreen. `company_created` → FirstSearchScreen. `trial_activated` → main app. | Doc 14 §2.5 |
| 1.9 | **Lead Types & API Layer** — Define `Lead` TypeScript interface matching Doc 2 §3. Create `leadsApi.ts` (fetchLeads, fetchLead, updateLead) with `tenant_id` filter, `is_archived` filter, pagination (`limit`), `serverTimestamp()` on writes. | Doc 2 §3, Doc 0 B6/B7 |
| 1.10 | **React Query Hooks** — `useLeads(filters)`, `useLead(id)`, `useUpdateLead()`. All hooks include `tenant_id` in queryKey. Loading/error/empty states handled. | Doc 0 B5 |
| 1.11 | **LeadListScreen (Basic)** — Pipeline view with status columns (New → Contacted → Responded → Booked → Won/Lost). Lead cards with business name, status, rating, source. Pagination via `useInfiniteQuery`. Full search (ListSearchBar) and NewSearchScreen for running additional `discoverLeads` in full mode. | Doc 16 §3.1, Doc 16 §3.2 |
| 1.12 | **LeadDetailScreen (Basic)** — Business Card (info, map link, phone, website), Status/Assign edit, basic Actions row (Call placeholder, Follow-up). AI Insight card and Timeline are placeholder/empty until Phase 2 (enrichment) and Phase 3 (interactions). | Doc 16 §3.3 |
| 1.13 | **Trial & Credit Banners** — `CreditsWarningBanner` (balance < ₹100), `TrialExpiryBanner` (trial_ends_at within 2 days), `DailyCapBanner` (80% of daily limit reached). Fixed position, visible on all app screens. Essential during trial period to drive urgency. | Doc 16 §9.2 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 1-AC1 | **Tenant creation** | CompanySetupScreen creates `tenants` doc with `subscription_status: "pending"`, `credits_balance: 0`. Custom claims set with `tenant_id` and `role: "tenant_admin"`. User doc linked. |
| 1-AC2 | **Preview search** | FirstSearchScreen shows 5 real Google Maps results. No credits deducted. No quota consumed. Preview limited to max 3 searches for pending tenants. |
| 1-AC3 | **Discover leads (full)** | After trial activation, user runs `discoverLeads` (full mode). Leads appear in LeadListScreen with status "new". Deterministic IDs prevent duplicates on re-search. |
| 1-AC4 | **Trial activation** | Clicking "Start My Free Trial" sets: `subscription_status: "trial"`, `credits_balance: 50000` (₹500), `trial_ends_at: now + 7 days`. `credit_transactions` doc created with reason `"trial_opening_balance"`. |
| 1-AC5 | **Double activation blocked** | Calling `activateTrial` when `subscription_status` is already "trial" or "active" throws `FAILED_PRECONDITION`. |
| 1-AC6 | **Onboarding resumption** | User who completed Step 1 but not Step 4, on next login, is routed to correct onboarding step. User who completed all 4 steps lands in `/leads`. |
| 1-AC7 | **Abuse prevention** | `createTenant` is rate-limited by IP. 11th `discoverLeads` call within 1 minute returns `RESOURCE_EXHAUSTED`. |
| 1-AC8 | **Lead list renders** | LeadListScreen shows leads grouped by status. Pipeline columns render correctly. Pagination loads next page on scroll. |
| 1-AC9 | **Lead detail renders** | LeadDetailScreen shows Business Card section with correct data. All 4 states render (Loading, Data, Empty, Error). |
| 1-AC10 | **Search works** | Typing in `ListSearchBar` filters leads by name (client-side). Prefix search via Firestore works for names not in loaded page (`search_name` field). |
| 1-AC11 | **New search (full mode)** | NewSearchScreen calls `discoverLeads` (full mode). New leads added to list. Quota check enforced against `usage_limits.max_leads_per_month`. |
| 1-AC12 | **Idempotency** | `discoverLeads` with same `google_place_id` for same tenant does not create duplicate leads. |
| 1-AC13 | **End-to-end funnel** | Complete walkthrough: Landing Page → Sign Up → Company Setup → First Search → Preview → Activate Trial → Lead List — all in under 3 minutes with zero errors. |
| 1-AC14 | **Firestore indexes deployed** | All lead-related composite indexes deployed (#1–#6, #15, #17 from Doc 2 §11). Queries work without index errors. |
| 1-AC15 | **Credits warning banner** | When `credits_balance < 10000` (₹100), `CreditsWarningBanner` appears across all app screens. |
| 1-AC16 | **Trial expiry banner** | When `trial_ends_at` is within 2 days, `TrialExpiryBanner` appears with days remaining. When `DailyCapBanner` threshold (80%) is reached, banner shows. |

### Phase 1 Exit Gate

> **All 16 acceptance criteria pass. A new visitor can self-serve from landing page to seeing real Google Maps leads to activating a trial in under 3 minutes. Leads are browsable in a basic list and detail view. Trial/credit banners drive urgency. The core "Aha Moment" funnel works end-to-end.**

---

## Phase 2: Lead Pipeline (Enrichment, Scoring & Polish)

**Goal:** Enrich leads with contact details via Apify, score them with AI via Vertex AI, and polish the lead screens with dashboard metrics, export, archive, and full lead detail. This phase turns raw Google Maps results into actionable, scored prospects.

**Depends on:** Phase 1 complete (leads exist from discovery).

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 2.1 | **Cloud Functions: `enrichLeads` + `handleApifyWebhook`** — Apify actor call with credit deduction (50 paisa/lead). Webhook handler: validate signature, parse results, update `contact_details` (email, phone, social links), set `enrichment_status`. Refund on failure. Updates `search_name`. | Doc 3 §2 |
| 2.2 | **Python AI Service + `scoreLead`** — Deploy `ai-service` to Cloud Run (dev). Implement `POST /score-lead` endpoint with FastAPI + Vertex AI (Gemini 1.5 Flash). Node/TS `scoreLead` trigger (onUpdate: `enrichment_status` → "completed") calls Python service, writes `ai_analysis` (score, summary, suggested_pitch) + `priority` (hot/warm/cold) back. Fallback if AI unavailable (score=50, warm). Idempotency guard. | Doc 3 §3, Doc 4 §1, Doc 6 §5 |
| 2.3 | **LeadDetailScreen (Full)** — Upgrade from Phase 1 basic version. Add: AI Insight card (score, summary, suggested pitch), priority badge (Hot/Warm/Cold), Contact Details section (email, social links from enrichment), enrichment status indicator, Timeline (interaction history — placeholder until Phase 3), CallOutcomeDialog for logging calls, Archive action (soft delete). | Doc 16 §3.3–§3.4, Doc 21 §7 |
| 2.4 | **LeadListScreen (Full)** — Upgrade from Phase 1 basic version. Add: Priority badges (Hot=red, Warm=yellow, Cold=blue), enrichment status indicators, last interaction preview column. | Doc 16 §3.1 |
| 2.5 | **DashboardSummaryCard** — Collapsible card at top of LeadListScreen. Collapsed: Leads This Month, Messages Today, Credits, Follow-ups Due. Expanded: Hot Leads count, Unread Messages count, Trial Days Left. `useDashboardMetrics()` hook. | Doc 21 §6 |
| 2.6 | **Export to CSV** — `csvExporter.ts` utility. Export button on LeadListScreen (tenant_admin only). Exports: Name, Phone, Email, Status, Priority, Rating, Source, Created, Last Contacted. File naming: `leads_{tenant}_{date}.csv`. | Doc 21 §5 |
| 2.7 | **Archived Leads** — `ArchivedLeadsScreen` at `/settings/archived-leads`. List of `is_archived: true` leads. Restore action. Index #18: `tenant_id` + `is_archived` + `created_at`. | Doc 21 §7 |
| 2.8 | **Firestore Indexes** — Deploy enrichment/scoring related indexes (#15, #18 from Doc 2 §11). Verify queries work without index errors. | Doc 2 §11 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 2-AC1 | **Enrich lead** | Triggering enrichment deducts 50 paisa from `credits_balance`. `enrichment_status` transitions: pending → completed/failed. `contact_details` populated on success (email, phone, social links). Refund on failure with `credit_transactions` record. |
| 2-AC2 | **Score lead** | When `enrichment_status` changes to "completed", `scoreLead` triggers automatically. `ai_analysis.score`, `priority` (hot/warm/cold), and `summary` are populated. |
| 2-AC3 | **AI fallback** | If Vertex AI is down, score defaults to 50/warm with `summary: "AI scoring unavailable. Please review manually."`. Lead pipeline is not blocked. |
| 2-AC4 | **AI Service health** | `GET /health` on Python Cloud Run returns 200. `POST /score-lead` returns valid JSON with `qualification_score`, `tag`, `reasoning`. |
| 2-AC5 | **Idempotency** | `scoreLead` does not re-score if `enrichment_status` was already "completed" before the update event. |
| 2-AC6 | **Credit atomicity** | Enrichment deduction is atomic: if Firestore write fails after deduction, credits are not lost (transaction rollback). `credit_transactions` record created with `status: "confirmed"`. |
| 2-AC7 | **Lead detail (full)** | LeadDetailScreen shows: AI Insight card with score + summary, priority badge, contact details from enrichment, enrichment status, archive action. All 4 states render (Loading, Data, Empty, Error). |
| 2-AC8 | **Lead list (full)** | LeadListScreen shows priority badges, enrichment indicators. Sort/filter by priority works. |
| 2-AC9 | **Dashboard card** | DashboardSummaryCard shows at top of LeadListScreen. Collapsed view shows 4 metrics. Expanded shows additional metrics. Data matches Firestore values. |
| 2-AC10 | **Export works** | Clicking "Export" downloads a `.csv` file with correct columns and data. File name follows convention. |
| 2-AC11 | **Archive/Restore** | Archiving a lead sets `is_archived: true`, `archived_at`, `archived_by`. Lead disappears from main list. Appears in ArchivedLeadsScreen. Restore reverses it. |
| 2-AC12 | **End-to-end pipeline** | Complete walkthrough: Discover → Enrich → Score → View scored lead with AI insight — all working without manual intervention. |

### Phase 2 Exit Gate

> **All 12 acceptance criteria pass. Leads discovered in Phase 1 are now enriched with contact details via Apify, scored by AI with priority tags, and visible in a polished list with dashboard metrics, export, and archive. The Python AI service is live on Cloud Run.**

---

## Phase 3: Communication (WhatsApp)

**Goal:** Full WhatsApp messaging pipeline: send templates, receive replies, AI-generated draft responses, conversation UI, and in-app notifications. This is the core revenue-driving feature.

**Depends on:** Phase 1 complete (leads exist to message). Phase 2 recommended but not strictly required (messaging works on un-enriched leads too).

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 3.1 | **Messaging Provider Adapter (MSG91)** — Complete `IMessagingProvider` interface + MSG91 adapter. Methods: `sendWhatsAppTemplate()`, `parseInboundMessage()`, `validateWebhookSignature()`. REST API integration with `MSG91_AUTH_KEY`. | Doc 20 §2–§5 |
| 3.2 | **Cloud Function: `sendWhatsapp`** — Full 3-phase flow: (1) Transaction: validate + reserve credits, (2) External: `messagingProvider.sendWhatsAppTemplate()`, (3) Batch: confirm or refund. Opt-out check, quiet hours queue, daily cap, credit deduction (80p marketing / 30p utility). Creates `interactions` doc + updates lead denormalization fields. | Doc 3 §4, Doc 0 A3/A4 |
| 3.3 | **Cloud Function: `handleInboundMessage`** — Webhook handler. Parse via provider adapter. Resolve tenant by `whatsapp_phone_id`. Lead lookup (phone match). STOP keyword detection → `opted_out`. Log interaction. Update lead inbox fields (`last_interaction_at`, `last_message_preview`, `has_unread_message`). Trigger `aiReply`. Idempotency (duplicate `whatsapp_message_id`). | Doc 3 §4.1 |
| 3.4 | **Cloud Function: `aiReply` + Python endpoint** — Python `POST /ai-reply` with RAG context (brochure vectors + product list + conversation history). Safety layer check. Returns draft text. Node CF creates draft `interaction` (`is_draft: true`), sets `has_pending_draft: true` on lead. | Doc 3 §5, Doc 4 §2/§4 |
| 3.5 | **InboxScreen** — Conversation list sorted by `last_interaction_at` DESC. Each tile: business name, message preview, timestamp, unread dot, draft-ready indicator. `ListSearchBar` for filtering. | Doc 16 §4.1 |
| 3.6 | **ConversationScreen** — Chat bubble UI. Inbound/Outbound/Template message types. AI Draft Banner (sticky top) with Approve/Edit/Dismiss actions. Text input + Send. Marks `has_unread_message: false` on open. "Send Intro Template" button for first contact. Opt-out banner if `opt_in_status == "opted_out"`. | Doc 16 §4.2 |
| 3.7 | **Message Queue & Scheduler** — `message_queue` collection for quiet hours. Cloud Scheduler runs every 5 mins to process due messages. Queue statuses: queued → processing → sent/failed. | Doc 3 §4 (Step 0), Doc 3 §8 |
| 3.8 | **In-App Notifications** — `notifications` collection. NotificationBell in AppBar with unread count badge. NotificationsScreen: list of notifications, tap to navigate, "Mark All Read". CFs create notifications on: lead reply, credits low, trial expiring, task due. Security rules: user reads own only, update `is_read` only. | Doc 21 §10 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 3-AC1 | **Send template** | Clicking "Send Intro Template" on ConversationScreen calls `sendWhatsapp`. Credits deducted (80p). `interactions` doc created with `template_name: "intro_offer_v1"`. Lead status updated to "contacted". Message appears as outbound bubble. |
| 3-AC2 | **3-phase credit flow** | If MSG91 API fails after credit reservation, credits are refunded. `credit_transactions` shows "reserved" → "refunded". Lead is not marked as "contacted". |
| 3-AC3 | **Insufficient credits** | Sending with `credits_balance < 80` throws `FAILED_PRECONDITION: "Insufficient credits"`. No message sent, no credits deducted. |
| 3-AC4 | **Opt-out blocked** | Sending to a lead with `opt_in_status: "opted_out"` throws `FAILED_PRECONDITION`. ConversationScreen shows opt-out banner. |
| 3-AC5 | **Quiet hours queued** | Message sent between 9 PM–9 AM (tenant timezone) is written to `message_queue` with `status: "queued"`, not sent immediately. |
| 3-AC6 | **Daily cap enforced** | When `whatsapp_sent_today >= max_whatsapp_msgs_daily`, `sendWhatsapp` throws `RESOURCE_EXHAUSTED`. |
| 3-AC7 | **Inbound received** | Webhook from MSG91 creates inbound `interaction`. Lead's `has_unread_message: true`, `last_message_preview` updated. If lead was "contacted", auto-advances to "responded". |
| 3-AC8 | **STOP handling** | Inbound "STOP" sets `opt_in_status: "opted_out"`. No AI reply triggered. Future sends blocked. |
| 3-AC9 | **AI draft generated** | After inbound message, `aiReply` creates draft `interaction` with `is_draft: true`. Lead's `has_pending_draft: true`. Draft appears in AI Draft Banner. |
| 3-AC10 | **AI draft approve** | Approving draft triggers `sendWhatsapp` with draft content. Draft bubble hidden. New outbound bubble appears. |
| 3-AC11 | **AI safety blocks** | AI draft containing hallucinated prices/URLs is blocked by safety layer. No draft created. |
| 3-AC12 | **Inbox renders** | InboxScreen shows conversations sorted by recency. Unread dot visible for `has_unread_message: true`. Draft indicator for `has_pending_draft: true`. |
| 3-AC13 | **Idempotency** | Duplicate webhook (same `whatsapp_message_id`) does not create duplicate interaction. |
| 3-AC14 | **Notifications work** | Lead reply creates notification for assigned user. NotificationBell shows unread count. Tapping notification navigates to ConversationScreen. "Mark All Read" clears all. |
| 3-AC15 | **Message queue processes** | Queued message is sent when scheduler runs after quiet hours end. Queue status transitions: queued → processing → sent. |

### Phase 3 Exit Gate

> **All 15 acceptance criteria pass. A tenant admin can send WhatsApp templates, receive replies, see AI-generated draft responses, approve/dismiss them, and manage conversations in a WhatsApp-like inbox. Compliance (opt-out, quiet hours, daily cap, credit deduction) is fully enforced.**

---

## Phase 4: Tasks & Follow-ups

**Goal:** The "Tasks" tab shows follow-ups due, overdue, and upcoming. Owners know exactly who to call today.

**Depends on:** Phase 1 (leads exist) + Phase 3 (follow-ups may be set after messaging).
### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 4.1 | **TaskListScreen** — Route: `/tasks`. Grouped list: Overdue (red), Today (yellow), Upcoming (grey). Each task card: business name, phone, priority, assigned owner, due date. Tap → LeadDetailScreen. `ListSearchBar` integrated. | Doc 16 §5.1 |
| 4.2 | **Follow-up Setting** — On LeadDetailScreen and CallOutcomeDialog, user can set `next_follow_up_at` (date picker) and `follow_up_owner` (user picker). Updates lead doc. | Doc 16 §3.3–§3.4 |
| 4.3 | **Task Due Notifications** — Scheduled CF (daily 9 AM in tenant timezone) queries leads where `next_follow_up_at <= today`. Creates `notifications` with type `"task_due"` for assigned owner. FCM push notification. | Doc 3 §11 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 4-AC1 | **Task list renders** | TaskListScreen shows 3 groups: Overdue, Today, Upcoming. Correct leads appear in each group based on `next_follow_up_at`. |
| 4-AC2 | **Set follow-up** | Setting `next_follow_up_at` on a lead causes it to appear in TaskListScreen on the correct date. |
| 4-AC3 | **Task navigation** | Tapping a task card navigates to LeadDetailScreen for that lead. |
| 4-AC4 | **Task notifications** | At 9 AM, leads with `next_follow_up_at <= today` trigger notifications + FCM push for the assigned `follow_up_owner`. |
| 4-AC5 | **Export tasks** | Export button on TaskListScreen downloads CSV with: Name, Phone, Follow-up Date, Priority, Owner. |

### Phase 4 Exit Gate

> **All 5 acceptance criteria pass. The Tasks tab shows actionable follow-ups. Owners get push notifications for due tasks.**

---

## Phase 5: Settings & Team Management

**Goal:** Tenant admin can manage settings, team members, WhatsApp configuration, product catalog, and brochures.

**Depends on:** Phase 0 (auth) + Phase 1 (tenant exists, leads exist for assignment).

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 5.1 | **SettingsScreen** — Route: `/settings`. Menu list: My Profile, Team, WhatsApp Config, Product Catalog, Brochures, Activity Log (Phase 6), Archived Leads. | Doc 16 §7.1 |
| 5.2 | **TeamScreen + InviteMemberScreen** — View team members. Invite by email (`sendInvite` CF → invitation link). Accept flow (`/join` route → `validateInvitation` + `assignTenantOnSignup`). Remove member (`removeUser` CF). Show "Last active" from `last_login_at`. | Doc 16 §7.2–§7.3, Doc 3 §10 |
| 5.3 | **Permission Editor** — Toggle switches per team member for module-level permissions. `updateUserPermissions` CF. Frontend `usePermissions()` hook for conditional UI rendering. | Doc 21 §9 |
| 5.4 | **WhatsAppSetupScreen** — Configuration for WhatsApp Business phone number. Connect/disconnect flow. Display `config.whatsapp_phone_id`. | Doc 16 §7.4 |
| 5.5 | **ProductCatalogScreen + AddProductScreen** — CRUD for `products` collection. Fields: name, description, price, category. Used by AI reply for context (never invent prices). | Doc 16 §7.5–§7.6 |
| 5.6 | **BrochureListScreen** — List uploaded brochures. Upload dialog triggers `indexBrochure`. Delete action triggers `deleteBrochure`. Status indicators (indexing/ready/failed). | Doc 16 §7.7–§7.8, Doc 3 §6.3–§6.4 |
| 5.7 | **`updateTenantProfile` CF** — Edit company name, city from Settings. Writes to `tenants` doc (which is write-locked to super_admin in security rules, so CF acts as controlled proxy). Creates `activity_logs` entry. | Doc 3 §1.2 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 5-AC1 | **Settings renders** | SettingsScreen shows all menu items. Each navigates to correct sub-screen. |
| 5-AC2 | **Invite team member** | `sendInvite` creates `invitations` doc. Invited user visits `/join?token=xyz`, signs up, is automatically assigned to correct tenant with `sales_rep` role and default permissions. |
| 5-AC3 | **Remove team member** | `removeUser` deactivates user. Removed user can no longer access tenant data. |
| 5-AC4 | **Permissions enforced** | Setting `leads_export: false` on a sales_rep hides the Export button. Setting `billing_view: false` hides the Billing menu. Backend CF also enforces (not just UI). |
| 5-AC5 | **Admin can't edit own permissions** | `updateUserPermissions` rejects requests where caller edits their own permissions. |
| 5-AC6 | **Product catalog CRUD** | Admin can add/edit/delete products. Products appear in `products` collection with audit fields. |
| 5-AC7 | **Brochure management** | Admin can upload brochure (status: indexing -> ready). Admin can delete brochure (removes doc + vectors + file). |
| 5-AC8 | **Tenant profile edit** | Changing company name/city via Settings calls `updateTenantProfile` CF. Firestore updated. Activity log entry created. |
| 5-AC9 | **Invitation expiry** | Invitation with `expires_at` in the past is rejected on `/join`. Shows "Invitation expired" message. |

### Phase 5 Exit Gate

> **All 9 acceptance criteria pass. Tenant admin can manage their team, configure WhatsApp, maintain a product catalog, upload brochures for AI context, and control module-level permissions.**

---

## Phase 6: Super Admin & Logging

**Goal:** Super Admin portal for monitoring all tenants, impersonation, system logs, and tenant-level audit trails.

**Depends on:** Phase 2 (lead pipeline data exists) + Phase 5 (team data exists to manage).

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 6.1 | **AdminDashboardScreen** — Route: `/admin`. Sortable tenant table: Company Name, Owner Email, Plan, Status, Leads Usage, Credits Balance. Static metric cards: Active Tenants, Leads Found Today, WhatsApp Sent Today, Total Credits Burned. | Doc 8 §1/§3 |
| 6.2 | **TenantDetailScreen** — Route: `/admin/tenants/:id`. Full tenant view. Actions: "Login As" (impersonation), "Edit Limits" (quota override), "Suspend" (block access). Impersonation: generates temp auth token, shows persistent red banner on tenant side, logs to `system_logs`. | Doc 8 §1/§2 |
| 6.3 | **SystemLogsScreen** — Route: `/admin/logs`. Paginated list of `system_logs`. Columns: Date, Severity, Source, Error Message, Status. Client-side search + Firestore prefix on `error_message`. Export to CSV. `logError` CF for server-side log creation. | Doc 8, Doc 3 §9 |
| 6.4 | **Login History** — `logLoginEvent` CF (called on every sign-in). Records IP, user agent, auth method, device info. ProfileScreen Section E: last 5 login events. TeamScreen: "Last active" per member. | Doc 21 §8 |
| 6.5 | **Activity Log** — `activity_logs` collection. CFs and client write entries on significant actions (lead status change, archive, export, invite, remove, settings update). ActivityLogScreen at `/settings/activity-log` (tenant_admin only). | Doc 21 §11 |
| 6.6 | **System Config Management** — SettingsScreen for super admin to update global API keys (Google Places, Apify, Vertex AI project) without redeployment. Reads/writes `system_config` collection. | Doc 8 §4 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 6-AC1 | **Admin dashboard renders** | Shows all tenants in sortable table. Metric cards display correct aggregate counts. Only accessible with `super_admin` role. |
| 6-AC2 | **Impersonation works** | Clicking "Login As" on a tenant: shows confirmation dialog, generates temp token with `impersonated_by` claim, navigates to tenant's app, shows red impersonation banner, logs event. "Exit" button returns to admin. |
| 6-AC3 | **Edit limits** | Super admin can increase/decrease a tenant's `usage_limits`. Changes reflect immediately in tenant's dashboard. |
| 6-AC4 | **Suspend tenant** | Suspending a tenant sets `subscription_status: "suspended"`. Tenant users are redirected to AccountBlockedScreen. |
| 6-AC5 | **System logs** | `logError` CF creates entries in `system_logs`. SystemLogsScreen displays them. Search and export work. Client `write: false` in security rules. |
| 6-AC6 | **Login history** | Every sign-in triggers `logLoginEvent`. ProfileScreen shows last 5 events. Rate limited to 5 calls/min/user. |
| 6-AC7 | **Activity log** | Significant actions (lead archive, WhatsApp send, team invite, settings update) create `activity_logs` entries. ActivityLogScreen shows them with filters. |
| 6-AC8 | **Data isolation** | Super admin can see all tenants. Tenant admin can only see their own activity logs. `sales_rep` cannot access activity logs. |

### Phase 6 Exit Gate

> **All 8 acceptance criteria pass. Super admin has full visibility into all tenants with impersonation, monitoring, and log access. Tenant admins have audit trails of team activity.**

---

## Phase 7: Billing & Subscription

**Goal:** Complete billing lifecycle: credit top-ups via Razorpay, subscription management, payment failure handling, and transaction history. Built just before launch — during early stages, all users are on trial or manually onboarded. Credit *deduction* logic already works from Phase 1 (trial grant). This phase adds payment *collection*.

**Depends on:** Phase 1 complete (trial/credit system exists). Best built after Phase 6 (super admin can monitor billing issues).

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 7.1 | **BillingScreen** — Route: `/billing`. Credits Hero Card (balance in ₹), Plan Card (current plan, next billing date, status), Usage Stats (leads/messages/enrichments this period), Transaction History list (paginated, searchable, exportable). | Doc 16 §6.1 |
| 7.2 | **TopUpScreen** — Route: `/billing/topup`. Grid of credit packages (e.g., ₹200, ₹500, ₹1000). Razorpay Web Checkout integration. On success, webhook updates `credits_balance`. | Doc 16 §6.2, Doc 10 §1 |
| 7.3 | **Cloud Function: `createSubscriptionLink`** — Creates Razorpay subscription link for plan selection. Uses `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`. Returns checkout URL. | Doc 3 §6.2 |
| 7.4 | **Cloud Function: `handleRazorpayWebhook`** — Handles events: `payment.captured` (top-up → credit), `subscription.activated`, `subscription.charged`, `subscription.pending` (past_due), `subscription.halted` (suspended), `subscription.cancelled`. Validates `RAZORPAY_WEBHOOK_SECRET`. Atomic credit + ledger writes. | Doc 3 §6.1, Doc 10 §6 |
| 7.5 | **AccountBlockedScreen** — Route: `/suspended`. Shown when `subscription_status` is `"suspended"` or `"cancelled"`. Message + "Update Payment" CTA → Razorpay. | Doc 16 §2, Doc 24 §1.2 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 7-AC1 | **BillingScreen renders** | Shows correct credit balance (paisa → ₹ conversion), current plan, next billing date, usage stats, and transaction history. |
| 7-AC2 | **Top-up flow** | Selecting ₹500 package opens Razorpay checkout. On successful payment, `handleRazorpayWebhook` receives `payment.captured`, adds 50000 paisa to `credits_balance`, creates `credit_transactions` record. Balance updates on BillingScreen. |
| 7-AC3 | **Subscription activation** | `subscription.activated` webhook sets `subscription_status: "active"`, `subscription_id`, `plan_id`, `next_billing_date`. |
| 7-AC4 | **Payment failure → past_due** | `subscription.pending` webhook sets `subscription_status: "past_due"`. Yellow banner appears. Features still work. |
| 7-AC5 | **Payment failure → suspended** | `subscription.halted` webhook sets `subscription_status: "suspended"`. User redirected to AccountBlockedScreen. Features blocked. |
| 7-AC6 | **Transaction history** | All credit events (trial grant, top-up, WhatsApp deduction, enrichment deduction, refund) appear in transaction list with correct amounts and reasons. Export to CSV works. |
| 7-AC7 | **Webhook idempotency** | Duplicate Razorpay webhook (same `payment_id`) does not double-credit the account. |
| 7-AC8 | **Webhook security** | Webhook with invalid `RAZORPAY_WEBHOOK_SECRET` signature is rejected with 401. |

### Phase 7 Exit Gate

> **All 8 acceptance criteria pass. Users can top up credits, subscribe to plans, and the system handles payment failures gracefully with proper account blocking and recovery.**

---

## Phase 8: PWA & Final Polish

**Goal:** PWA configuration, final banners, onboarding checklist, force update mechanism, and comprehensive QA pass.

**Depends on:** All prior phases complete.

### Steps

| Step | Deliverable | Reference Docs |
|------|-------------|----------------|
| 8.1 | **PWA Configuration** — `manifest.json` (name, icons, theme color, start_url). Service worker via `vite-plugin-pwa` + Workbox. Cache strategy: app shell precached, Firestore data via SDK offline persistence. Offline indicator component. | Doc 13 §5, Doc 6 §6 |
| 8.2 | **Onboarding Checklist** — `OnboardingChecklist` component shown during trial period. Steps: First Search ✓, First Lead Enriched, First Message Sent, First Reply Received. Progress bar. Dismissible after completion. | Doc 16 §9.1 |
| 8.3 | **Force Update Screen** — Route: `/force-update`. Checks `system_config_public.min_app_version` against `VITE_APP_VERSION`. If app is outdated, blocks usage and shows "Please refresh to update". | Doc 24 §1.1 |

### Acceptance Criteria

| # | Test | Pass Condition |
|---|------|---------------|
| 8-AC1 | **PWA installable** | Chrome shows "Install" prompt. Installed PWA opens in standalone mode with correct icon/theme. |
| 8-AC2 | **Offline indicator** | Disconnecting network shows offline indicator. Cached data (lead list) remains viewable. Reconnecting hides indicator and syncs. |
| 8-AC3 | **Onboarding checklist** | During trial, checklist shows correct completion state. Each step checks real data (e.g., "First Message Sent" = `interactions` with `direction: "outbound"` exists). |
| 8-AC4 | **Force update** | Setting `min_app_version` to a version higher than `VITE_APP_VERSION` redirects to `/force-update`. Refreshing after deploy clears the block. |
| 8-AC5 | **ImpersonationBanner** | When impersonating (from Phase 6), red banner is visible on ALL screens including landing-related routes when authenticated. |

### Phase 8 Exit Gate

> **All 5 acceptance criteria pass. The product is complete: PWA is installable, onboarding guides new users, and force-update protects against stale clients.**

---

## Global Completion Criteria (Every Phase)

These apply to EVERY phase delivery, in addition to phase-specific criteria:

| # | Criterion | Verified By |
|---|-----------|-------------|
| G1 | `tsc --noEmit` passes with zero errors (both `apps/web/` and `functions/`) | CI or manual |
| G2 | `eslint .` reports zero errors | CI or manual |
| G3 | All screens render 4 states: Loading, Data, Empty, Error | Manual QA |
| G4 | All Firestore writes include audit fields (`created_at/by`, `updated_at/by`) | Code review |
| G5 | All list queries include `where('tenant_id', '==', tenantId)` and `limit(n)` | Code review |
| G6 | No file exceeds 250 lines (components) or 400 lines (hooks/logic) | Linting |
| G7 | No direct Firestore imports in `components/` files | Code review |
| G8 | All Cloud Functions wrapped with `logErrors` | Code review |
| G9 | Security rules deployed and passing rule tests (tenant isolation) | `@firebase/rules-unit-testing` |
| G10 | No `any` types in TypeScript | `tsc` strict mode |
| G11 | Firestore field names are `snake_case` (never camelCase) | Code review |
| G12 | All new dependencies approved (no random npm packages) | Doc 7 cross-check |

---

## Dependency Graph

```
Phase 0 (Scaffold, Auth & Landing Page)
  └──→ Phase 1 (Onboarding & First Discovery) [includes banners]
         ├──→ Phase 2 (Lead Pipeline: Enrich + Score)
         │      └──→ Phase 6 (Super Admin & Logging) ←── also needs Phase 5
         ├──→ Phase 3 (Communication) [Phase 2 recommended, not required]
         │      └──→ Phase 4 (Tasks & Follow-ups)
         ├──→ Phase 5 (Settings & Team) ←── also needs Phase 0
         ├──→ Phase 7 (Billing & Subscription) [build just before launch]
         └──→ Phase 8 (PWA & Final Polish) [needs ALL phases]
```

**Parallelization opportunities:**
- Phase 2 (Lead Pipeline) and Phase 3 (Communication) can run in parallel once Phase 1 is done — they're independent.
- Phase 5 (Settings) can also run in parallel with Phase 2/3.
- Phase 3 (Communication) does NOT require Phase 2 — messaging works on un-enriched leads. But AI reply quality improves with brochure/product data (Phase 5).
- Phase 7 (Billing) is intentionally last before polish — no paying customers during early trial phase. Credit deduction already works from Phase 1.

---

## Milestone Review Process

At the end of each phase:

1. **Developer** runs all acceptance criteria tests and records pass/fail.
2. **Developer** provides a short video walkthrough of the delivered features.
3. **Product Owner** reviews against acceptance criteria checklist.
4. **Blocker resolution:** Any failed AC must be fixed before the next phase starts, unless both parties agree to defer a non-critical item (documented in writing with a deadline).
5. **Sign-off:** Product Owner marks the phase as "Accepted" in the project tracker.

---

**End of File**
