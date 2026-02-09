import { defineSecret } from 'firebase-functions/params';

export const config = {
    msg91: {
        authKey: defineSecret('MSG91_AUTH_KEY'),
        webhookSecret: defineSecret('MSG91_WEBHOOK_SECRET'),
    },
    razorpay: {
        keyId: defineSecret('RAZORPAY_KEY_ID'),
        keySecret: defineSecret('RAZORPAY_KEY_SECRET'),
        webhookSecret: defineSecret('RAZORPAY_WEBHOOK_SECRET'),
    },
    apify: {
        token: defineSecret('APIFY_TOKEN'),
    },
    vertexAi: {
        projectId: defineSecret('VERTEX_AI_PROJECT_ID'),
        location: 'asia-south1',
    },
    googleMaps: {
        apiKey: defineSecret('GOOGLE_MAPS_API_KEY'),
    },
    aiService: {
        url: 'http://ai-service:8080', // Replace with real Cloud Run URL (env var)
    },
};
