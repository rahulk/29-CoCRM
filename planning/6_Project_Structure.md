# React PWA Project Structure & Architecture Guidelines

**Architecture Pattern:** Feature-First (Layered within features).
**State Management:** React Query (server state) + Zustand (client state).
**Routing:** React Router v6.
**Build Tool:** Vite.
**Styling:** Tailwind CSS + shadcn/ui components.
**Language:** TypeScript (strict mode).

## 1. Monorepo Structure

```text
cocrm/
├── apps/
│   └── web/                          # React PWA (Vite)
│       ├── public/
│       │   ├── manifest.json         # PWA manifest
│       │   ├── sw.js                 # Service Worker (Workbox)
│       │   ├── favicon.ico
│       │   └── icons/                # PWA icons (192, 512)
│       ├── src/
│       │   ├── main.tsx              # Entry point (React root + providers)
│       │   ├── App.tsx               # Root component (Router + Layout)
│       │   ├── routes/               # React Router configuration
│       │   │   ├── index.tsx         # Route definitions
│       │   │   └── guards/           # Auth guards, role guards
│       │   ├── config/               # Environment config, Firebase init
│       │   ├── constants/            # Colors, typography, spacing tokens
│       │   ├── lib/                  # Shared utilities
│       │   │   ├── firebase.ts       # Firebase app + Firestore + Auth init
│       │   │   ├── api.ts            # Cloud Function callable wrappers
│       │   │   ├── errorMapper.ts    # CF error code → user message
│       │   │   ├── dateUtils.ts      # Date formatting (date-fns)
│       │   │   ├── currencyUtils.ts  # Paisa → Rupee formatting
│       │   │   └── csvExporter.ts    # CSV export utility
│       │   ├── hooks/                # Shared React hooks
│       │   │   ├── useAuth.ts        # Auth state hook
│       │   │   ├── useTenant.ts      # Tenant data hook
│       │   │   └── useFirestoreQuery.ts # Generic Firestore + React Query bridge
│       │   ├── components/           # Shared UI components
│       │   │   ├── ui/               # shadcn/ui primitives (Button, Input, Dialog, etc.)
│       │   │   ├── layout/           # Shell, BottomNav, AppBar, Sidebar
│       │   │   ├── feedback/         # SnackBar, ErrorBoundary, LoadingSkeleton
│       │   │   └── banners/          # CreditsBanner, TrialBanner, ImpersonationBanner
│       │   ├── stores/               # Zustand stores (client-only state)
│       │   │   └── uiStore.ts        # Sidebar open, active tab, etc.
│       │   └── features/             # <--- CORE LOGIC
│       │       ├── auth/             # Login, Signup, ForceUpdate, AccountBlocked, Profile
│       │       │   ├── api/          # Auth-related API calls
│       │       │   ├── hooks/        # useLogin, useLogout, etc.
│       │       │   ├── components/   # LoginForm, GoogleSignInButton
│       │       │   └── pages/        # LoginPage, ProfilePage
│       │       ├── onboarding/       # 4-step onboarding flow
│       │       ├── leads/            # Lead List, Lead Detail, Search
│       │       ├── communication/    # Inbox, Conversation, AI Draft
│       │       ├── tasks/            # Task list (follow-ups)
│       │       ├── billing/          # Billing, TopUp (Razorpay Web Checkout)
│       │       ├── settings/         # Settings, Team, WhatsApp, Products, Brochures
│       │       └── admin/            # Super Admin Portal
│       ├── index.html
│       ├── vite.config.ts
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── .env.development           # Dev Firebase config
│       ├── .env.production             # Prod Firebase config
│       └── package.json
│
├── functions/                         # Node/TS Cloud Functions (CRUD + orchestration)
│   ├── src/                           # (Same structure as before — see §5 below)
│   │   ├── config/
│   │   ├── providers/
│   │   │   └── messaging/
│   │   ├── triggers/
│   │   ├── services/
│   │   ├── utils/
│   │   └── types/
│   ├── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── ai-service/                        # Python Cloud Run (AI workloads)
│   ├── main.py                        # FastAPI app entry point
│   ├── routers/
│   │   ├── scoring.py                 # POST /score-lead
│   │   ├── reply.py                   # POST /ai-reply
│   │   ├── embedding.py               # POST /embed-text
│   │   └── health.py                  # GET /health
│   ├── services/
│   │   ├── vertex_ai.py               # Vertex AI client wrapper
│   │   ├── safety.py                  # Content safety checker
│   │   └── prompt_builder.py          # System prompt assembly
│   ├── models/                        # Pydantic request/response models
│   │   ├── scoring.py
│   │   ├── reply.py
│   │   └── embedding.py
│   ├── config.py                      # Environment config
│   ├── Dockerfile                     # Cloud Run container
│   ├── requirements.txt               # Python dependencies
│   └── tests/
│       ├── test_scoring.py
│       └── test_reply.py
│
├── firestore.rules                    # Firestore Security Rules
├── firestore.indexes.json             # Composite indexes
├── storage.rules                      # Cloud Storage rules
├── firebase.json                      # Firebase Hosting + Functions config
├── .firebaserc                        # Project aliases (dev/prod)
└── README.md
```

