"Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable)."

# 27. Error Code Registry

**Purpose:** Single source of truth for every error a Cloud Function can throw. Maps gRPC status codes to user-facing messages, enabling the React `mapErrorMessage()` utility to provide consistent, localizable, SMB-friendly error feedback.

**Reference:** Doc 0 §B8 (Error Handling pattern), Doc 3 (API Workflows — per-function error tables).

---

## 1. Architecture

```
Cloud Function throws HttpsError(code, serverMessage)
        ↓
React mutation catches error
        ↓
mapErrorMessage(error) → user-facing toast string
        ↓
toast.error(userMessage)
```

The `mapErrorMessage` utility matches on `error.code` (gRPC code) + `error.message` (server message substring) to select the correct user-facing text.

---

## 2. gRPC Status Codes Used

| gRPC Code | Meaning in CoCRM | HTTP Equivalent |
|-----------|-------------------|-----------------|
| `UNAUTHENTICATED` | No Firebase Auth token or token expired | 401 |
| `PERMISSION_DENIED` | Valid auth but wrong role, wrong tenant, or account suspended | 403 |
| `FAILED_PRECONDITION` | Business rule violation (insufficient credits, trial expired, opted out, etc.) | 400 |
| `RESOURCE_EXHAUSTED` | Rate limit hit, quota exceeded, daily cap reached | 429 |
| `ALREADY_EXISTS` | Duplicate entity (pending invite, existing member) | 409 |
| `INVALID_ARGUMENT` | Bad input (validation failure, malformed payload) | 400 |
| `NOT_FOUND` | Entity doesn't exist (lead, tenant, invitation) | 404 |
| `UNAVAILABLE` | External service down (Google Places, Apify, MSG91, Razorpay, Vertex AI) | 503 |
| `INTERNAL` | Unexpected server error (catch-all in `logErrors` wrapper) | 500 |

---

## 3. Master Error Table

### 3.1 Global Errors (All Cloud Functions)

| Error ID | gRPC Code | Server Message | User-Facing Message | Thrown By |
|----------|-----------|----------------|---------------------|-----------|
| G-001 | `UNAUTHENTICATED` | "Authentication required." | "Please sign in to continue." | All CFs (App Check / Auth guard) |
| G-002 | `PERMISSION_DENIED` | "Account suspended." | "Your account has been suspended. Please contact support." | All CFs (subscription check) |
| G-003 | `FAILED_PRECONDITION` | "The function must be called from an App Check verified app." | "Something went wrong. Please refresh and try again." | All CFs (App Check) |
| G-004 | `INTERNAL` | (any uncaught error) | "Something went wrong. Please try again. If this continues, contact support." | `logErrors` wrapper |

### 3.2 discoverLeads (Doc 3 §1)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| DL-001 | `RESOURCE_EXHAUSTED` | "Monthly lead limit reached." | "You've reached your monthly lead limit ({used}/{limit}). Upgrade your plan for more." | `leads_fetched_this_month >= max_leads_per_month` |
| DL-002 | `RESOURCE_EXHAUSTED` | "Rate limit exceeded." | "Too many requests. Please wait a moment and try again." | >10 calls/min per tenant |
| DL-003 | `FAILED_PRECONDITION` | "Trial expired." | "Your free trial has ended. Subscribe to continue finding leads." | `trial_ends_at < now` |
| DL-004 | `FAILED_PRECONDITION` | "Preview search limit reached." | "You've used all 3 preview searches. Start your free trial to unlock more." | `preview_searches_used >= 3` for pending tenants |
| DL-005 | `PERMISSION_DENIED` | "Not authorized." | "You don't have permission to perform this action." | Wrong tenant or missing role |
| DL-006 | `UNAVAILABLE` | "Google Places API error." | "Lead search is temporarily unavailable. Please try again in a few minutes." | Google API failure |
| DL-007 | `INVALID_ARGUMENT` | "Invalid search parameters." | "Please check your search keyword and location." | Missing/invalid keyword, lat/lng |

