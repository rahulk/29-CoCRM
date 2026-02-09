# Antigravity Handoff Guardrails — CoCRM v1

> **This file is law.** Every planning doc opens with "Implementation must comply with `0_Antigravity_Handoff_Guardrails.md` (non-negotiable)." If a rule here conflicts with anything in Docs 1–16, this file wins.

---

## PART A: PRODUCT RULES (What to Build)

### A1. Product Goal

Build an **AI Personal Sales Assistant for small business owners in India** (study centers, gyms, coaching). The product promise is: **"Get more customers from Google Maps + WhatsApp, without hiring a salesperson."**

### A2. MVP Definition (Must Stay Small)

**3 tabs only:**

1. **Find Leads (Hunter):** Google Maps search → Apify enrichment → AI tags Hot/Warm/Cold → list ready to contact. Default pipeline view: **New → Contacted → Responded → Booked → Won/Lost** (only these 5 shown in UI).
2. **Messages (WhatsApp only in MVP):** template send + reply drafts + guardrails (no hallucinated pricing). Email/SMS are Phase 2.
3. **Tasks:** simple follow-ups list driven by `next_follow_up_at`.

**Phase 2 items — do NOT implement:**
Account deletion workflow, deep link config files (assetlinks.json / apple-app-site-association), email/SMS channels, discount/promotions module, CI/CD pipeline, trend charts in admin dashboard, `priority_rank` integer field.

### A3. Critical "SMB Safety" Rules (Non-Negotiable)

* **MVP AI does not auto-send.** For inbound messages, AI generates **draft_reply only**, user must approve.
* **Opt-out compliance:** if lead `opt_in_status == "opted_out"`, block ALL future outbound. Safety layer must output `BLOCKED: opted_out`.
* **Quiet hours:** messages are queued (not sent) between 9 PM–9 AM in the **tenant's configured timezone** (`config.timezone`).
* **Daily cap:** enforce `usage_current.whatsapp_sent_today` against `usage_limits.max_whatsapp_msgs_daily`.
* **Never invent prices/offers:** replies must only quote from Products catalog / brochure PDF context.

### A4. Billing & Money Correctness (Must Be Atomic)

* **`credits_balance` is in paisa** (e.g., 50000 = ₹500). ALL deductions in paisa.
* **Discovery (Google Maps):** free, quota-limited (not credits).
* **WhatsApp send:** Marketing = 80 paisa, Utility = 30 paisa. If `balance < cost` → throw error, else atomic deduct + ledger entry + interaction log.
* **Apify enrichment:** 50 paisa/lead. Same atomic pattern.
* **Immutable ledger:** every deduction/top-up MUST create `credit_transactions` record with `status: "confirmed"`. Only `sendWhatsapp` uses the reserve→confirm/refund lifecycle.
* **`sendWhatsapp` uses 3-phase flow:** Phase 1 (Transaction: validate + reserve credits) → Phase 2 (External: messagingProvider.sendWhatsAppTemplate() call OUTSIDE transaction) → Phase 3a/3b (Batch write: confirm or refund). **NEVER put external HTTP calls inside a Firestore transaction.**
* **Messaging Provider Abstraction:** All outbound communication (WhatsApp, SMS, Email) goes through the IMessagingProvider interface. Cloud Functions NEVER call MSG91/Meta/Twilio APIs directly.

### A5. Multi-Tenancy & Security (Must Not Regress)

* Every document has `tenant_id` (except `system_config`, `system_config_public`).
* ALL callable functions validate `context.auth.token.tenant_id` matches target resource. **Never trust client-supplied tenant_id.**
* Firestore security rules — these are final, do not loosen:
    * `credit_transactions` write = **false** (server-only)
    * `system_logs` direct create = **false** (server-only via `logError` CF)
    * `users` write = **super_admin only** (tenant admin cannot write arbitrary user docs)
    * `invitations` create/update = **false** (CF-only: `sendInvite`, `assignTenantOnSignup`)
    * `brochure_vectors` write = **false** (CF-only: `indexBrochure`)
    * `message_queue` write = **false** (CF-only)