## 2. Feature Internal Structure (React)

Every folder inside `features/` follows this pattern:

### A. `api/` (Data Layer)
- Cloud Function callable wrappers
- Firestore query definitions (for React Query)
- Type definitions for request/response

### B. `hooks/` (Logic Layer)
- React Query hooks for server state (`useLeads`, `useLeadDetail`)
- Mutation hooks (`useCreateLead`, `useUpdateLeadStatus`)
- Business logic hooks

### C. `components/` (UI Components)
- Reusable feature-specific components (LeadCard, ConversationBubble)
- NO direct Firestore access — always via hooks

### D. `pages/` (Route Pages)
- Top-level page components mapped to routes
- Compose components + hooks
- Handle loading/error/empty states

## 3. Strict Coding Rules

1. **No direct Firestore in components:** Always access via React Query hooks or API wrappers.
   - Bad: `getDocs(collection(db, 'leads'))` inside a component
   - Good: `const { data } = useLeads(tenantId)`

2. **TypeScript interfaces for all Firestore models:** Define in `features/{feature}/api/types.ts`. No `any` types.

3. **Server state vs Client state:**
   - Firestore data → React Query (caching, refetching, optimistic updates)
   - UI-only state (sidebar open, modal visible) → Zustand or useState

4. **Audit Fields:** Every Firestore write (create or update) from the client MUST include audit fields. Use a shared `withAuditFields()` utility.

5. **Soft Delete:** Never hard-delete documents. Use `is_archived` pattern.

6. **Environment Variables:** All Firebase config, API keys via Vite's `import.meta.env.VITE_*` pattern. Never hardcode.

## 4. Cloud Functions Structure (`functions/`)

**No change from current architecture.** The `functions/` directory keeps the same modular structure:
(Reproduce the existing functions/ tree from the original doc — triggers/, services/, providers/, utils/, types/)

The only addition is a utility for calling the Python Cloud Run service:
- `functions/src/utils/aiServiceClient.ts` — Authenticated HTTP client for calling the `ai-service` Cloud Run endpoints.

## 5. Python AI Service Structure (`ai-service/`)

See the tree above. Key design principles:
- **FastAPI** for HTTP routing (lightweight, async-native, Pydantic validation)
- **Vertex AI Python SDK** (`google-cloud-aiplatform`) for Gemini calls
- **Pydantic models** for request/response validation
- **No Firestore writes** — the Python service is stateless. It receives data, processes with AI, and returns results. The calling Node/TS CF handles all Firestore operations.
- **Authentication:** Accepts requests only from GCP internal services (Cloud Functions). Enforced via Cloud Run IAM (`roles/run.invoker`).

## 6. PWA & Offline Strategy

- **Mechanism:** Vite PWA plugin (vite-plugin-pwa) + Workbox for service worker generation.
- **Caching Strategy:**
  - App shell (HTML, JS, CSS): Precached on install.
  - API responses: Runtime caching with stale-while-revalidate for Firestore reads.
  - Firestore JS SDK persistence: `enableIndexedDbPersistence()` for offline read support.
- **Behavior:**
  - Reads: Cached Firestore data shown instantly (IndexedDB).
  - Writes: Queued by Firestore SDK and synced when online.
- **Limitations:** Cloud Function callables (discoverLeads, sendWhatsapp) require connectivity. Show clear offline indicators.
- **Install Prompt:** Detect `beforeinstallprompt` event and show custom install banner.
