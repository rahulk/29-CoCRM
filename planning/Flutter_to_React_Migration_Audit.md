# Flutter → React PWA Migration: Complete Technical Debt Audit

**Project:** CoCRM — AI Personal Sales Assistant
**Audit Date:** February 2026
**Documents Reviewed:** 25 (Files 0–24)
**Overall Migration Score:** ~90% Complete

---

## Executive Summary

The project specification has been **largely migrated** from Flutter/Dart to React + TypeScript + Vite PWA. However, residual Flutter/Dart/mobile-native artifacts remain across **6 files** (out of 25). The most significant concentration is in **File 21 (Standard SaaS Features)**, which contains Dart code examples, Flutter widget names, Dart package references, and Flutter folder conventions. Additionally, Files 2, 3, and 9 contain mobile-native device references and terminology that are inconsistent with a web-first PWA.

**19 files are fully clean** with zero issues detected.

---

## Findings Summary

| File | Severity | Issue Count | Category |
|------|----------|-------------|----------|
| **21 — Standard SaaS Features** | 🔴 CRITICAL | 15 issues | Dart code, Flutter widgets, Dart packages, Flutter folder paths, `.dart` extensions, Flutter terminology |
| **3 — API Workflows** | 🟠 MEDIUM | 6 issues | `mobile_app` source, Dart error message, Android device info, App Store reference |
| **2 — Data Schema** | 🟠 MEDIUM | 3 issues | `mobile_app` source enum, `device_model` fields |
| **9 — Error Logging** | 🟡 LOW | 2 issues | Extra closing brace, `device_model` in template |
| **0 — Handoff Guardrails** | 🟡 LOW | 1 issue | "Widgets" terminology |
| **24 — Screen Map & Component Registry** | 🟡 LOW | 1 issue | "Widgets" section headings |
| Files 1, 4–8, 10–20, 22–23 | ✅ CLEAN | 0 issues | Fully migrated |

**Total Issues: 28**

---

## Detailed Fix Prompts

Each prompt below is self-contained and can be run independently against the specified file.

---

## PROMPT 1 — File 21: Replace Dart Class with TypeScript Interface

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 137–150
**Severity:** 🔴 CRITICAL

**Problem:** Section 1.5 "DTO/Domain Impact" contains a Dart `class` definition with Dart types (`DateTime`, `final` keyword). This is Flutter/Dart syntax, not React/TypeScript.

**FIND (exact text to locate):**

```
### 1.5 DTO/Domain Impact

All DTOs must include audit fields. Domain models should expose them as read-only:

```dart
// domain/lead.dart
class Lead {
  // ... existing fields
  final DateTime createdAt;
  final String createdBy;
  final DateTime? updatedAt;
  final String? updatedBy;
}
```
```

