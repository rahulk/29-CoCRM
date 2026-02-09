# WhatsApp Message Templates

> **Purpose:** Defines the exact WhatsApp Business API templates used by CoCRM. Templates are registered through MSG91 (our BSP), which handles Meta approval on our behalf. Referenced by Cloud Functions (sendWhatsapp) and UI (ConversationScreen's "Send Intro Template" button).
>
> **Template Approval:** All templates must be submitted for Meta approval via MSG91 dashboard BEFORE they can be sent. MSG91 routes the submission to Meta — approval typically takes 24–48 hours. Register templates in MSG91 Dashboard → Campaigns → WhatsApp → Templates.

---

## 1. Template: `intro_offer_v1`

**Referenced by:** Doc 16 §4.2 ("Send Intro Template" button), Doc 3 §4 (`sendWhatsapp` CF).
**Category:** `MARKETING` (initiates conversation — not a reply to user message).
**Cost:** ~80 paisa per send (marketing rate for India).
**Language:** `en` (English). Phase 2: add `hi` (Hindi) variant.

### Template Structure

**Header:** None (keep it simple — WhatsApp marketing headers often reduce open rates for SMB outreach).

**Body:**
```
Hi {{1}},

I'm reaching out from {{2}}. We noticed your business on Google and think we could help you get more customers.

Would you be open to a quick chat about how we can help?
```

**Footer:**
```
Reply STOP to unsubscribe
```

**Buttons:** None for MVP. Phase 2: add Quick Reply buttons ("Yes, tell me more" / "Not interested").

### Variable Mapping

| Variable | Source | Populated By |
|----------|--------|-------------|
| `{{1}}` | `leads.business_details.name` | `sendWhatsapp` CF — extracted from lead doc |
| `{{2}}` | `tenants.company_name` | `sendWhatsapp` CF — extracted from tenant doc |

### Example Rendered Message

> Hi Sunrise Fitness,
>
> I'm reaching out from Rahul's Study Center. We noticed your business on Google and think we could help you get more customers.
>
> Would you be open to a quick chat about how we can help?
>
> _Reply STOP to unsubscribe_

### Template Registration

```json
{
  "name": "intro_offer_v1",
  "language": "en",
  "category": "MARKETING",
  "components": [
    {
      "type": "BODY",
      "text": "Hi {{1}},\n\nI'm reaching out from {{2}}. We noticed your business on Google and think we could help you get more customers.\n\nWould you be open to a quick chat about how we can help?",
      "example": {
        "body_text": [["Sunrise Fitness", "Rahul's Study Center"]]
      }
    },
    {
      "type": "FOOTER",
      "text": "Reply STOP to unsubscribe"
    }
  ]
}
```

Note: This JSON matches the Meta template format. When registering through MSG91, use their dashboard UI (Campaigns → WhatsApp → Templates) and fill in the same body text and variables. MSG91 handles the Meta API submission automatically.

### sendWhatsapp API Call (via Provider Abstraction)

When the "Send Intro Template" button is tapped, sendWhatsapp CF calls messagingProvider.sendWhatsAppTemplate():
```typescript
// In whatsappService.ts — provider-agnostic call
const result = await getMessagingProvider().sendWhatsAppTemplate({
  to: '919876543210',
  templateName: 'intro_offer_v1',
  templateLanguage: 'en',
  variables: {
    '1': 'Sunrise Fitness',
    '2': "Rahul's Study Center",
  },
});
// result: { success: true, providerMessageId: "...", provider: "msg91" }
```

The MSG91 adapter translates this into MSG91's API format internally. If the provider is switched, only the adapter changes — the service code above stays identical.

---

## 2. Template: `follow_up_v1`

**Referenced by:** Auto-send from message queue processor (Doc 3 §8 item 2) when leads are in `contacted` status and haven't replied in 3 days.
**Category:** `MARKETING`
**Cost:** ~80 paisa per send.
**Language:** `en`
**Status:** Phase 2 — NOT used in MVP. Included here for planning.

### Template Structure

**Body:**
```
Hi {{1}},

Just following up on my earlier message. We'd love to show you how {{2}} can help grow your business.

If you're interested, just reply here and we'll set up a quick call.
```

**Footer:**
```
Reply STOP to unsubscribe
```

### Variable Mapping

| Variable | Source |
|----------|--------|
| `{{1}}` | `leads.business_details.name` |
| `{{2}}` | `tenants.company_name` |

---

## 3. Template: `trial_expiring_v1`

**Referenced by:** Push notification trigger (Doc 3 §11.3) — this is a push notification, NOT a WhatsApp template. Included here for completeness.
**Category:** N/A (FCM push, not WhatsApp).
**Status:** MVP — used in scheduled function.

**Note:** This is NOT a WhatsApp template. It's a Firebase Cloud Messaging payload. See Doc 3 §11.3 for the exact FCM payload structure.

---

## 4. Template Registration Checklist

Before going live with WhatsApp messaging:

- MSG91 account created and verified
- WhatsApp Business Phone Number integrated in MSG91 dashboard
- intro_offer_v1 template submitted via MSG91 dashboard (MSG91 routes to Meta for approval)
- Template approved (check status in MSG91 dashboard → WhatsApp → Templates)
- Phone Number ID saved to tenants.config.whatsapp_phone_id for each tenant
- MSG91_AUTH_KEY set in Secret Manager (Doc 18 §1)
- MSG91_WEBHOOK_SECRET set in Secret Manager (Doc 18 §1)
- Inbound webhook URL registered in MSG91 dashboard (Doc 18 §5.2)
- Email sending domain verified in MSG91
- DLT sender ID registered for SMS (India regulatory requirement)
- Test: send intro_offer_v1 to a test number and verify delivery + STOP handling

---

## 5. Compliance Notes

**STOP Handling (Doc 3 §4.1 Step 3):**
* The footer "Reply STOP to unsubscribe" is a Meta/WhatsApp requirement for marketing templates (enforced regardless of BSP).
* When the lead replies "STOP", `handleInboundMessage` detects the keyword (case-insensitive) and sets `opt_in_status: "opted_out"` on the lead.
* All future sends are blocked for that lead. The ConversationScreen shows the opt-out banner.
* Meta also handles opt-out at the platform level (via MSG91 BSP) — but our app enforces it independently as a safety layer.

**Template Re-submission:**
* If you change the template text, you must re-submit for approval via MSG91 dashboard. Meta treats it as a new template.
* Keep `intro_offer_v1` stable. For variations, create new templates (`intro_offer_v2`, `intro_offer_hinglish_v1`, etc.).

**Rate Limits:**
* New WhatsApp Business accounts start with a low sending tier (~250 unique contacts/24 hours).
* Tier increases automatically with good quality rating. Monitor quality in MSG91 dashboard (or Meta's Quality Rating documentation).
* CoCRM's daily cap (`usage_limits.max_whatsapp_msgs_daily`) should be set below the active tier limit to avoid API errors.

---