### 3.3 activateTrial (Doc 3 §1.1)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| AT-001 | `FAILED_PRECONDITION` | "Trial already activated." | "Your trial is already active! Head to your leads to get started." | `subscription_status` already `trial` or `active` |
| AT-002 | `PERMISSION_DENIED` | "Account suspended." | "Your account has been suspended. Please contact support." | `subscription_status == "suspended"` |
| AT-003 | `PERMISSION_DENIED` | "Only admins can activate trial." | "Only the account admin can start the free trial." | Caller is not `tenant_admin` |

### 3.4 createTenant (Doc 3 §1.3)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| CT-001 | `ALREADY_EXISTS` | "User already has a tenant." | "You already have an organization. Go to your dashboard." | User already has `tenant_id` in claims |
| CT-002 | `INVALID_ARGUMENT` | "Company name is required." | "Please enter your company name." | Missing/empty `company_name` |
| CT-003 | `INVALID_ARGUMENT` | "City is required." | "Please enter your city." | Missing/empty `city` |
| CT-004 | `RESOURCE_EXHAUSTED` | "Too many signup attempts." | "Too many attempts. Please try again in a few minutes." | IP rate limit exceeded |

### 3.5 enrichLeads (Doc 3 §2)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| EL-001 | `FAILED_PRECONDITION` | "Insufficient credits." | "Not enough credits to enrich leads. Please top up. (Cost: ₹0.50/lead)" | `credits_balance < 50 * lead_count` |
| EL-002 | `FAILED_PRECONDITION` | "Trial expired." | "Your free trial has ended. Subscribe to continue." | `trial_ends_at < now` |
| EL-003 | `UNAVAILABLE` | "Enrichment service unavailable." | "Lead enrichment is temporarily unavailable. Your leads are saved — we'll retry automatically." | Apify API failure |
| EL-004 | `RESOURCE_EXHAUSTED` | "Monthly enrichment limit reached." | "You've reached your monthly enrichment limit. Upgrade for more." | Enrichment quota exceeded |

### 3.6 sendWhatsapp (Doc 3 §4)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| SW-001 | `FAILED_PRECONDITION` | "Insufficient credits. Please top up." | "Not enough credits to send this message. Please top up. (Cost: ₹{cost/100})" | `credits_balance < cost` |
| SW-002 | `FAILED_PRECONDITION` | "User has opted out." | "This contact has opted out of messages. You cannot send to them." | `opt_in_status == "opted_out"` |
| SW-003 | `FAILED_PRECONDITION` | "Trial expired." | "Your free trial has ended. Subscribe to continue messaging." | `trial_ends_at < now` |
| SW-004 | `FAILED_PRECONDITION` | "24-hour service window expired. Use a template message." | "It's been more than 24 hours since this contact replied. Please use a template message instead." | Freeform outside service window |
| SW-005 | `RESOURCE_EXHAUSTED` | "Daily send limit reached." | "You've hit today's message limit ({used}/{limit}). Limits reset at midnight." | `whatsapp_sent_today >= max_whatsapp_msgs_daily` |
| SW-006 | `RESOURCE_EXHAUSTED` | "Rate limit exceeded." | "Too many messages sent. Please wait a moment." | >50 calls/min per tenant |
| SW-007 | `PERMISSION_DENIED` | "Account suspended." | "Your account has been suspended. Messages cannot be sent." | `subscription_status == "suspended"` |
| SW-008 | `UNAVAILABLE` | "Messaging provider unavailable." | "WhatsApp sending is temporarily unavailable. Your message has been saved as a draft." | MSG91/provider API failure |