**REPLACE WITH:**

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
```

**Rationale:** React/TypeScript uses `interface` for type definitions, `Timestamp` from Firebase SDK (not Dart `DateTime`), and snake_case field names matching Firestore conventions already established in the project.

---

## PROMPT 2 — File 21: Replace Flutter Widget Name `CircularProgressIndicator`

**File:** `21_Standard_SaaS_Features.md`
**Line:** 187
**Severity:** 🔴 CRITICAL

**Problem:** `CircularProgressIndicator` is a Flutter widget class. The project uses shadcn/ui components.

**FIND:**

```
| Loading | Button shows `CircularProgressIndicator`, input disabled |
```

**REPLACE WITH:**

```
| Loading | Button shows loading spinner (shadcn `Loader2` icon, animated), input disabled |
```

**Rationale:** shadcn/ui uses the Lucide `Loader2` icon with CSS `animate-spin` for loading states. This is the standard pattern across the project (per File 17 UI Design Standards).

---

## PROMPT 3 — File 21: Replace `SnackBar` with `Toast` (3 occurrences)

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 188–190
**Severity:** 🟠 MEDIUM

**Problem:** "SnackBar" is Flutter/Material Design terminology. The project uses shadcn/ui which provides a `Toast` component (via sonner).

**FIND:**

```
| Success | Green SnackBar: "Password reset email sent! Check your inbox." + auto-switch back to Sign In form |
| Error (no account) | SnackBar: "No account found with this email." |
| Error (too many requests) | SnackBar: "Too many requests. Please try again later." |
```

**REPLACE WITH:**

```
| Success | Success toast: "Password reset email sent! Check your inbox." + auto-switch back to Sign In form |
| Error (no account) | Error toast: "No account found with this email." |
| Error (too many requests) | Error toast: "Too many requests. Please try again later." |
```

---

## PROMPT 4 — File 21: Replace Flutter `SingleChildScrollView`

**File:** `21_Standard_SaaS_Features.md`
**Line:** 229
**Severity:** 🔴 CRITICAL

**Problem:** `SingleChildScrollView` is a Flutter widget class. In React, scrollable containers are standard HTML/CSS.

**FIND:**

```
**Layout (SingleChildScrollView):**
```

**REPLACE WITH:**

```
**Layout (scrollable container — `div` with `overflow-y-auto`):**
```

---

## PROMPT 5 — File 21: Replace All "Widget" Terminology with "Component" (5 occurrences)

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 338, 469, 748, 844, 997
**Severity:** 🟠 MEDIUM

**Problem:** "Widget" is Flutter's core UI building block term. React uses "Component."

**Change 1 — Line 338:**

FIND: `**Widget:** `ListSearchBar` — a reusable widget used across multiple screens.`
REPLACE: `**Component:** `<ListSearchBar />` — a reusable component used across multiple screens.`

**Change 2 — Line 469:**

FIND: `**Widget:** `DashboardSummaryCard` — a collapsible card shown at the top of LeadListScreen.`
REPLACE: `**Component:** `<DashboardSummaryCard />` — a collapsible card shown at the top of LeadListScreen.`

**Change 3 — Line 748:**

FIND: `**Widget:** `PermissionEditor` — a list of toggle switches grouped by module.`
REPLACE: `**Component:** `<PermissionEditor />` — a list of toggle switches grouped by module.`

**Change 4 — Line 844:**

FIND: `**Widget:** `NotificationBell` — icon with unread count badge.`
REPLACE: `**Component:** `<NotificationBell />` — icon with unread count badge.`

**Change 5 — Line 997:**

FIND: `**Implementation:** The `DashboardSummaryCard` widget reads these preferences and only renders visible cards.`
REPLACE: `**Implementation:** The `<DashboardSummaryCard />` component reads these preferences and only renders visible cards.`

---

## PROMPT 6 — File 21: Replace Flutter `presentation/` Folder Convention (2 occurrences)

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 307, 515
**Severity:** 🔴 CRITICAL

**Problem:** `presentation/` is Flutter's clean architecture folder convention. The project's React structure (File 6) uses `components/` and `pages/`.

**Change 1 — Line 307:**

FIND: `| **Doc 6 (Project Structure)** | ProfileScreen goes in `features/authentication/presentation/` or `features/settings/presentation/` |`
REPLACE: `| **Doc 6 (Project Structure)** | ProfilePage goes in `features/auth/pages/` or `features/settings/pages/` |`

**Change 2 — Line 515:**

FIND: `| **Doc 6 (Project Structure)** | Add to `features/shared/presentation/` (reusable) |`
REPLACE: `| **Doc 6 (Project Structure)** | Add to `components/common/` (reusable shared component) |`

---

## PROMPT 7 — File 21: Replace Dart Package References

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 387–389
**Severity:** 🔴 CRITICAL

**Problem:** References Dart/pub.dev packages (`csv` Dart package, `excel` Dart package). The React project should use npm packages.

**FIND:**

```
**Client-side generation** (no CF needed for MVP):
* Use the `csv` Dart package for CSV export.
* Use the `excel` Dart package for XLSX export (Phase 2).
* Generate file locally → trigger download (web) or share sheet (mobile).
```

**REPLACE WITH:**

```
**Client-side generation** (no CF needed for MVP):
* Use the `papaparse` npm package for CSV export.
* Use the `xlsx` (SheetJS) npm package for XLSX export (Phase 2).
* Generate file locally → trigger browser download via `Blob` + `URL.createObjectURL()`.
```

**Rationale:** `papaparse` and `xlsx` are the standard JavaScript equivalents. The "share sheet (mobile)" reference is replaced with the web-standard download pattern.

---

## PROMPT 8 — File 21: Replace Dart File Extensions in Cross-References (2 occurrences)

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 447, 1085
**Severity:** 🔴 CRITICAL

**Problem:** File paths reference `.dart` extension. All React project files are `.ts` or `.tsx`.

**Change 1 — Line 447:**

FIND: `| **Doc 6 (Project Structure)** | Add `utils/csv_exporter.dart` |`
REPLACE: `| **Doc 6 (Project Structure)** | Add `utils/csvExporter.ts` |`

**Change 2 — Line 1085:**

FIND: `| **Doc 6 (Project Structure)** | Add `utils/csv_exporter.dart`; note ProfileScreen location |`
REPLACE: `| **Doc 6 (Project Structure)** | Add `utils/csvExporter.ts`; note ProfilePage location |`

---

## PROMPT 9 — File 21: Replace Dart Dependencies in Summary Table

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 1066–1071
**Severity:** 🔴 CRITICAL

**Problem:** Summary table lists Dart packages with "(Dart)" annotation.

**FIND:**

```
## Summary: New Dependencies Added

