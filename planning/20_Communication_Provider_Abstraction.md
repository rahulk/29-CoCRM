# Communication Provider Abstraction

> **Purpose:** CoCRM's messaging features (WhatsApp, SMS, Email) must be provider-agnostic. Business logic calls a standard interface — the provider adapter handles the specifics. Swapping from MSG91 to Twilio (or any provider) should require ONLY a new adapter file + config change, ZERO changes to Cloud Function business logic or React UI.
>
> **Current Provider:** MSG91 (WhatsApp + SMS + Email — single vendor for India).
> **Future Options:** Meta WhatsApp Business API (direct), Twilio, Gupshup, Kaleyra.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                  Cloud Functions                      │
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ sendWhatsapp  │  │  sendInvite  │  │  aiReply   │ │
│  │ (Doc 3 §4)   │  │ (Doc 3 §10.1)│  │ (Doc 3 §5) │ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │
│         │                  │                │         │
│         ▼                  ▼                ▼         │
│  ┌─────────────────────────────────────────────────┐ │
│  │         IMessagingProvider (Interface)           │ │
│  │                                                   │ │
│  │  sendWhatsAppTemplate(to, template, vars)        │ │
│  │  sendWhatsAppFreeform(to, text)                  │ │
│  │  sendSMS(to, text)                               │ │
│  │  sendEmail(to, subject, html)                    │ │
│  │  validateWebhookSignature(headers, body)         │ │
│  │  parseInboundMessage(payload) → StandardMessage  │ │
│  └────────────────────┬────────────────────────────┘ │
│                       │                               │
│         ┌─────────────┼─────────────┐                │
│         ▼             ▼             ▼                │
│  ┌────────────┐ ┌──────────┐ ┌───────────┐          │
│  │ MSG91      │ │ Meta     │ │ Twilio    │          │
│  │ Adapter    │ │ Adapter  │ │ Adapter   │          │
│  │ (active)   │ │ (future) │ │ (future)  │          │
│  └────────────┘ └──────────┘ └───────────┘          │
└─────────────────────────────────────────────────────┘
```

**Key principle:** The `sendWhatsapp` Cloud Function never knows which provider is being used. It calls `messagingProvider.sendWhatsAppTemplate(...)` — the active adapter handles the rest.

---

## 2. Interface Definition

```typescript
// functions/src/providers/messaging/IMessagingProvider.ts

export interface IWhatsAppTemplateParams {
  to: string;                    // Phone number with country code: "919876543210"
  templateName: string;          // "intro_offer_v1"
  templateLanguage: string;      // "en"
  variables: Record<string, string>;  // { "1": "Sunrise Fitness", "2": "Rahul's Study Center" }
}

export interface IWhatsAppFreeformParams {
  to: string;
  text: string;
  replyToMessageId?: string;    // For threaded replies
}

export interface ISMSParams {
  to: string;
  text: string;
}

export interface IEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;                 // Override default sender
  replyTo?: string;
}

export interface ISendResult {
  success: boolean;
  providerMessageId: string;     // MSG91's request_id, Meta's wamid, etc.
  provider: string;              // "msg91", "meta", "twilio"
  rawResponse?: any;             // Full provider response for debugging
}

export interface IInboundMessage {
  from: string;                  // Sender phone number
  text: string;                  // Message content
  messageId: string;             // Provider's message ID (for dedup)
  timestamp: Date;
  channel: 'whatsapp' | 'sms';
  providerPhoneId?: string;      // The business phone number that received it
  rawPayload?: any;              // Original provider payload for debugging
}

export interface IMessagingProvider {
  readonly providerName: string;  // "msg91", "meta", "twilio"

  // ─── Outbound ───
  sendWhatsAppTemplate(params: IWhatsAppTemplateParams): Promise<ISendResult>;
  sendWhatsAppFreeform(params: IWhatsAppFreeformParams): Promise<ISendResult>;
  sendSMS(params: ISMSParams): Promise<ISendResult>;
  sendEmail(params: IEmailParams): Promise<ISendResult>;

  // ─── Inbound ───
  validateWebhookSignature(headers: Record<string, string>, body: string): boolean;
  parseInboundMessage(payload: any): IInboundMessage | null;

  // ─── Template Management ───
  getTemplateStatus(templateName: string): Promise<'approved' | 'pending' | 'rejected' | 'unknown'>;
}
```

---

## 3. MSG91 Adapter (Current Provider)

```typescript
// functions/src/providers/messaging/msg91Adapter.ts

import { IMessagingProvider, ISendResult, IInboundMessage, ... } from './IMessagingProvider';
import { defineSecret } from 'firebase-functions/params';

const msg91AuthKey = defineSecret('MSG91_AUTH_KEY');
const msg91WebhookSecret = defineSecret('MSG91_WEBHOOK_SECRET');

