
# Billing & Subscription System

**Gateway:** Razorpay (Primary for India)
**Currency:** INR
**Models:** Recurring Subscription (SaaS) + One-time Payment (Credits).

## 1. Subscription Logic (SaaS Plan)

**Goal:** Charge a fixed monthly fee (e.g., ₹999/mo) for platform access.

**Data Model Updates (`tenants` collection):**

* `subscription_id`: (String) The ID from Razorpay (e.g., `sub_12345`).
* `plan_id`: (String) "plan_basic_monthly", "plan_pro_yearly".
* `next_billing_date`: (Timestamp).
* `payment_method_status`: (String) "valid", "expiring_soon", "failed".

**Workflow:**

1. **Selection:** User selects "Pro Plan" in the app.
2. **Creation:** App calls Cloud Function `createSubscriptionLink`.
* *Logic:* Calls Razorpay API -> Returns `payment_link`.


3. **Payment:** User completes payment on Razorpay checkout.
4. **Activation (Webhook):** Razorpay hits your `handleRazorpayWebhook` function with event `subscription.activated`.
* *Action:* Update `tenants/{id}` status to `active`.



## 2. Usage Credits Logic (Pre-paid)

**Goal:** Charge for variable costs (WhatsApp & Apify) so you don't lose money.

**Workflow:**

1. **Top-up:** User clicks "Add Credits" -> Selects amount (e.g., ₹500).
2. **Payment:** Standard Razorpay Web Checkout. The React app loads `checkout.js` via a script tag and opens the Razorpay payment modal using `new window.Razorpay(options).open()`.
3. **Fulfillment (Webhook):** On `payment.captured`:
* *Action:* Atomic Increment `credits_balance` in `tenants/{id}` by **50000** (₹500.00 * 100).
* **Security:** Validate `X-Razorpay-Signature` header using your `RAZORPAY_WEBHOOK_SECRET`.
    * Generate HMAC-SHA256 of the request body.
    * Compare with header. **Drop request if mismatch.**
* **Idempotency:** Before processing, check `credit_transactions` for an existing doc with `idempotency_key == "razorpay_{payment_id}"`. If found, return 200 without processing. Razorpay may retry webhooks — this prevents double credit grants.



## 3. Simplified Pricing Story (For Owners)

> "Pay ₹999/mo for the Assistant. Top up fuel (credits) when you want to speed up."

**What happens when credits hit 0?**
* **STOP:** WhatsApp Marketing Messages (cannot send new campaigns).
* **STOP:** Enrichment (cannot find emails for new leads).
* **CONTINUE:** Inbound Replies (You can still chat with existing leads).
* **CONTINUE:** Google Maps Search (Free quota allows searching).

## 4. Cost Deduction Logic (The "Meter")

Every time a cost is incurred, the system MUST deduct from `credits_balance`.

| Feature | Cost (Approx) | Deducted From | Check Logic |
| --- | --- | --- | --- |
| **WhatsApp Marketing** | 80 paisa / msg | `credits_balance` | `if (balance < 80) throw Error` |
| **WhatsApp Utility** | 30 paisa / msg | `credits_balance` | `if (balance < 30) throw Error` |
| **Lead Enrichment (Apify)** | 50 paisa / lead | `credits_balance` | `if (balance < 50) throw Error` |

| **Google Maps Search** | Free (Monthly Quota) | N/A (Quota) | `if (usage > limit) throw Error` |


## 5. Environment Configuration

The app must support switching gateways for testing.

* **Dev Environment:**
* Key: `rzp_test_12345`
* Mode: Sandbox (Fake money).


* **Prod Environment:**
* Key: `rzp_live_98765`
* Mode: Live (Real money).



**File:** `apps/web/src/features/billing/api/billingConfig.ts`

* A configuration module that reads the Razorpay key from `import.meta.env.VITE_RAZORPAY_KEY_ID`. Vite automatically loads the correct `.env.development` or `.env.production` file based on the build mode.

## 6. Payment Failure Handling

**What happens when a subscription payment fails?**

| Razorpay Event | Action | `subscription_status` | User Experience |
| --- | --- | --- | --- |
| `subscription.pending` | Payment retry in progress | `past_due` | Yellow banner: "Payment failed. Retrying..." Features still work. |
| `subscription.halted` | All retries failed | `suspended` | Redirect to AccountBlockedScreen. Features blocked. |
| `payment.failed` | One-time payment failed | No change | SnackBar on TopUpScreen: "Payment failed." |

**Grace Period:** Between `past_due` and `suspended` (typically 3 Razorpay retry attempts over ~7 days), the tenant retains full access. This prevents disruption for temporary card issues.

---

**End of File**

---

### **Congratulations! You are done.**
