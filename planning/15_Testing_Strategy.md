# Testing Strategy & Quality Assurance

## Section 1 (Testing Pyramid)

| Level | Scope | Tools | Coverage Goal |
| :--- | :--- | :--- | :--- |
| **E2E** | Full User Journey (Onboarding, Billing) | Playwright | Critical Flows |
| **Integration** | Cloud Functions + Firestore Emulator | `firebase-functions-test` + `jest` | 80% of Backend |
| **Integration** | Python AI Service endpoints | `pytest` + `httpx` (TestClient) | 80% of AI Service |
| **Component** | React components in isolation | Vitest + React Testing Library | Key UI Components |
| **Unit** | Utility functions, hooks | Vitest | 100% of Utils |

## Section 2 (Backend Testing - Cloud Functions)

**Tools:** `firebase-functions-test`, `mocha` (or `jest`), `sinon`.
**Environment:** Firebase Local Emulator Suite.

### Test Categories:
1. **Unit Tests:** Test individual utility functions (e.g., `dateUtils`, `csvExporter`).
2. **Integration Tests (Online/Offline):**
   - **Callable Functions:** Test `discoverLeads`, `activateTrial`, `sendWhatsapp` using the Emulator.
   - **Triggers:** Test `onUpdate` triggers (e.g., `scoreLead`, `indexBrochure`) by writing to Emulator Firestore.
   - **Security Rules:** Validation of `firestore.rules` using `@firebase/rules-unit-testing`.

### Key Scenarios (Must Test):
- **Rate Limiting:** Verify 11th call throws `RESOURCE_EXHAUSTED`.
- **Billing:** Verify `sendWhatsapp` deducts credits atomically. Verify `activateTrial` grants credits.
- **Data Isolation:** Verify Tenant A cannot read Tenant B's docs (Security Rules).
- **Webhooks:** Verify `handleInboundMessage` handles duplicate message IDs (idempotency).

## Section 3 (Frontend Testing)

### A. Component Testing (Vitest + React Testing Library)
- Test components render correctly with mock data.
- Test loading/error/empty states.
- Test user interactions (clicks, form submissions) trigger correct mutations.
- Mock Firebase calls using `msw` (Mock Service Worker).

### B. Hook Testing
- Test React Query hooks return correct data shapes.
- Test mutation hooks call correct Cloud Functions.
- Use `@testing-library/react-hooks` or `renderHook` from RTL.

### C. E2E Testing (Playwright)
- Test critical user journeys: Onboarding → First Search → Trial Activation.
- Test billing flow: Top-up → Credits appear.
- Test lead management: Find → Enrich → Message → Reply.
- Test PWA install prompt appears.
- Test offline indicator shows when disconnected.
- Run against Firebase Emulator Suite.

## Section 4 (Python AI Service Testing)

### AI Service Testing (`ai-service/tests/`)
- **Unit tests:** Test prompt assembly, response parsing, safety check logic with mocked Vertex AI responses.
- **Integration tests:** Test actual Vertex AI calls with test project (budget-capped).
- **Contract tests:** Verify request/response schemas match what the Node/TS CF sends.
- **Tools:** `pytest`, `pytest-asyncio`, `httpx` (FastAPI TestClient).
