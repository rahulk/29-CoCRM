# Messaging Implementation Guide (WhatsApp & Email)

This guide details how to implement WhatsApp and Email messaging with attachments using the MSG91 V5 APIs.

---

## 1. WhatsApp Implementation (Bulk API)

### API Structure
*   **Endpoint:** `POST https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/`
*   **Components:** Uses flattened keys (`header_1`, `body_1`, etc.) instead of nested objects.

### Full WhatsApp Snippet (Working)
```javascript
const axios = require('axios');

async function sendWhatsApp(payload) {
    const { phone, waTemplateName, waNamespace, templateData, attachments } = payload;
    const authKey = process.env.MSG91_AUTH_KEY;
    const integratedNumber = process.env.MSG91_INTEGRATED_NUMBER;

    const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
    const fullPhone = '91' + cleanPhone;

    const components = {};

    // 1. Header (Media)
    if (attachments && attachments.length > 0) {
        const att = attachments[0];
        components.header_1 = {
            "filename": att.filename || 'Document.pdf',
            "type": (att.filename || '').toLowerCase().endsWith('.pdf') ? 'document' : 'image',
            "value": att.href || att.link
        };
    }

    // 2. Body Variables (Cleaning internal fields is CRITICAL)
    if (templateData) {
        const internalFields = ['attachments', 'eventType', 'forceSend', 'tenantId', 'branchId', 'name', 'email', 'phone'];
        const keys = Object.keys(templateData).filter(k => !internalFields.includes(k));

        keys.forEach((key, index) => {
            components[`body_${index + 1}`] = {
                "type": "text",
                "value": String(templateData[key])
            };
        });
    }

    const waPayload = {
        "integrated_number": integratedNumber,
        "content_type": "template",
        "payload": {
            "messaging_product": "whatsapp",
            "type": "template",
            "template": {
                "name": waTemplateName,
                "language": { "code": "en", "policy": "deterministic" },
                "namespace": waNamespace,
                "to_and_components": [{ "to": [fullPhone], "components": components }]
            }
        }
    };

    return await axios.post("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", waPayload, {
        headers: { "authkey": authKey, "Content-Type": "application/json" }
    });
}
```

---

## 2. Email Implementation (V5 API)

### The Base64 Requirement
Unlike traditional APIs, MSG91 V5 Email requires attachments to be sent as **Base64 Data URIs**. Sending a URL directly will result in a 422 error.

### Full Email Snippet (Working)
```javascript
async function sendEmail(payload) {
    const processedAttachments = [];
    
    // Convert URLs to Base64 Data URIs
    if (payload.attachments && payload.attachments.length > 0) {
        for (const att of payload.attachments) {
            try {
                const response = await axios.get(att.href || att.link, { responseType: 'arraybuffer' });
                const base64 = Buffer.from(response.data, 'binary').toString('base64');
                const contentType = response.headers['content-type'] || 'application/pdf';
                processedAttachments.push({
                    "file": `data:${contentType};base64,${base64}`,
                    "filename": att.filename || 'Attachment.pdf'
                });
            } catch (e) {
                console.error('Attachment Fetch Failed:', e.message);
            }
        }
    }

    const emailPayload = {
        "to": [{ "email": payload.email }],
        "from": { "email": "no-reply@yourdomain.com", "name": "Your App" },
        "subject": payload.emailSubject,
        "body": {
            "type": "text/html",
            "data": payload.emailBody
        },
        "attachments": processedAttachments
    };

    return await axios.post("https://api.msg91.com/api/v5/email/send", emailPayload, {
        headers: { "authkey": process.env.MSG91_AUTH_KEY, "Content-Type": "application/json" }
    });
}
```

---

## 3. Common Errors Checklist

| Error Code | Meaning | Fix |
| :--- | :--- | :--- |
| **131053** | WhatsApp Media Error | File too large (>5MB) or URL not public. |
| **422** | Email Invalid Data | Check if attachments are Base64 strings. |
| **Count Mismatch** | Template Variable Error | Ensure `body_X` exactly matches `{{X}}` in template. |
| **Namespace Error** | Wrong Namespace | Copy namespace from MSG91 -> WhatsApp -> Templates. |