### 3.7 aiReply (Doc 3 §5)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| AR-001 | `UNAVAILABLE` | "AI service unavailable." | "AI drafting is temporarily unavailable. You can write a reply manually." | Python Cloud Run / Vertex AI down |
| AR-002 | `FAILED_PRECONDITION` | "Safety check failed." | "The AI draft was blocked by safety filters. Please write a reply manually." | Content safety violation |
| AR-003 | `NOT_FOUND` | "Lead not found." | "This lead could not be found. It may have been deleted." | Invalid lead_id |

### 3.8 createSubscriptionLink (Doc 3 §6.2)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| SL-001 | `FAILED_PRECONDITION` | "You are already on this plan." | "You're already subscribed to this plan!" | Current plan matches requested |
| SL-002 | `UNAVAILABLE` | "Payment service unavailable." | "Payment processing is temporarily unavailable. Please try again shortly." | Razorpay API failure |
| SL-003 | `PERMISSION_DENIED` | "Only admins can manage billing." | "Only the account admin can manage subscriptions." | Caller is not `tenant_admin` |

### 3.9 sendInvite (Doc 3 §10.1)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| SI-001 | `ALREADY_EXISTS` | "A pending invitation already exists for this email." | "An invitation was already sent to this email. Check their inbox or resend." | Pending invite exists |
| SI-002 | `ALREADY_EXISTS` | "This person is already a member of your team." | "This person is already on your team!" | Active user with same email |
| SI-003 | `INVALID_ARGUMENT` | "Invalid email format." | "Please enter a valid email address." | Malformed email |
| SI-004 | `INVALID_ARGUMENT` | "Invalid role." | "Please select a valid role." | Role not in allowed set |
| SI-005 | `PERMISSION_DENIED` | "Only admins can invite." | "Only the account admin can invite team members." | Caller is not `tenant_admin` |

### 3.10 assignTenantOnSignup (Doc 3 §10.3)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| AS-001 | `FAILED_PRECONDITION` | "Invitation expired." | "This invitation has expired. Ask your admin to send a new one." | `expires_at < now` |
| AS-002 | `FAILED_PRECONDITION` | "This invitation was sent to a different email address." | "This invitation was sent to a different email. Please sign in with the correct account." | Email mismatch |
| AS-003 | `FAILED_PRECONDITION` | "You already belong to another organization." | "You're already part of another organization. Contact support to switch." | Existing tenant_id conflict |

### 3.11 updateTenantProfile (Doc 3 §1.2)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| TP-001 | `INVALID_ARGUMENT` | "Company name too short." | "Company name must be at least 2 characters." | `company_name.length < 2` |
| TP-002 | `INVALID_ARGUMENT` | "No fields provided." | "Please update at least one field." | No fields in payload |
| TP-003 | `PERMISSION_DENIED` | "Only admins can update settings." | "Only the account admin can change organization settings." | Caller is not `tenant_admin` |

### 3.12 logError (Doc 3 §9)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| LE-001 | `RESOURCE_EXHAUSTED` | "Error logging rate limit exceeded." | (silent — do not show to user) | >10 calls/min per user |
| LE-002 | `INVALID_ARGUMENT` | "Invalid severity." | (silent — do not show to user) | Severity not in allowed set |

### 3.13 logLoginEvent (Doc 3 §14)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| LI-001 | `RESOURCE_EXHAUSTED` | "Login logging rate limit exceeded." | (silent — do not show to user) | >5 calls/min per user |

### 3.14 updateUserPermissions (Doc 3 §15)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| UP-001 | `FAILED_PRECONDITION` | "Cannot edit own permissions." | "You cannot change your own permissions." | Caller == target user |
| UP-002 | `FAILED_PRECONDITION` | "Cannot edit another admin's permissions." | "You cannot change another admin's permissions." | Target is `tenant_admin` |
| UP-003 | `INVALID_ARGUMENT` | "Invalid permission key." | "An invalid permission was specified." | Key not in allowed set |
| UP-004 | `PERMISSION_DENIED` | "Only admins can manage permissions." | "Only the account admin can change team permissions." | Caller is not `tenant_admin` |