* **Leads field-level security:** Client can update ONLY: `status`, `next_follow_up_at`, `last_contacted_at`, `last_interaction_at`, `follow_up_owner`, `assigned_to`, `has_unread_message`, `has_pending_draft`, `is_archived`, `archived_at`, `archived_by`, `updated_at`, `updated_by`. All other fields (business_details, contact_details, ai_analysis, priority, enrichment_status, opt_in_status) are server-side only.

### A6. Deduplication (Must Be Deterministic)

* Google leads use deterministic ID: `SHA256(tenant_id + google_place_id)`. Firestore `create` fails if doc exists. Optional skip-write optimization allowed.

---

## PART B: ENGINEERING RULES (How to Write the Code)

### B1. File Size & Modularity

| Rule | Limit | Rationale |
|------|-------|-----------|
| **Max lines per React Component** | **250 lines** | Keeps UI manageable. If approaching, extract sub-components. |
| **Max lines per TypeScript hook/logic** | **400 lines** | Complex logic (like billing) can be denser. |
| **Max Cloud Functions per trigger file** | **4 functions** | Split `https.ts` into `https_leads.ts`, `https_billing.ts` etc. |
| **One exported function per service method** | — | `billingService.ts` exports `reserveCredits`, `confirmCredits` — not one giant class. |

**Splitting rules:**
* If a screen has >3 sections, extract each: `LeadBusinessCard.tsx`, `LeadContactCard.tsx`, `LeadTimeline.tsx`.
* If an API file has >8 methods, split by domain: `leadsApi.ts`, `leadsMutations.ts`.

### B2. Naming Conventions (Strictly Enforced)

**React (TypeScript):**
```
Components:   PascalCase.tsx            → LeadCard.tsx
Hooks:        camelCase.ts              → useLeads.ts
Utilities:    camelCase.ts              → formatDate.ts
Types:        PascalCase.ts             → Lead.ts
Functions:    camelCase                 → handleSubmit
Variables:    camelCase                 → creditsBalance
Constants:    SCREAMING_SNAKE_CASE      → MAX_LEADS_PER_PAGE
```

**Cloud Functions (TypeScript):**
```
Files:        camelCase.ts              → billingService.ts
Functions:    camelCase                 → handleRazorpayWebhook
Exports:      camelCase                 → exports.discoverLeads
Interfaces:   PascalCase + I prefix     → IDiscoverLeadsInput
```

**Firestore field names:** Always `snake_case`. Never camelCase in Firestore.

### B3. Feature Folder Structure (Mandatory)

Every feature in `apps/web/src/features/{feature}/` MUST have this structure:

```
features/leads/
├── api/
│   ├── leadsApi.ts                 # Firestore queries (getLeads, updateLead)
│   └── useLeads.ts                 # React Query hooks
├── components/
│   ├── LeadListScreen.tsx          # Main Page
│   ├── LeadCard.tsx                # Sub-component
│   └── LeadFilterDialog.tsx
├── hooks/
│   └── useLeadStats.ts             # Feature-specific logic
└── types/
    └── index.ts                    # Feature-specific types
```

**Hard rules:**
* `components/` files NEVER import `firebase/firestore` directly. They use hooks from `api/`.
* `api/` files handle all Firestore interactions.
* Cross-feature imports go through public API of that feature (e.g., `features/leads/index.ts`).

### B4. Cloud Functions Structure (Mandatory)

Follow `6_Project_Structure.md` §5 exactly. Includes: `config/`, `providers/`, `triggers/`, `services/`, `utils/`, `types/`.

**Hard rules:**
* Trigger files are THIN.
* All outbound messaging goes through `getMessagingProvider()`.
* Services contain ALL business logic.
* Services accepts `db` or transaction ref for testability.

### B5. React Query & State Patterns (Mandatory)

**Use these patterns:**

```typescript
// ✅ CORRECT: Custom Hook wrapping React Query
export const useLeads = (filters: LeadFilters) => {
  const { tenant } = useTenant();
  return useQuery({
    queryKey: ['leads', tenant.id, filters],
    queryFn: () => fetchLeads(tenant.id, filters),
    enabled: !!tenant.id
  });
};

// ✅ CORRECT: Async State in UI
const { data: leads, isLoading, error } = useLeads(filters);

if (isLoading) return <Skeleton className="h-20" />;
if (error) return <ErrorState message={error.message} />;
if (!leads?.length) return <EmptyState />;

return <LeadList leads={leads} />;
```