| Package | Purpose | Phase |
|---------|---------|-------|
| `csv` (Dart) | CSV export | Phase 1 |
| `excel` (Dart) | XLSX export (Phase 2) | Phase 2 |
```

**REPLACE WITH:**

```
## Summary: New Dependencies Added

| Package (npm) | Purpose | Phase |
|---------------|---------|-------|
| `papaparse` | CSV export | Phase 1 |
| `xlsx` (SheetJS) | XLSX export (Phase 2) | Phase 2 |
```

---

## PROMPT 10 — File 21: Replace "Mobile" Share Sheet Reference

**File:** `21_Standard_SaaS_Features.md`
**Lines:** 407–408
**Severity:** 🟠 MEDIUM

**Problem:** Export behavior section includes a separate "Mobile" line referencing native share sheet. This is a PWA — behavior should be web-centric.

**FIND:**

```
4. **Web:** Triggers browser download.
5. **Mobile:** Opens system share sheet.
```

**REPLACE WITH:**

```
4. **Browser:** Triggers file download via `Blob` + anchor tag click.
5. **PWA (installed):** Same browser download behavior. On mobile devices, the OS download manager handles the file.
```

---

## PROMPT 11 — File 3: Replace `mobile_app` Source and Dart Error Message in logError Example

**File:** `3_API_Workflows.md`
**Lines:** 678–693
**Severity:** 🟠 MEDIUM

**Problem:** The `logError` example payload contains:
1. `"source": "mobile_app"` — no mobile app exists
2. `"error_message": "Null check operator used on a null value"` — this is a Dart-specific error message (Dart's null safety operator `!`)
3. `"os": "Android 14"` and `"device_model": "Samsung S23"` — native Android device info, not web/PWA

**FIND:**

```json
{
  "source": "mobile_app",
  "severity": "critical",
  "error_message": "Null check operator used on a null value",
  "stack_trace": "...",
  "device_info": {
    "os": "Android 14",
    "device_model": "Samsung S23",
    "app_version": "1.0.2"
  },
  "state_snapshot": {
    "last_route": "/leads/abc123",
    "memory_usage_mb": 245
  }
}
```

**REPLACE WITH:**

```json
{
  "source": "web_app",
  "severity": "critical",
  "error_message": "TypeError: Cannot read properties of null (reading 'tenant_id')",
  "stack_trace": "...",
  "device_info": {
    "browser": "Chrome 120",
    "os": "Windows 11",
    "app_version": "1.0.2"
  },
  "state_snapshot": {
    "last_route": "/leads/abc123",
    "viewport": "1920x1080"
  }
}
```

**Rationale:** The error message is changed to a standard JavaScript TypeError. `device_model` is replaced with `browser` (the meaningful identifier in web context). `memory_usage_mb` is replaced with `viewport` (more useful for web debugging).

---

## PROMPT 12 — File 3: Replace `mobile_app` in Source Validation

**File:** `3_API_Workflows.md`
**Line:** 698
**Severity:** 🟠 MEDIUM

**FIND:**

```
1. `source`: Required. Must be one of: "mobile_app", "web_dashboard".
```

**REPLACE WITH:**

```
1. `source`: Required. Must be one of: "web_app", "web_dashboard", "pwa".
```

---

## PROMPT 13 — File 3: Replace "App Store submission" Reference

**File:** `3_API_Workflows.md`
**Line:** 931
**Severity:** 🟠 MEDIUM

**Problem:** References "App Store submission" — irrelevant for a web/PWA product.

**FIND:**

```
**Status:** NOT IMPLEMENTED IN MVP. Required before App Store submission.
```

**REPLACE WITH:**

```
**Status:** NOT IMPLEMENTED IN MVP. Required before production launch (GDPR/privacy compliance).
```

**Rationale:** Account deletion is required for privacy compliance (GDPR, etc.), not App Store rules. The PWA has no App Store listing.

---

## PROMPT 14 — File 3: Replace Android Device Info in logLoginEvent Example

**File:** `3_API_Workflows.md`
**Line:** 965
**Severity:** 🟠 MEDIUM

**FIND:**

```
**Input:** `{ "event_type": "login_success", "auth_method": "google", "device_info": { "os": "android", "app_version": "1.0.0", "device_model": "Pixel 7" } }`.
```

**REPLACE WITH:**

```
**Input:** `{ "event_type": "login_success", "auth_method": "google", "device_info": { "browser": "Chrome 120", "os": "Windows 11", "app_version": "1.0.0" } }`.
```

---

## PROMPT 15 — File 2: Replace `mobile_app` in system_logs Source Enum

**File:** `2_Data_Schema.md`
**Line:** 251
**Severity:** 🟠 MEDIUM

**FIND:**

```
* `source` (String): "mobile_app", "cloud_function", "web_dashboard".
```

**REPLACE WITH:**

```
* `source` (String): "web_app", "cloud_function", "web_dashboard", "pwa".
```

---

## PROMPT 16 — File 2: Replace `device_model` with `browser` in system_logs

**File:** `2_Data_Schema.md`
**Lines:** 255–258
**Severity:** 🟠 MEDIUM

**Problem:** The `device_info` map inside `system_logs` uses `device_model` which is mobile-native terminology. For a web/PWA, the browser is the primary identifier.

**FIND:**

```
* `device_info` (Map):
* `os` (String).
* `device_model` (String).
* `app_version` (String).
```

**REPLACE WITH:**

```
* `device_info` (Map):
* `browser` (String): e.g., "Chrome 120", "Safari 17.2".
* `os` (String): e.g., "Windows 11", "macOS 14", "Android 14".
* `app_version` (String): PWA version from build metadata.
```

---

## PROMPT 17 — File 2: Replace `device_model` in login_history

**File:** `2_Data_Schema.md`
**Line:** 331
**Severity:** 🟠 MEDIUM

**FIND:**

```
    * `device_info` (Map): `{ os, browser, device_model, app_version }`.