export class MSG91Adapter implements IMessagingProvider {
  readonly providerName = 'msg91';

  // ─── WhatsApp Template ───
  async sendWhatsAppTemplate(params: IWhatsAppTemplateParams): Promise<ISendResult> {
    // MSG91 WhatsApp API endpoint
    const response = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method: 'POST',
      headers: {
        'authkey': msg91AuthKey.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        integrated_number: this.businessPhoneNumber,
        content_type: 'template',
        payload: {
          messaging_product: 'whatsapp',
          type: 'template',
          template: {
            name: params.templateName,
            language: { code: params.templateLanguage },
            components: [
              {
                type: 'body',
                parameters: Object.values(params.variables).map(v => ({
                  type: 'text',
                  text: v,
                })),
              },
            ],
          },
        },
        recipients: [{ to: params.to }],
      }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      providerMessageId: data.request_id || data.data?.request_id || '',
      provider: 'msg91',
      rawResponse: data,
    };
  }

  // ─── WhatsApp Freeform ───
  async sendWhatsAppFreeform(params: IWhatsAppFreeformParams): Promise<ISendResult> {
    const response = await fetch('https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/', {
      method: 'POST',
      headers: {
        'authkey': msg91AuthKey.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        integrated_number: this.businessPhoneNumber,
        content_type: 'text',
        payload: {
          type: 'text',
          text: { body: params.text },
        },
        recipients: [{ to: params.to }],
      }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      providerMessageId: data.request_id || '',
      provider: 'msg91',
      rawResponse: data,
    };
  }

  // ─── SMS ───
  async sendSMS(params: ISMSParams): Promise<ISendResult> {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        'authkey': msg91AuthKey.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // MSG91 SMS uses "flow" concept
        // Configure flow template in MSG91 dashboard
        recipients: [{ mobiles: params.to }],
        // Flow-specific params
      }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      providerMessageId: data.request_id || '',
      provider: 'msg91',
      rawResponse: data,
    };
  }

  // ─── Email ───
  async sendEmail(params: IEmailParams): Promise<ISendResult> {
    const response = await fetch('https://api.msg91.com/api/v5/email/send', {
      method: 'POST',
      headers: {
        'authkey': msg91AuthKey.value(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [{ email: params.to }],
        from: { email: params.from || 'noreply@cocrm.app' },
        subject: params.subject,
        htmlContent: params.html,
        reply_to: params.replyTo ? [{ email: params.replyTo }] : undefined,
      }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      providerMessageId: data.request_id || '',
      provider: 'msg91',
      rawResponse: data,
    };
  }

  // ─── Webhook Validation ───
  validateWebhookSignature(headers: Record<string, string>, body: string): boolean {
    // MSG91 webhook validation
    // Verify using MSG91_WEBHOOK_SECRET
    const signature = headers['x-msg91-signature'] || headers['authorization'];
    // Implementation depends on MSG91's specific signature method
    // Some MSG91 webhooks use IP whitelisting instead of HMAC
    return this.verifySignature(signature, body, msg91WebhookSecret.value());
  }

  // ─── Parse Inbound ───
  parseInboundMessage(payload: any): IInboundMessage | null {
    try {
      // MSG91 inbound webhook structure
      // Adapt to MSG91's actual payload format
      return {
        from: payload.from || payload.sender,
        text: payload.text || payload.body || payload.message,
        messageId: payload.message_id || payload.id,
        timestamp: new Date(payload.timestamp || Date.now()),
        channel: payload.channel === 'sms' ? 'sms' : 'whatsapp',
        providerPhoneId: payload.to || payload.integrated_number,
        rawPayload: payload,
      };
    } catch {
      return null;
    }
  }

  // ─── Template Status ───
  async getTemplateStatus(templateName: string): Promise<'approved' | 'pending' | 'rejected' | 'unknown'> {
    // Query MSG91 API for template status
    // Implementation depends on MSG91's template management API
    return 'unknown';
  }

  private verifySignature(signature: string, body: string, secret: string): boolean {
    // HMAC-SHA256 or provider-specific validation
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }
}
```

---

## 4. Provider Factory (Singleton)

```typescript
// functions/src/providers/messaging/messagingProviderFactory.ts

import { IMessagingProvider } from './IMessagingProvider';
import { MSG91Adapter } from './msg91Adapter';
// import { MetaAdapter } from './metaAdapter';      // Future
// import { TwilioAdapter } from './twilioAdapter';  // Future

// Active provider — change this ONE line to switch providers
const ACTIVE_PROVIDER = 'msg91';

let _instance: IMessagingProvider | null = null;

export function getMessagingProvider(): IMessagingProvider {
  if (!_instance) {
    switch (ACTIVE_PROVIDER) {
      case 'msg91':
        _instance = new MSG91Adapter();
        break;
      // case 'meta':
      //   _instance = new MetaAdapter();
      //   break;
      // case 'twilio':
      //   _instance = new TwilioAdapter();
      //   break;
      default:
        throw new Error(`Unknown messaging provider: ${ACTIVE_PROVIDER}`);
    }
  }
  return _instance;
}
```

---

## 5. Usage in Cloud Functions

### 5.1 sendWhatsapp CF (Doc 3 §4)

The business logic NEVER references MSG91 directly:

```typescript
// functions/src/services/whatsappService.ts

import { getMessagingProvider } from '../providers/messaging/messagingProviderFactory';

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  variables: Record<string, string>,
): Promise<ISendResult> {
  const provider = getMessagingProvider();

  // Provider-agnostic call
  const result = await provider.sendWhatsAppTemplate({
    to,
    templateName,
    templateLanguage: 'en',
    variables,
  });

  if (!result.success) {
    throw new Error(`Message send failed via ${result.provider}`);
  }

  return result;
}

