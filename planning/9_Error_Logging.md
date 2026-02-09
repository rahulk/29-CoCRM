
# Error Logging & AI Repair Strategy ("The Self-Healing Layer")

**Goal:** Catch every crash (Frontend & Backend), log the full context, and enable "One-Click AI Fixing."
**Storage:** `system_logs` collection in Firestore.

### File: `apps/web/src/lib/errorLogger.ts`

**Implementation Strategy:**

1. **Global Error Boundary:** Wrap the app in a React Error Boundary component (`src/components/feedback/ErrorBoundary.tsx`). This catches React rendering errors.
2. **Unhandled Rejections:** Add `window.addEventListener('unhandledrejection', handler)` in `main.tsx` to catch unhandled promise rejections.
3. **Window Errors:** Add `window.addEventListener('error', handler)` in `main.tsx` to catch uncaught exceptions.
4. **Network Queue:** If the app is offline when an error occurs, store the log in IndexedDB (via a simple wrapper or `idb-keyval` library) and upload when connectivity is restored via `navigator.onLine` events.
   - **Fallback if `logError` CF fails:** If the Cloud Function call itself throws (network down, CF quota exceeded), the log entry remains in the local IndexedDB queue. The app retries on next page load and on `online` events. After 5 failed attempts for a given log entry, discard it.

**Data to Capture:**
- **Error Stack:** The raw error stack trace.
- **Breadcrumbs:** The last 5 route paths visited (tracked via React Router `useLocation` in a global provider).
- **State Snapshot:** User ID, Tenant ID from auth context.
- **Device Info:** `navigator.userAgent`. For structured data: parse the user agent or use `navigator.userAgentData` (Chromium only).
- **App Version:** Read from `import.meta.env.VITE_APP_VERSION` (set at build time by Vite).

## 2. Backend Logger (TypeScript Cloud Functions)

**File:** `functions/src/utils/errorLogger.ts`

**Implementation Strategy:**

* Create a Higher-Order Function `logErrors` that wraps every single Cloud Function.
* **Logic:**
```typescript
import * as functions from 'firebase-functions';
import { db } from '../config/firebase'; // Firestore instance

export const logErrors = (handler: (data: any, context: functions.https.CallableContext) => Promise<any>) => {
    return async (data: any, context: functions.https.CallableContext) => {
        try {
            return await handler(data, context);
        } catch (error: any) {
            // 1. Capture Trace
            const stackTrace = error.stack || 'No stack trace';
            
            // 2. Log to Firestore 'system_logs'
            await db.collection('system_logs').add({
                source: "cloud_function",
                function_name: process.env.FUNCTION_NAME || 'unknown',
                error_message: error.message,
                stack_trace: stackTrace,
                timestamp: new Date(), // Converted to Firestore Timestamp automatically
                tenant_id: context.auth?.token?.tenant_id || 'unknown'
            });

            // 3. Return clean error to user
            throw new functions.https.HttpsError('internal', 'Internal Server Error');
        }
    };
};
```

### 2.1 Python Cloud Run Error Logging

**File:** `ai-service/middleware/error_handler.py`

**Strategy:** FastAPI exception handler middleware that catches all unhandled exceptions and logs to Cloud Logging (stdout in JSON format — Cloud Run automatically picks up structured logs from stdout).

```python
import logging
import traceback
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

class ErrorLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        try:
            return await call_next(request)
        except Exception as e:
            logger.error({
                "severity": "ERROR",
                "source": "ai_service",
                "endpoint": str(request.url.path),
                "error_message": str(e),
                "stack_trace": traceback.format_exc(),
                "tenant_id": request.headers.get("x-tenant-id", "unknown")
            })
            raise
```

**Integration with system_logs:** For critical AI failures, the calling Node/TS Cloud Function writes to `system_logs` collection (since the Python service does not write to Firestore directly).



## 3. Super Admin "AI-Fix" Workflow

**UI Location:** Admin Portal -> System Health -> Error Logs.

**Feature: "Analyze with AI" Button**
When you click this button on a specific log entry, the system generates a prompt for you to copy-paste into Antigravity/Cursor.

**Prompt Template:**

> "I am debugging a crash in the **{source}** module.
> **Context:**
> The user was on route **{last_route}** using **{browser}** on **{os}**.
> **The Error:**
> `{error_message}`
> **The Stack Trace:**
> ```
> {stack_trace}
> 
> ```
> 
> 
> **Task:**
> 1. Analyze the stack trace to find the exact file and line number.
> 2. Explain why this happened (e.g., null pointer, type mismatch).
> 3. Write the corrected code snippet to fix it defensively."
> 
> 

## 4. Security & Privacy

* **PII Stripping:** The Logger Service MUST strip out `password`, `auth_token`, and `credit_card` fields from any payload before logging. On the frontend, use the `piiStripper` utility before calling `logError`. On the Python service, structured logging via Cloud Logging handles this — ensure no PII is included in log fields.

## 5. Alerting (Phase 2)

**Recommendation:** For MVP, Super Admin manually checks logs. For Phase 2, add:
- **Cloud Function trigger:** `onWrite` on `system_logs` where `severity == "critical"`. Send email notification to Super Admin via `messagingProvider.sendEmail()` (MSG91 in MVP; see `20_Communication_Provider_Abstraction.md`).
- **Alternative:** Use Google Cloud Monitoring + Alerting on Cloud Function error rates. No custom code needed.

---

**End of File**