**Forbidden patterns:**
```typescript
// ❌ NEVER: useEffect for data fetching
useEffect(() => { fetchLeads().then(setLeads) }, []);

// ❌ NEVER: Direct Firestore in Component
const snapshot = await getDocs(collection(db, 'leads'));
```

### B6. Firestore API Pattern (Mandatory)

Instead of Repository classes, use functional API modules:

```typescript
// api/leadsApi.ts
const LEADS_COLLECTION = 'leads';

export const fetchLeads = async (tenantId: string): Promise<Lead[]> => {
  const q = query(
    collection(db, LEADS_COLLECTION),
    where('tenant_id', '==', tenantId),
    where('is_archived', '==', false),
    orderBy('created_at', 'desc'),
    limit(20)
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
};
```

**Hard rules:**
* EVERY query includes `where('tenant_id', '==', tenantId)`.
* EVERY list query includes `limit(n)`.
* Use `serverTimestamp()` for all timestamp writes.

### B7. Type Definitions (Mandatory)

UI sees clean TypeScript interfaces.

```typescript
// types/Lead.ts
export interface Lead {
  id: string;
  tenant_id: string;
  business_name: string;
  status: 'new' | 'contacted' | 'won';
  created_at: Timestamp;
}
```

### B8. Error Handling (Mandatory)

**Cloud Functions:**
```typescript
throw new HttpsError('failed-precondition', 'Insufficient credits.');
```

**React Client — use shared error mapper:**
```typescript
// In Mutation
onError: (error) => {
  const msg = mapErrorMessage(error);
  toast.error(msg);
}
```

### B9. Cloud Function Wrapper (Mandatory)

EVERY Cloud Function must be wrapped with `logErrors`.

### B10. Transaction & Batch Rules

* **Transaction:** Read-then-write atomicity.
* **Batch:** Multiple writes, no reads.
* **NEVER:** External HTTP calls inside transactions.

### B12. Audit Fields (Mandatory)

**On CREATE (React Client):**
```typescript
const payload = {
  ...data,
  created_at: serverTimestamp(),
  created_by: auth.currentUser?.uid,
  updated_at: serverTimestamp(),
  updated_by: auth.currentUser?.uid
};
```

**On UPDATE (React Client):**
```typescript
const update = {
  ...changes,
  updated_at: serverTimestamp(),
  updated_by: auth.currentUser?.uid
};
```

### B13. Soft Delete / Archive

No hard deletes. Use `is_archived: true`.

---

## PART C: BUILD SEQUENCE

### Phase 0: Scaffold
0.1 Firebase Setup (Dev)
0.2 React + Vite + Router Setup
0.3 Auth Flow (Clerk/Firebase)
0.4 Custom Claims
0.5 Route Guards
0.6 Shared Components (UI Library)

### Phase 1: Core Data
1.1 Lead Types & API
1.2 useLeads Hooks
1.3 Lead List & Detail Screens
1.4 Cloud Functions (Discover/Enrich)

[... Remaining Phases follow similar logic mapped to React components ...]

---

## PART D: ANTI-PATTERNS

### D1. Code Anti-Patterns
* God Components (>250 lines)
* Business logic in JSX
* Direct Firestore in components
* `any` types
* `useEffect` for data fetching (use React Query)
* Client-side sorting/filtering of large datasets (use Firestore queries)

### D2. Architecture Anti-Patterns
* [Same as before: No external calls in transactions, no trusting client tenant_id, etc.]
* Using Admin SDK in React App (Server only!)

### D3. AI Code Gen Specific Anti-Patterns
* Adding random npm packages
* Changing snake_case fields to camelCase in DB
* Hardcoding "Lorem Ipsum"

---

## PART F: COMPLETION CRITERIA

A module is "done" when:
1. All screens render correct states (Loading/Data/Empty/Error).
2. All Cloud Functions pass tests.
3. Security rules are intact.
4. `eslint` reports no errors.
5. `tsc` (TypeScript) compiles without errors.
