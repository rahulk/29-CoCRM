export interface IMessagingProvider {
    sendWhatsApp(payload: WhatsAppPayload): Promise<MessagingResult>;
    sendEmail(payload: EmailPayload): Promise<MessagingResult>;
}

export interface WhatsAppPayload {
    phone: string;
    templateName: string;
    namespace?: string;
    templateData?: Record<string, string>;
    attachments?: Attachment[];
}

export interface EmailPayload {
    email: string;
    subject: string;
    body: string;
    attachments?: Attachment[];
}

export interface Attachment {
    filename: string;
    href?: string; // URL
    content?: string; // Base64 if needed
}

export interface MessagingResult {
    success: boolean;
    messageId?: string;
    error?: string;
    rawResponse?: any;
}