export async function sendFreeformMessage(
  to: string,
  text: string,
): Promise<ISendResult> {
  const provider = getMessagingProvider();

  const result = await provider.sendWhatsAppFreeform({ to, text });

  if (!result.success) {
    throw new Error(`Message send failed via ${result.provider}`);
  }

  return result;
}
```

### 5.2 handleInboundMessage CF (Doc 3 §4.1)

```typescript
// functions/src/triggers/webhooks.ts

import { getMessagingProvider } from '../providers/messaging/messagingProviderFactory';

export const handleInboundMessage = onRequest(async (req, res) => {
  const provider = getMessagingProvider();

  // Step 1: Validate signature (provider handles its own method)
  if (!provider.validateWebhookSignature(req.headers, req.rawBody.toString())) {
    res.status(400).send('Invalid signature');
    return;
  }

  // Step 2: Parse to standard format (provider handles its own payload shape)
  const message = provider.parseInboundMessage(req.body);
  if (!message) {
    res.status(200).send('OK'); // Acknowledge but skip unparseable messages
    return;
  }

  // Step 3: Business logic — completely provider-agnostic
  await inboundMessageService.process(message);

  res.status(200).send('OK');
});
```

### 5.3 sendInvite CF (Doc 3 §10.1) — Email

```typescript
// functions/src/services/teamService.ts

import { getMessagingProvider } from '../providers/messaging/messagingProviderFactory';

export async function sendTeamInvitation(
  email: string,
  companyName: string,
  joinLink: string,
): Promise<void> {
  const provider = getMessagingProvider();

  await provider.sendEmail({
    to: email,
    subject: `You've been invited to join ${companyName} on CoCRM`,
    html: buildInvitationEmailHtml(companyName, joinLink),
    from: 'noreply@cocrm.app',
  });
}
```

---

## 6. File Structure

```
functions/src/
├── providers/
│   └── messaging/
│       ├── IMessagingProvider.ts          # Interface (never changes)
│       ├── messagingProviderFactory.ts    # Factory — change ACTIVE_PROVIDER here
│       ├── msg91Adapter.ts               # Current provider implementation
│       ├── metaAdapter.ts                # Future (empty placeholder)
│       └── twilioAdapter.ts              # Future (empty placeholder)
├── services/
│   ├── whatsappService.ts               # Calls getMessagingProvider() — provider-agnostic
│   ├── teamService.ts                   # sendEmail via getMessagingProvider()
│   └── ...
└── triggers/
    ├── webhooks.ts                      # Inbound handler — uses provider.parseInboundMessage()
    └── ...