```

**REPLACE WITH:**

```
    * `device_info` (Map): `{ browser, os, app_version }`.
```

**Rationale:** `device_model` is redundant for web — the browser and OS are the meaningful identifiers. The `browser` field is already listed, so just remove `device_model`.

---

## PROMPT 18 — File 9: Fix Extra Closing Brace (Syntax Error)

**File:** `9_Error_Logging.md`
**Lines:** 57–59
**Severity:** 🟡 LOW

**Problem:** There is an extra closing brace `};` creating invalid JavaScript/TypeScript.

**FIND:**

```
    };
};
};
```

**REPLACE WITH:**

```
    };
};
```

**Rationale:** The `wrapWithLogging` higher-order function only needs 2 closing braces (one for the inner function, one for the outer). The third is extraneous.

---

## PROMPT 19 — File 9: Update `device_model` in AI Debug Prompt Template

**File:** `9_Error_Logging.md`
**Line:** 107
**Severity:** 🟡 LOW

**Problem:** The AI debug prompt template references `{device_model}` which is mobile-oriented. For web, browser info is more useful.

**FIND:**

```
> The user was on route **{last_route}** using a **{device_model}**.
```

**REPLACE WITH:**

```
> The user was on route **{last_route}** using **{browser}** on **{os}**.
```

---

## PROMPT 20 — File 0: Replace "Widgets" Terminology in Build Sequence

**File:** `0_Antigravity_Handoff_Guardrails.md`
**Line:** 271
**Severity:** 🟡 LOW

**FIND:**

```
0.6 Shared Widgets (UI Lib)
```

**REPLACE WITH:**

```
0.6 Shared Components (UI Library)
```

**Rationale:** React uses "Components" — "Widgets" is Flutter's terminology for UI building blocks.

---

## PROMPT 21 — File 24: Replace "Widgets" Section Headings with "Components"

**File:** `24_Screen_Map_Component_Registry.md`
**Lines:** 119, 134
**Severity:** 🟡 LOW

**Change 1 — Line 119:**

FIND: `### 4.1 Common Widgets`
REPLACE: `### 4.1 Common Components`

