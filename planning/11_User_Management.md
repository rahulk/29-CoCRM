# User Management & Invitation Workflow

**Goal:** Securely onboard new Sales Reps and assigning them to a Tenant without manual database edits.
**Role:** Tenant Admin invites Sales Reps.

## 1. Invitation Workflow

### Step 1: Tenant Admin sends Invite
*   **UI:** Settings -> Team -> "Invite Member" button.
*   **Form:** Email Address, Role (Sales Rep / Admin). Display labels → schema values: "Sales Rep" → `sales_rep`, "Admin" → `tenant_admin`.
*   **Action:** Calls Cloud Function `sendInvite`.

### Step 2: Cloud Function (`sendInvite`)
*   **Input:** `{ "email": "john@doe.com", "role": "sales_rep" }`
*   **Logic:**
    1.  **Auth Check:** Verify caller is `tenant_admin`.
    1b. **Duplicate Check:** Query `invitations` where `email == input.email` AND `tenant_id == caller_tenant_id` AND `status == 'pending'` AND `expires_at > now`. If found, throw error: "A pending invitation already exists for this email."
    1c. **Existing Member Check:** Query `users` where `email == input.email` AND `tenant_id == caller_tenant_id` AND `is_active == true`. If found, throw error: "This person is already a member of your team."
    2.  **Generate Token:** Create a secure, time-limited invitation token (linked to `tenant_id`).
    3.  **Store Invite:** Save to `invitations` collection:
        *   `email`: "john@doe.com"
        *   `tenant_id`: "tenant_abc"
        *   `role`: "sales_rep"
        *   `token`: "xyz_secure_token"
        *   `expires_at`: Timestamp + 48 hours.
    4.  **Send Email:** Call `messagingProvider.sendEmail()` (see `20_Communication_Provider_Abstraction.md` §2). MSG91 handles email delivery in MVP; provider can be swapped without changing this logic. Send the "Join Team" link: `https://app.cocrm.com/join?token=xyz`

### Step 3: User Accepts Invite
*   **UI:** User clicks invite link → Landing Page (`/join?token=xyz`).
*   **Flow:**
    1. App reads the `token` query parameter from the URL.
    2. App calls a read-only Cloud Function `validateInvitation({ token })` to fetch invitation details (company name, role, email) without modifying anything.
    **Return schema:**
```json
    {
      "status": "valid" | "expired" | "used" | "not_found",
      "company_name": "string (if valid)",
      "role": "string (if valid)",
      "email": "string (if valid)"
    }
```
    The UI renders different states based on `status`:
    - `valid` → Show invitation details + action buttons.
    - `expired` → "This invitation has expired. Ask your admin to resend."
    - `used` → "This invitation has already been accepted."
    - `not_found` → "Invalid invitation link."
    3. If user is not authenticated: show Sign Up buttons (Google / Email).
    4. User authenticates (creates Firebase Auth account if new, or signs in if existing).
        *   **Edge case — existing user with no tenant:** If a user already has a Firebase Auth account but no `tenant_id` in claims (e.g., they previously signed up but never completed onboarding), they can still accept an invite. `assignTenantOnSignup` will set their claims and create the `users` doc.
        *   **Edge case — existing user with DIFFERENT tenant:** If the user already belongs to a different tenant, `assignTenantOnSignup` should throw `FAILED_PRECONDITION`: "You already belong to another organization. Please contact support to switch."
    5. User taps "Join Team" button → calls callable Cloud Function `assignTenantOnSignup`.

### Step 4: Cloud Function (`assignTenantOnSignup`)
*   **Trigger:** Callable (NOT an automatic Auth trigger). Called explicitly by the InviteAcceptScreen after user authenticates and taps "Join Team".
*   **Input Payload:** `{ "token": "xyz_secure_token" }`
*   **Logic:**
    1. Hash the provided token. Look up `invitations` collection for a doc where `token` matches AND `status == 'pending'`.
    2. **Verify:** Is the invitation valid? Check: `status == 'pending'`, `expires_at > now`, and `email` matches `context.auth.token.email`.
    3. **Set Claims:** Set Custom Auth Claims on the caller's ID Token:
        *   `tenant_id`: from invitation doc.
        *   `role`: from invitation doc.
    4. **Create User Doc:** Create document in `users/{auth_uid}` collection with:
        *   `tenant_id`: from invitation doc.
        *   `role`: from invitation doc.
        *   `name`: from auth profile.
        *   `email`: from auth profile.
        *   `is_active`: `true`.
        *   `auth_provider`: based on the sign-in method ('google' or 'email').
        *   `avatar_url`: from `context.auth.token.picture` if available (Google users).
        *   **Permissions:** Set default `permissions` map based on the role (see `21_Standard_SaaS_Features.md` §9.4):
            *   `tenant_admin`: all permissions = `true`.
            *   `sales_rep`: `communication_send` and `communication_ai_draft` = `true`, all others = `false`.
        *   **Audit Fields:** `created_at`, `created_by`, `updated_at`, `updated_by`.
    5. **Update Invite:** Set invitation doc `status` = "accepted".
    6. **Force Token Refresh:** Return `{ success: true, requires_token_refresh: true }`. Client must call `auth.currentUser.getIdToken(true)` to pick up the new claims before navigating to `/leads`.

## 2. Removing a User

### Step 1: Tenant Admin removes User
*   **UI:** Team List -> "Remove" button.
*   **Action:** Calls Cloud Function `removeUser`.

### Step 2: Cloud Function (`removeUser`)
*   **Logic:**
    1.  **Auth Check:** Verify caller is `tenant_admin` of the *same* tenant.
    2.  **Revoke Access:**
        *   Remove `tenant_id` claim from the user's Auth Token (force logout).
        *   Mark `users/{uid}` as `is_active: false`.
    3.  **Reassign Leads:** Query `leads` where `assigned_to == target_uid` AND `tenant_id == caller's tenant_id`. For each lead:
        *   Set `assigned_to`: `null`.
        *   Set `follow_up_owner`: `null`.
    4.  **Log Activity:** Create an `activity_logs` entry with `action: 'team_removed'`, `entity_type: 'user'`, `entity_id: target_uid`, `entity_name: target_user.name`.
    5.  **Return:** `{ success: true, leads_reassigned: count }`.

## 3. Data Model (`invitations` collection)

*   `id`: Auto-ID
*   `tenant_id`: String
*   `email`: String
*   `role`: String
*   `token`: String (Hashed)
*   `status`: "pending", "accepted"
*   `created_at`: Timestamp
*   `expires_at`: Timestamp

## 4. User Profile Management

Users can view and edit their own profile via the ProfileScreen (`/profile`). Editable fields: name, phone. Email and role are read-only. Email/password users can change their password. See `21_Standard_SaaS_Features.md` §3 for full spec. Profile updates go through the `updateUserProfile` Cloud Function (Doc 3 §13) since the `users` collection is write-locked in security rules.

## 5. Module-Level Permissions

Each user has a `permissions` map that controls access to specific features (e.g., lead export, lead search, billing view). Defaults are set by role on user creation. Tenant admins can customize individual user permissions via the TeamScreen. See `21_Standard_SaaS_Features.md` §9 for the complete permission model and default values.

---

**End of File**