### 3.15 removeUser (Doc 3 §10.4)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| RU-001 | `FAILED_PRECONDITION` | "Cannot remove yourself." | "You cannot remove yourself from the team." | Caller == target user |
| RU-002 | `NOT_FOUND` | "User not found or inactive." | "This team member could not be found." | Target doesn't exist or `is_active == false` |
| RU-003 | `PERMISSION_DENIED` | "Only admins can remove members." | "Only the account admin can remove team members." | Caller is not `tenant_admin` |

### 3.16 updateUserProfile (Doc 3 §13)

| Error ID | gRPC Code | Server Message | User-Facing Message | Condition |
|----------|-----------|----------------|---------------------|-----------|
| PR-001 | `INVALID_ARGUMENT` | "Name is required." | "Please enter your name." | Missing/empty `name` |
| PR-002 | `INVALID_ARGUMENT` | "Invalid phone format." | "Please enter a valid phone number." | Malformed phone |

### 3.17 Webhook Handlers (No User-Facing Errors)

`handleInboundMessage` (Doc 3 §4.1), `handleRazorpayWebhook` (Doc 3 §6.1), and `handleApifyWebhook` (Doc 3 §2) are server-to-server webhooks. They return HTTP 200 to the provider and log errors to `system_logs`. No user-facing error messages.

---

## 4. React Client Implementation

### 4.1 Error Mapper Utility

```typescript
// utils/errorMapper.ts

interface ErrorMapping {
  code: string;
  messageIncludes?: string;
  userMessage: string;
  silent?: boolean; // If true, don't show toast
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // --- sendWhatsapp ---
  { code: 'failed-precondition', messageIncludes: 'Insufficient credits', userMessage: 'Not enough credits. Please top up.' },
  { code: 'failed-precondition', messageIncludes: 'opted out', userMessage: 'This contact has opted out of messages.' },
  { code: 'failed-precondition', messageIncludes: 'Trial expired', userMessage: 'Your free trial has ended. Subscribe to continue.' },
  { code: 'failed-precondition', messageIncludes: '24-hour service window', userMessage: 'Use a template message — it\'s been over 24 hours since they replied.' },
  { code: 'resource-exhausted', messageIncludes: 'Daily send limit', userMessage: 'Daily message limit reached. Resets at midnight.' },
  { code: 'resource-exhausted', messageIncludes: 'Monthly lead limit', userMessage: 'Monthly lead limit reached. Upgrade for more.' },
  { code: 'resource-exhausted', messageIncludes: 'Rate limit', userMessage: 'Too many requests. Please wait a moment.' },

  // --- Invitations ---
  { code: 'already-exists', messageIncludes: 'pending invitation', userMessage: 'An invitation was already sent to this email.' },
  { code: 'already-exists', messageIncludes: 'already a member', userMessage: 'This person is already on your team!' },

  // --- Onboarding ---
  { code: 'already-exists', messageIncludes: 'already has a tenant', userMessage: 'You already have an organization.' },
  { code: 'failed-precondition', messageIncludes: 'Trial already activated', userMessage: 'Your trial is already active!' },
  { code: 'failed-precondition', messageIncludes: 'Preview search limit', userMessage: 'Preview limit reached. Start your free trial!' },
  { code: 'failed-precondition', messageIncludes: 'Invitation expired', userMessage: 'This invitation has expired. Ask your admin for a new one.' },
  { code: 'failed-precondition', messageIncludes: 'different email', userMessage: 'Sign in with the email this invitation was sent to.' },
  { code: 'failed-precondition', messageIncludes: 'another organization', userMessage: 'You\'re already in another organization. Contact support.' },

  // --- Permissions ---
  { code: 'failed-precondition', messageIncludes: 'Cannot edit own', userMessage: 'You cannot change your own permissions.' },
  { code: 'failed-precondition', messageIncludes: 'Cannot remove yourself', userMessage: 'You cannot remove yourself.' },

  // --- External services ---
  { code: 'unavailable', messageIncludes: 'Google Places', userMessage: 'Lead search is temporarily unavailable. Try again shortly.' },
  { code: 'unavailable', messageIncludes: 'Enrichment', userMessage: 'Enrichment is temporarily unavailable. We\'ll retry automatically.' },
  { code: 'unavailable', messageIncludes: 'Messaging', userMessage: 'WhatsApp is temporarily unavailable. Message saved as draft.' },
  { code: 'unavailable', messageIncludes: 'AI service', userMessage: 'AI drafting unavailable. Write your reply manually.' },
  { code: 'unavailable', messageIncludes: 'Payment', userMessage: 'Payments temporarily unavailable. Try again shortly.' },

  // --- Silent errors (logging) ---
  { code: 'resource-exhausted', messageIncludes: 'Error logging', userMessage: '', silent: true },
  { code: 'resource-exhausted', messageIncludes: 'Login logging', userMessage: '', silent: true },

  // --- Global fallbacks (ORDER MATTERS — these go last) ---
  { code: 'unauthenticated', userMessage: 'Please sign in to continue.' },
  { code: 'permission-denied', messageIncludes: 'suspended', userMessage: 'Your account has been suspended. Contact support.' },
  { code: 'permission-denied', userMessage: 'You don\'t have permission for this action.' },
  { code: 'invalid-argument', userMessage: 'Please check your input and try again.' },
  { code: 'not-found', userMessage: 'The requested item could not be found.' },
  { code: 'failed-precondition', userMessage: 'This action cannot be completed right now.' },
  { code: 'resource-exhausted', userMessage: 'Too many requests. Please wait a moment.' },
  { code: 'unavailable', userMessage: 'Service temporarily unavailable. Please try again.' },
];

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

export function mapErrorMessage(error: any): { message: string; silent: boolean } {
  const code = error?.code ?? '';    // e.g. "functions/failed-precondition" → extract after /
  const msg = error?.message ?? '';
  const normalizedCode = code.includes('/') ? code.split('/')[1] : code;

  for (const mapping of ERROR_MAPPINGS) {
    if (normalizedCode === mapping.code) {
      if (mapping.messageIncludes && !msg.includes(mapping.messageIncludes)) continue;
      return { message: mapping.userMessage, silent: mapping.silent ?? false };
    }
  }

  return { message: DEFAULT_MESSAGE, silent: false };
}
```