**Change 2 — Line 134:**

FIND: `### 4.2 Feature-Specific Widgets`
REPLACE: `### 4.2 Feature-Specific Components`

---

## PROMPT 22 — File 21: Replace `device_model` in login_history Schema

**File:** `21_Standard_SaaS_Features.md`
**Line:** 612
**Severity:** 🟠 MEDIUM

**FIND:**

```
| `device_info` | Map | `{ os, browser, device_model, app_version }` |
```

**REPLACE WITH:**

```
| `device_info` | Map | `{ browser, os, app_version }` |
```

---

## PROMPT 23 — File 21: Replace Dependencies Cross-Reference in §5.5

**File:** `21_Standard_SaaS_Features.md`
**Line:** 445
**Severity:** 🟠 MEDIUM

**FIND:**

```
| **Doc 7 (Dependencies)** | Add `csv` package (and `excel` for Phase 2) |
```

**REPLACE WITH:**

```
| **Doc 7 (Dependencies)** | Add `papaparse` package (and `xlsx`/SheetJS for Phase 2) |
```

---

## Verification Checklist

After applying all prompts, run these verification searches across all 25 files:

| Search Term | Expected Matches | Notes |
|-------------|-----------------|-------|
| `flutter` (case-insensitive) | 0 | No Flutter references |
| `.dart` | 0 | No Dart file extensions |
| `class Lead {` or `final DateTime` | 0 | No Dart class syntax |
| `CircularProgressIndicator` | 0 | No Flutter widgets |
| `SingleChildScrollView` | 0 | No Flutter widgets |
| `presentation/` | 0 | No Flutter folder convention |
| `"mobile_app"` | 0 | No mobile app source values |
| `(Dart)` | 0 | No Dart package annotations |
| `csv` Dart` | 0 | No Dart package references |
| `App Store submission` | 0 | No App Store references |
| `Samsung` or `Pixel 7` | 0 | No Android device examples |
| `Null check operator` | 0 | No Dart error messages |
| `device_model` | ≤2 (in data schema as optional legacy field) | Review context if found |
| `Widget:` (with colon) | 0 | No Flutter widget labels |
| `SnackBar` | 0 (in File 21) | May still exist in Files 6, 10 as component name |

**Note on "AppBar", "SnackBar" in Files 6, 10, 16:** These terms appear as React component names in the project structure (`components/layout/AppBar`, `components/feedback/SnackBar`). While "Toast" is more aligned with shadcn/ui conventions, these are not Flutter remnants per se — they are the project's own component naming choices. Flagged here for awareness but not critical to rename unless the team prefers shadcn/ui naming consistency (use `Toaster`/`toast()` instead of `SnackBar`).

---

## File-Level Status After Fixes

| File | Status | Issues Found | Prompts |
|------|--------|-------------|---------|
| 0 — Handoff Guardrails | 🟡 1 minor fix | "Widgets" terminology | Prompt 20 |
| 1 — PRD | ✅ Clean | — | — |
| 2 — Data Schema | 🟠 3 fixes | `mobile_app`, `device_model` | Prompts 15, 16, 17 |
| 3 — API Workflows | 🟠 4 fixes | `mobile_app`, Dart error, Android info, App Store | Prompts 11–14 |
| 4 — System Prompts | ✅ Clean | — | — |
| 5 — Security Rules | ✅ Clean | — | — |
| 6 — Project Structure | ✅ Clean | — | — |
| 7 — Dependencies | ✅ Clean | — | — |
| 8 — Super Admin Workflows | ✅ Clean | — | — |
| 9 — Error Logging | 🟡 2 fixes | Extra brace, `device_model` | Prompts 18, 19 |
| 10 — Billing & Subscription | ✅ Clean | — | — |
| 11 — User Management | ✅ Clean | — | — |
| 12 — Operational Scope | ✅ Clean | — | — |
| 13 — Deployment Strategy | ✅ Clean | — | — |
| 14 — Self-Serve Onboarding | ✅ Clean | — | — |
| 15 — Testing Strategy | ✅ Clean | — | — |
| 16 — UI Screens | ✅ Clean | — | — |
| 17 — UI Design Standards | ✅ Clean | — | — |
| 18 — Environment & Secrets | ✅ Clean | — | — |
| 19 — WhatsApp Templates | ✅ Clean | — | — |
| 20 — Communication Provider | ✅ Clean | — | — |
| 21 — Standard SaaS Features | 🔴 15 fixes | Dart code, Flutter widgets, packages, paths | Prompts 1–10, 22, 23 |
| 22 — Landing Page | ✅ Clean | — | — |
| 23 — App Check | ✅ Clean | — | — |
| 24 — Screen Map & Registry | 🟡 1 minor fix | "Widgets" headings | Prompt 21 |

---

## Recommended Execution Order

### Phase 1 — Critical (Blocks Code Generation)
Apply in order — these are the fixes that would cause an AI code generator to produce Flutter/Dart code instead of React/TypeScript:

1. **Prompt 1** — Dart class → TypeScript interface
2. **Prompt 2** — CircularProgressIndicator → Loader2
3. **Prompt 4** — SingleChildScrollView → scrollable div
4. **Prompt 6** — `presentation/` → `components/` / `pages/`
5. **Prompt 7** — Dart packages → npm packages
6. **Prompt 8** — `.dart` extensions → `.ts`
7. **Prompt 9** — Dart dependency table → npm

### Phase 2 — Medium (Consistency & Correctness)
These won't produce wrong code but will confuse developers and create inconsistent data:

8. **Prompt 3** — SnackBar → Toast
9. **Prompt 5** — Widget → Component (5 occurrences)
10. **Prompt 10** — Mobile share sheet → browser download
11. **Prompt 11** — logError mobile example → web example
12. **Prompt 12** — source validation enum
13. **Prompt 13** — App Store → GDPR
14. **Prompt 14** — logLoginEvent Android → web
15. **Prompt 15** — Data Schema source enum
16. **Prompt 16** — system_logs device_info
17. **Prompt 17** — login_history device_info
18. **Prompt 22** — File 21 device_info table
19. **Prompt 23** — Dependencies cross-reference

### Phase 3 — Low Priority (Cosmetic)

20. **Prompt 18** — Extra closing brace
21. **Prompt 19** — Debug prompt template
22. **Prompt 20** — "Shared Widgets" → "Shared Components"
23. **Prompt 21** — File 24 section headings

---

## Notes

- **"AppBar" is intentionally not flagged.** While it originates from Material Design, it's widely used as a generic web UI term and appears as a named React component in the project's own structure (`components/layout/AppBar`).
- **"SnackBar" in Files 6 and 10** is used as a React component name. While shadcn/ui uses `toast()`, the project may have a custom `SnackBar` component. This is a naming preference, not a Flutter migration issue.
- **"bottom sheet" references** are acceptable — shadcn/ui has a `Sheet` component that serves the same purpose.
- **File 13 (Deployment Strategy)** explicitly says "Remove the entire Android/iOS deep linking sections" — this is a correct migration instruction, not a remnant.
- **File 1 (PRD)** mentions "limited compared to native apps" — this is a legitimate architectural comparison, not a migration artifact.
- **File 7 (Dependencies)** mentions "native `fetch`" — this refers to the JavaScript Fetch API, not mobile native.
