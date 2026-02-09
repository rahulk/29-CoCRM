# Tech Stack & Dependencies

> **Note:** All dependencies and tools listed below MUST use their **latest stable version** unless a specific version is pinned. Always prefer the most recent supported release to minimize technical debt.

**Frontend Framework:** React 18+ (Latest Stable) with TypeScript
**Build Tool:** Vite 5+ (Latest Stable)
**State Management:** React Query v5+ (Latest Stable) + Zustand
**Backend CRUD:** Firebase Cloud Functions (Node 20 LTS, TypeScript)
**Backend AI:** Python Cloud Run (FastAPI, Python 3.11+)
**Database:** Firestore
**Hosting:** Firebase Hosting (SPA + PWA)
**Styling:** Tailwind CSS + shadcn/ui (Latest Stable)

## 1. Frontend Dependencies (`apps/web/package.json`)

### A. Firebase & Core
- `firebase` — Firebase JS SDK (Auth, Firestore, Functions, Storage, Messaging, App Check)
  - Note: Single SDK covers Auth, Firestore, Functions, Storage, Messaging, and App Check.
  - App Check uses `ReCaptchaEnterpriseProvider` for web.

### B. Routing & State
- `react-router-dom` — Client-side routing
- `@tanstack/react-query` — Server state management
- `zustand` — Lightweight client state

### C. UI & Styling
- `tailwindcss` + `postcss` + `autoprefixer` — Utility-first CSS
- `@radix-ui/*` — Headless accessible primitives (via shadcn/ui)
- `lucide-react` — Icon library
- `class-variance-authority` + `clsx` + `tailwind-merge` — shadcn/ui utilities
- `sonner` — Toast notifications
- `date-fns` — Date formatting

### D. Billing
- Razorpay Web Checkout JS (loaded via `<script>` tag, NOT an npm package)
  - Razorpay provides `checkout.js` which is loaded in `index.html`.
  - TypeScript types: `@types/razorpay` or custom declaration file.

### E. PWA
- `vite-plugin-pwa` — Service worker generation + PWA manifest
- `workbox-precaching` + `workbox-routing` — Runtime caching strategies

### F. Utilities
- `papaparse` — CSV generation for exports
- `uuid` — Unique ID generation
- `zod` — Runtime validation for forms and API responses
- `semver` — Semantic version comparison (for force update logic)

### G. Dev Dependencies
- `typescript` — TypeScript compiler
- `@types/react`, `@types/react-dom` — React type definitions
- `vite` — Build tool
- `eslint` + `@typescript-eslint/*` — Linting
- `prettier` + `prettier-plugin-tailwindcss` — Formatting
- `vitest` — Unit testing
- `@testing-library/react` — Component testing
- `playwright` — E2E testing
- `msw` (Mock Service Worker) — API mocking in tests

## 2. Cloud Functions Dependencies (`functions/package.json`)

**No change from current spec:**
- `firebase-admin` — Firestore/Auth access
- `firebase-functions` — Core framework
- `@google-cloud/secret-manager` — Secret access
- `google-auth-library` — For calling Python Cloud Run with ID tokens
- `axios` or native `fetch` — For REST calls to Apify, MSG91, and Python Cloud Run service

**New addition:**
- `google-auth-library` — Generate ID tokens for authenticated Cloud Run calls from Cloud Functions.

**Messaging Provider Note:** (Same as before — MSG91 uses REST, no SDK.)

## 3. Python AI Service Dependencies (`ai-service/requirements.txt`)

```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
google-cloud-aiplatform>=1.38.0
pydantic>=2.5.0
python-dotenv>=1.0.0
gunicorn>=21.2.0
```

**Dev dependencies (`requirements-dev.txt`):**
```
pytest>=7.4.0
pytest-asyncio>=0.23.0
httpx>=0.25.0          # For testing FastAPI endpoints
```

## 4. Configuration Notes

### Frontend (React PWA)
- **Node version:** 20 LTS or higher.
- **TypeScript:** Strict mode enabled (`"strict": true` in tsconfig.json).
- **Vite:** Target `esnext`, output directory `dist/`.
- **Browser support:** Chrome 90+, Safari 16.4+ (for PWA push on iOS), Firefox 90+, Edge 90+.

### Cloud Functions
- **Node version:** 20 (set in `functions/package.json` → `engines.node`).
- **Region:** `asia-south1` (Mumbai) for Indian users.

### Python Cloud Run
- **Python version:** 3.11+.
- **Container:** Dockerfile based on `python:3.11-slim`.
- **Region:** Same as Cloud Functions (`asia-south1`).
- **Memory:** 1GB minimum (Vertex AI client needs headroom).
- **Concurrency:** 80 (FastAPI handles concurrent requests well).
- **Min instances:** 1 (avoid cold starts for AI scoring).