
# Super Admin Workflows & UI ("The God View")

**Access Control:**

* These screens must ONLY be accessible if `auth.token.role == 'super_admin'`.
* **Design Constraint:** The UI should use a distinct layout (e.g., a dark sidebar or a "Admin Mode" banner) to distinguish it from the Tenant App.

## 1. Tenant Overview Dashboard

* **UI Component:** A sortable data table listing all Tenants.
* **Columns:**
* Company Name
* Owner Email
* Plan (Basic/Pro)
* Status (Active/Suspended)
* Leads Usage (e.g., "450/1000")
* Credits Balance (e.g., "₹200.00")


* **Actions:**
* **"Login As" (Impersonation):** 
    * **Action:** Generates a temporary Custom Auth Token using Admin SDK.
    * **Security:** Token must have `claims: { tenant_id: target, role: admin, impersonated_by: super_admin_uid }`.
    * **Expiry:** Max 60 minutes.
    * **Audit:** Log event to `system_logs` with `action: impersonation_start`.
    * **Tenant-Side Banner:** While impersonating, a persistent red/orange banner component (fixed top, z-50) must be shown at the top of ALL tenant screens (above the bottom nav layout): "⚠️ Impersonating {company_name}. All actions are logged." with an "Exit" button that signs out the impersonation token and navigates back to `/admin`.
    * **Confirmation Dialog:** Before impersonation starts, show: "You will view {company_name}'s data. All actions will be logged. Continue?" with "Cancel" and "Continue" buttons.
* **"Edit Limits":** A dialog to manually increase their quota (e.g., "Add 500 leads").
* **"Suspend":** Immediately blocks access for non-payment.



## 2. Onboarding New Tenant (Manual)

* **Trigger:** You close a deal offline and need to give them access.
* **Form Fields:**
* Business Name.
* Owner Email (will receive an invite link).
* Plan Selection (Basic/Pro).
* Initial Credits (Optional override).
* **Action:** Calls Cloud Function `createTenant` which initializes their `tenant_id`, creates the admin user, and sets default `usage_limits`.



## 3. Global Analytics (The "Health" Check)

* **Charts:**
* "New Leads Found Today" (Aggregate of all tenants).
* "WhatsApp Messages Sent" (To monitor messaging provider costs — MSG91 in MVP).
* "Apify Credits Burned" (To prevent cost overruns).
* "Active Tenants" (Trend line).

**MVP Scope:** Static metric cards only (counts, not trend charts). Trend line charts are Phase 2. The AdminDashboardScreen shows: "Active Tenants", "Leads Found Today", "WhatsApp Sent Today", "Total Credits Burned" as simple number cards.



## 4. System Configuration

* **UI:** A secure settings page to update global API Keys without redeploying code.
* **Fields:**
* `google_places_api_key`
* `apify_token`
* `vertex_ai_project_id`


* **Storage:** These should be saved in Firestore `system_config` collection (secured so only Super Admin can read).

---

**End of File**