```

---

## 7. Switching Providers (Future)

To switch from MSG91 to (e.g.) Twilio:

| Step | What | Time |
|------|------|------|
| 1 | Create `twilioAdapter.ts` implementing `IMessagingProvider` | 2–4 hours |
| 2 | Add Twilio secrets to Secret Manager (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) | 5 min |
| 3 | Change `ACTIVE_PROVIDER = 'twilio'` in `messagingProviderFactory.ts` | 1 line |
| 4 | Update webhook URL in Twilio dashboard to point to your CF | 5 min |
| 5 | Re-register WhatsApp templates in Twilio (if using Twilio WhatsApp) | 30 min |
| 6 | Deploy | 5 min |

**What does NOT change:**
- `sendWhatsapp` CF business logic (credits, quotas, opt-out checks, quiet hours)
- `handleInboundMessage` business logic (lead lookup, STOP detection, aiReply trigger)
- `sendInvite` business logic
- React app (it calls CFs, never talks to providers directly)
- Firestore schema
- Security rules
- UI screens

---

## 8. Impact on Existing Docs

### Changes needed in other planning docs:

**Doc 3 (`3_API_Workflows.md`):**
- §4 `sendWhatsapp` Phase 2 Step 8: Change "Call WhatsApp Business API" → "Call `messagingProvider.sendWhatsAppTemplate()` or `sendWhatsAppFreeform()`". Remove Meta-specific payload format.
- §4.1 `handleInboundMessage`: Change "Validate `X-Hub-Signature-256`" → "Call `messagingProvider.validateWebhookSignature()`". Change payload parsing to "Call `messagingProvider.parseInboundMessage()`".
- §10.1 `sendInvite`: Change "Send email via SendGrid" → "Call `messagingProvider.sendEmail()`".

**Doc 0 (`0_Antigravity_Handoff_Guardrails.md`):**
- Part A4: Remove "Meta API call OUTSIDE transaction" — change to "Provider API call OUTSIDE transaction" (principle stays the same).
- Part B4: Add `providers/messaging/` to the CF file structure.
- Part D2: Add "❌ Calling MSG91/Meta/Twilio directly from service files (must go through IMessagingProvider)".

**Doc 7 (`7_Dependencies.md`):**
- Cloud Functions: No new package needed — MSG91 uses REST API via `fetch`. No SDK required.
- If switching to Twilio in future: add `twilio` npm package.

**Doc 18 (`18_Environment_Secrets.md`):**
- Replace Meta-specific and SendGrid secrets with MSG91 secrets:

| Remove | Add |
|--------|-----|
| `WHATSAPP_APP_SECRET` | `MSG91_AUTH_KEY` |
| `WHATSAPP_ACCESS_TOKEN` | `MSG91_WEBHOOK_SECRET` |
| `SENDGRID_API_KEY` | (covered by MSG91 — single key for WhatsApp + SMS + Email) |

**Doc 19 (`19_WhatsApp_Templates.md`):**
- Template body text stays the same (it's your content, not provider-specific).
- Registration format changes: Meta JSON → MSG91 dashboard / API format.
- API call payload changes: Meta format → MSG91 format (but this is inside the adapter, not in the business logic).

---

## 9. MSG91-Specific Setup

### 9.1 Secrets (to add to Secret Manager)

| Secret Name | Source | Used By |
|-------------|--------|---------|
| `MSG91_AUTH_KEY` | MSG91 Dashboard → API Keys | All outbound messages (WhatsApp, SMS, Email) |
| `MSG91_WEBHOOK_SECRET` | MSG91 Dashboard → Webhooks → Secret | Inbound webhook signature validation |

### 9.2 MSG91 Dashboard Configuration

| Item | Value |
|------|-------|
| Dashboard URL | `https://control.msg91.com/` |
| WhatsApp Section | Campaigns → WhatsApp → Integrated Numbers |
| Inbound Webhook URL | `https://{region}-{project}.cloudfunctions.net/handleInboundMessage` |
| WhatsApp templates | Register `intro_offer_v1` via MSG91 dashboard (MSG91 handles Meta submission) |
| Email domain | Verify sending domain (`cocrm.app`) in MSG91 Email settings |
| SMS sender ID | Register DLT-compliant sender ID (required in India) |

### 9.3 MSG91 Advantages for India

- **Single vendor** for WhatsApp + SMS + Email (one API key, one dashboard, one invoice).
- **DLT compliance** built-in (required for SMS in India — MSG91 handles DLT registration).
- **India-optimized** pricing and routing.
- **WhatsApp BSP:** MSG91 is an official Meta Business Solution Provider — they handle Meta approval for templates.
- **No separate Meta Business verification needed** — MSG91 manages the WABA (WhatsApp Business Account) on your behalf.

### 9.4 Limitations to Note

- MSG91's API format differs from Meta's Cloud API — the adapter handles this translation.
- Template management is done via MSG91 dashboard, not Meta Business Manager directly.
- If you ever want to move to direct Meta API (bypassing BSP), you'll need to re-register templates and complete Meta Business Verification independently.

---

## 10. Provider Comparison (For Future Reference)

| Feature | MSG91 | Meta Direct | Twilio | Gupshup |
|---------|-------|-------------|--------|---------|
| WhatsApp | ✅ (BSP) | ✅ (direct) | ✅ (BSP) | ✅ (BSP) |
| SMS (India DLT) | ✅ | ❌ | ✅ | ✅ |
| Email | ✅ | ❌ | ✅ (SendGrid) | ❌ |
| Single API key | ✅ | ❌ (separate) | ❌ (separate) | ❌ |
| India pricing | ✅ Best | Good | Expensive | Good |
| Meta verification | Handled | You do it | Handled | Handled |
| Webhook format | Custom | Standard | Standard | Custom |
| Adapter effort | Done | 2–4 hours | 2–4 hours | 2–4 hours |

---
