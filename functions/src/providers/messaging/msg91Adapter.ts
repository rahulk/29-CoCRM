import axios from "axios";
import { IMessagingProvider, WhatsAppPayload, EmailPayload, MessagingResult } from "./IMessagingProvider";

export class Msg91Adapter implements IMessagingProvider {
    private authKey: string;
    private integratedNumber: string;

    constructor() {
        this.authKey = process.env.MSG91_AUTH_KEY || "";
        this.integratedNumber = process.env.MSG91_INTEGRATED_NUMBER || "";

        if (!this.authKey) console.warn("MSG91_AUTH_KEY is missing");
        if (!this.integratedNumber) console.warn("MSG91_INTEGRATED_NUMBER is missing");
    }

    async sendWhatsApp(payload: WhatsAppPayload): Promise<MessagingResult> {
        const { phone, templateName, namespace, templateData, attachments } = payload;

        // Clean phone number: remove non-digits, remove leading 91 if present (to standardize), then add it back? 
        // Guide says: "const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, ''); const fullPhone = '91' + cleanPhone;"
        // Let's follow the guide.
        const cleanPhone = phone.replace(/\D/g, '').replace(/^91/, '');
        const fullPhone = '91' + cleanPhone;

        const components: any = {};

        // 1. Header (Media)
        if (attachments && attachments.length > 0) {
            const att = attachments[0];
            components.header_1 = {
                "filename": att.filename || 'Document.pdf',
                "type": (att.filename || '').toLowerCase().endsWith('.pdf') ? 'document' : 'image',
                "value": att.href || att.content
            };
        }

        // 2. Body Variables (Cleaning internal fields is CRITICAL)
        if (templateData) {
            const internalFields = ['attachments', 'eventType', 'forceSend', 'tenantId', 'branchId', 'name', 'email', 'phone'];
            const keys = Object.keys(templateData).filter(k => !internalFields.includes(k));

            keys.forEach((key, index) => {
                // Ensure values are strings
                components[`body_${index + 1}`] = {
                    "type": "text",
                    "value": String(templateData[key])
                };
            });
        }

        const waPayload = {
            "integrated_number": this.integratedNumber,
            "content_type": "template",
            "payload": {
                "messaging_product": "whatsapp",
                "type": "template",
                "template": {
                    "name": templateName,
                    "language": { "code": "en", "policy": "deterministic" },
                    "namespace": namespace || undefined, // Namespace might be optional/derived if not provided, but mostly required for v5? Guide shows it.
                    "to_and_components": [{ "to": [fullPhone], "components": components }]
                }
            }
        };

        try {
            const response = await axios.post("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/", waPayload, {
                headers: { "authkey": this.authKey, "Content-Type": "application/json" }
            });

            return {
                success: true,
                messageId: response.data?.request_id || "queued",
                rawResponse: response.data
            };
        } catch (error: any) {
            console.error("MSG91 WhatsApp Error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.message,
                rawResponse: error.response?.data
            };
        }
    }

    async sendEmail(payload: EmailPayload): Promise<MessagingResult> {
        const processedAttachments: any[] = [];

        // Convert URLs to Base64 Data URIs
        if (payload.attachments && payload.attachments.length > 0) {
            for (const att of payload.attachments) {
                try {
                    if (att.content) {
                        // Already content (base64 or similar)? Guide assumes URL fetch. 
                        // If we have content, try to use it.
                        // But implementation guide strictly focuses on URL fetch to base64.
                        // Let's follow guide logic for href. Use content if href missing.
                        processedAttachments.push({
                            "file": att.content, // Assuming this is data URI if provided
                            "filename": att.filename || 'Attachment.pdf'
                        });
                        continue;
                    }

                    if (att.href) {
                        const response = await axios.get(att.href, { responseType: 'arraybuffer' });
                        const base64 = Buffer.from(response.data, 'binary').toString('base64');
                        const contentType = response.headers['content-type'] || 'application/pdf';
                        processedAttachments.push({
                            "file": `data:${contentType};base64,${base64}`,
                            "filename": att.filename || 'Attachment.pdf'
                        });
                    }
                } catch (e: any) {
                    console.error('Attachment Fetch Failed:', e.message);
                }
            }
        }

        const emailPayload = {
            "to": [{ "email": payload.email }],
            "from": { "email": "no-reply@cocrm.app", "name": "CoCRM" }, // Configurable?
            "subject": payload.subject,
            "body": {
                "type": "text/html",
                "data": payload.body
            },
            "attachments": processedAttachments
        };

        try {
            const response = await axios.post("https://api.msg91.com/api/v5/email/send", emailPayload, {
                headers: { "authkey": this.authKey, "Content-Type": "application/json" }
            });

            return {
                success: true,
                messageId: response.data?.message || "sent",
                rawResponse: response.data
            };
        } catch (error: any) {
            console.error("MSG91 Email Error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.message,
                rawResponse: error.response?.data
            };
        }
    }
}
