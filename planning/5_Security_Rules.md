“Implementation must comply with 0_Antigravity_Handoff_Guardrails.md (non-negotiable).”

# Firestore Security Rules & Data Isolation Strategy

**Architecture:** Shared Database.
**Isolation Key:** `tenant_id` string on every document.

## 1. Authentication Claims (Custom Claims)

We will use Firebase Auth Custom Claims. When a user logs in, their ID Token must contain:

* `token.tenant_id`: "tenant_xyz123" (The business they belong to)
* `token.role`: "super_admin" | "tenant_admin" | "sales_rep"

**Important:** These claims are set server-side by Cloud Functions (`createTenant` for the initial admin, `assignTenantOnSignup` for invited users) and CANNOT be modified by the client.

## 2. Firestore Rules Logic

The following logic must be applied to ALL collections (`leads`, `interactions`, `users`).

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user belongs to the data's tenant
    function belongsToTenant(resourceData) {
      return request.auth.token.tenant_id == resourceData.tenant_id;
    }

    // Helper: Check if user is assigning the correct tenant_id on write
    function assigningCorrectTenant() {
      return request.resource.data.tenant_id == request.auth.token.tenant_id;
    }

    // Helper: Check if user is Super Admin
    function isSuperAdmin() {
      return request.auth.token.role == 'super_admin';
    }

    // Helper: Ensure audit fields are set on client-side creates
    function hasAuditFieldsOnCreate() {
      return request.resource.data.created_by == request.auth.uid
          && request.resource.data.updated_by == request.auth.uid;
    }

    // Helper: Ensure updated_at/updated_by are refreshed on client-side updates
    function hasAuditFieldsOnUpdate() {
      return request.resource.data.updated_at == request.time
          && request.resource.data.updated_by == request.auth.uid;
    }

    // Helper: Ensure audit fields on append-only collection creates
    // Used for collections that only have created_at/created_by (no updated_at/updated_by):
    // interactions, activity_logs
    function hasAppendOnlyAuditFields() {
      return request.resource.data.created_by == request.auth.uid;
    }

    // Helper: Whitelist of fields that tenant users can update on leads
    // All other fields (business_details, contact_details, ai_analysis, priority, 
    // enrichment_status, opt_in_status) are server-side only via Cloud Functions.
    function isAllowedLeadUpdate() {
      let allowedFields = ['status', 'next_follow_up_at', 'last_contacted_at',
                           'last_interaction_at', 'follow_up_owner', 'assigned_to',
                           'has_unread_message', 'has_pending_draft',
                           'is_archived', 'archived_at', 'archived_by',
                           'updated_at', 'updated_by'].toSet();
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(allowedFields);
    }

    // Helper: Whitelist of fields allowed on lead CREATE.
    // Prevents client from setting server-only fields like ai_analysis, priority, etc.
    function isAllowedLeadCreate() {
      let blockedFields = ['ai_analysis', 'priority', 'enrichment_status', 
                           'contact_details', 'last_message_preview', 
                           'has_unread_message', 'has_pending_draft'].toSet();
      return !request.resource.data.keys().hasAny(blockedFields);
    }

    // =========================================================
    // 1. TENANTS COLLECTION (Protected Root)
    // =========================================================
    match /tenants/{tenantId} {
      // Tenant Admin can READ their own config
      allow read: if request.auth != null && (request.auth.token.tenant_id == tenantId || isSuperAdmin());
      
      // ONLY Super Admin can WRITE (Change plan, add credits)
      // This prevents a tenant from hacking their own credit balance.
      allow write: if isSuperAdmin();

      // Subcollection: Search Grids
      match /search_grids/{gridId} {
         // Optimization: Check token claims instead of reading parent doc
         allow read, write: if request.auth != null && (request.auth.token.tenant_id == tenantId || isSuperAdmin());
      }
    }

    // =========================================================
    // 1.1 CREDIT TRANSACTIONS (Ledger)
    // =========================================================
    match /credit_transactions/{transId} {
      // Read: Tenant Admin can view their own history
      allow read: if request.auth != null && (belongsToTenant(resource.data) || isSuperAdmin());
      // Write: NO ONE. Server-side only.
      allow write: if false; 
    }

    // =========================================================
    // 2. LEADS COLLECTION (The Core Data)
    // =========================================================
    match /leads/{leadId} {
      // Read: Only if user's tenant_id matches the doc's tenant_id
      allow read: if request.auth != null && (belongsToTenant(resource.data) || isSuperAdmin());
      
      // Create: Only if user assigns their own tenant_id AND doesn't set server-only fields
      allow create: if request.auth != null && assigningCorrectTenant() && isAllowedLeadCreate() && hasAuditFieldsOnCreate();
      
      // Update: Only if user stays in their tenant AND only whitelisted fields
      // Server-side fields (business_details, contact_details, ai_analysis, priority,
      // enrichment_status, opt_in_status, last_message_preview) are written only by Cloud Functions
      // which bypass security rules via Admin SDK.
      allow update: if request.auth != null 
        && belongsToTenant(resource.data) 
        && assigningCorrectTenant()
        && isAllowedLeadUpdate()
        && hasAuditFieldsOnUpdate();
    }

    // =========================================================
    // 3. INTERACTIONS COLLECTION (Chat Logs)
    // =========================================================
    match /interactions/{interactionId} {
      allow read: if request.auth != null && (belongsToTenant(resource.data) || isSuperAdmin());
      // Append-Only: Users can log calls/notes but cannot modify/delete history.
      allow create: if request.auth != null && assigningCorrectTenant() && hasAppendOnlyAuditFields();
      allow update, delete: if false;
    }

    // =========================================================
    // 4. USERS COLLECTION
    // =========================================================

    match /users/{userId} {
      // Read: Users can view profiles in their tenant (e.g., Owner views Rep, Rep views Owner)
      allow read: if request.auth != null && (belongsToTenant(resource.data) || request.auth.uid == userId);
      // WRITE LOCKED: Created via Cloud Functions (`createTenant` for admin, `assignTenantOnSignup` for invitees) ONLY
      // SMB Safety: Tenant Admin cannot write arbitrary fields to prevent privilege escalation.
      allow write: if isSuperAdmin(); 
    }

    // =========================================================
    // 7. INVITATIONS & PRODUCTS
    // =========================================================
    match /invitations/{inviteId} {
       // Read: Tenant users can see invites for their tenant
       allow read: if request.auth != null && (belongsToTenant(resource.data) || isSuperAdmin());
       
       // Create: ONLY via Cloud Function (sendInvite).
       // Direct client creates are blocked to prevent token forgery.
       allow create: if false;
       
       // Update: ONLY via Cloud Function (assignTenantOnSignup).
       // Direct client updates are blocked to prevent status manipulation.
       allow update: if false;
       
       // Delete: Never.
       allow delete: if false;
    }

    match /products/{productId} {
       // Read: All tenant users
       allow read: if request.auth != null && (belongsToTenant(resource.data) || isSuperAdmin());
       
       // Create: Tenant Admin only, must assign own tenant_id
       allow create: if request.auth != null 
         && assigningCorrectTenant() 
         && request.auth.token.role == 'tenant_admin'
         && hasAuditFieldsOnCreate();
       
       // Update: Tenant Admin only, must stay in own tenant
       allow update: if request.auth != null 
         && belongsToTenant(resource.data) 
         && assigningCorrectTenant()
         && request.auth.token.role == 'tenant_admin'
         && hasAuditFieldsOnUpdate();
       
       // Delete: Tenant Admin only
       allow delete: if request.auth != null 
         && belongsToTenant(resource.data) 
         && request.auth.token.role == 'tenant_admin';
    }

    // =========================================================
    // 5. SYSTEM CONFIG (Super Admin Only)
    // =========================================================
    match /system_config/{document=**} {
      allow read, write: if isSuperAdmin();
    }
    
    // =========================================================
    // 5.1 SYSTEM CONFIG PUBLIC (Force Update Check)
    // =========================================================
    match /system_config_public/{document=**} {
      // Any authenticated user can read (for min_app_version check)
      allow read: if request.auth != null;
      // Only Super Admin can write
      allow write: if isSuperAdmin();
    }
    
    // =========================================================
    // 6. SYSTEM LOGS (Error Reporting)
    // =========================================================
    match /system_logs/{logId} {
      // Best Practice: Clients should call a Cloud Function `logError` which writes here.
      // Direct writes blocked to prevent spam.
      allow create: if false; 
      allow read: if isSuperAdmin(); // Only you see the bugs
    }

    // =========================================================
    // 8. MESSAGE QUEUE (Server-Side Only)
    // =========================================================
    match /message_queue/{msgId} {
      // Server-side only via Cloud Functions.
      // Tenant Admin can read to see queue status if needed.
      allow read: if request.auth != null && (belongsToTenant(resource.data) || isSuperAdmin());
      allow write: if false; 
    }

    // =========================================================
    // 9. BROCHURE VECTORS (RAG Pipeline)
    // =========================================================
    match /brochure_vectors/{vectorId} {
      // Read: Tenant users (for AI context display, if needed)
      allow read: if request.auth != null && (belongsToTenant(resource.data) || isSuperAdmin());
      // Write: Server-side only (indexBrochure CF)
      allow write: if false;
    }

    // =========================================================
    // 10. LOGIN HISTORY (Session Audit)
    // =========================================================
    match /login_history/{logId} {
      // Users can read their own login history
      allow read: if request.auth != null && request.auth.uid == resource.data.user_id;
      // Tenant admin can read login history for users in their tenant
      allow read: if request.auth != null 
        && request.auth.token.role == 'tenant_admin' 
        && belongsToTenant(resource.data);
      // Super admin can read all
      allow read: if isSuperAdmin();
      // No client writes — CF only
      allow write: if false;
    }

    // =========================================================
    // 11. NOTIFICATIONS (In-App Feed)
    // =========================================================
    match /notifications/{notifId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.user_id;
      // Users can mark their own notifications as read (update is_read + audit fields only)
      allow update: if request.auth != null 
        && request.auth.uid == resource.data.user_id
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['is_read', 'updated_at', 'updated_by'])
        && request.resource.data.is_read is bool
        && hasAuditFieldsOnUpdate();
      allow create, delete: if false;
    }

    // =========================================================
    // 12. ACTIVITY LOGS (Tenant Action Audit)
    // =========================================================
    match /activity_logs/{logId} {
      allow read: if request.auth != null 
        && (request.auth.token.role == 'tenant_admin' && belongsToTenant(resource.data))
        || isSuperAdmin();
      // Client can create activity logs for their own tenant
      allow create: if request.auth != null && assigningCorrectTenant() && hasAppendOnlyAuditFields();
      allow update, delete: if false;
    }
  }
}