### 4.2 Usage in Mutations

```typescript
// In any React Query mutation
const sendMessage = useMutation({
  mutationFn: (data) => httpsCallable(functions, 'sendWhatsapp')(data),
  onError: (error) => {
    const { message, silent } = mapErrorMessage(error);
    if (!silent) toast.error(message);
  },
});
```

---

## 5. Error ID Numbering Convention

Format: `{PREFIX}-{NNN}`

| Prefix | Cloud Function | Doc Reference |
|--------|---------------|---------------|
| `G` | Global (all functions) | Doc 0 §B8 |
| `DL` | discoverLeads | Doc 3 §1 |
| `AT` | activateTrial | Doc 3 §1.1 |
| `CT` | createTenant | Doc 3 §1.3 |
| `TP` | updateTenantProfile | Doc 3 §1.2 |
| `EL` | enrichLeads | Doc 3 §2 |
| `SW` | sendWhatsapp | Doc 3 §4 |
| `AR` | aiReply | Doc 3 §5 |
| `SL` | createSubscriptionLink | Doc 3 §6.2 |
| `SI` | sendInvite | Doc 3 §10.1 |
| `AS` | assignTenantOnSignup | Doc 3 §10.3 |
| `RU` | removeUser | Doc 3 §10.4 |
| `PR` | updateUserProfile | Doc 3 §13 |
| `LE` | logError | Doc 3 §9 |
| `LI` | logLoginEvent | Doc 3 §14 |
| `UP` | updateUserPermissions | Doc 3 §15 |

---

**End of File**