```

## 3. Storage Rules (Cloud Storage for Images/PDFs)

Files are stored in folders: `gs://bucket_name/{tenant_id}/...`

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{tenantId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.token.tenant_id == tenantId;
    }
  }
}

```

---

## 4. Firestore Access Summary

| Collection | Create | Read | Update | Delete | Method |
|------------|--------|------|--------|--------|--------|
| `tenants` | ❌ | ✅ (Self) | ❌ | ❌ | Cloud Function (`createTenant`) |
| `users` | ❌ | ✅ (Tenant) | ❌ | ❌ | Cloud Function (`updateUserProfile`, `assignTenantOnSignup`) |
| `leads` | ✅ | ✅ (Tenant) | ✅ (Limited) | ❌ | Client + Cloud Function (`discoverLeads`, `enrichLeads`) |
| `interactions` | ✅ | ✅ (Tenant) | ❌ | ❌ | Client (Append-only) |
| `credit_transactions` | ❌ | ✅ (Admin) | ❌ | ❌ | Cloud Function only |
| `products` | ✅ (Admin) | ✅ (Tenant) | ✅ (Admin) | ✅ (Admin) | Client |
| `invitations` | ❌ | ✅ (Tenant) | ❌ | ❌ | Cloud Function (`sendInvite`) |
| `login_history` | ❌ | ✅ (Self/Admin) | ❌ | ❌ | Cloud Function (`logLoginEvent`) |
| `notifications` | ❌ | ✅ (Self) | ✅ (is_read) | ❌ | Cloud Function (Create) + Client (Update) |
| `activity_logs` | ✅ | ✅ (Admin) | ❌ | ❌ | Client + Cloud Function |
| `message_queue` | ❌ | ✅ (Admin) | ❌ | ❌ | Cloud Function only |
| `system_logs` | ❌ | ✅ (Super) | ❌ | ❌ | Cloud Function (`logError`) |

---

**End of File**