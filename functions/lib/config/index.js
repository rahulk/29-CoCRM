"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const params_1 = require("firebase-functions/params");
exports.config = {
    msg91: {
        authKey: (0, params_1.defineSecret)('MSG91_AUTH_KEY'),
        webhookSecret: (0, params_1.defineSecret)('MSG91_WEBHOOK_SECRET'),
    },
    razorpay: {
        keyId: (0, params_1.defineSecret)('RAZORPAY_KEY_ID'),
        keySecret: (0, params_1.defineSecret)('RAZORPAY_KEY_SECRET'),
        webhookSecret: (0, params_1.defineSecret)('RAZORPAY_WEBHOOK_SECRET'),
    },
    apify: {
        token: (0, params_1.defineSecret)('APIFY_TOKEN'),
    },
    vertexAi: {
        projectId: (0, params_1.defineSecret)('VERTEX_AI_PROJECT_ID'),
        location: 'asia-south1',
    },
    googleMaps: {
        apiKey: (0, params_1.defineSecret)('GOOGLE_MAPS_API_KEY'),
    },
    aiService: {
        url: 'http://ai-service:8080', // Replace with real Cloud Run URL (env var)
    },
};
//# sourceMappingURL=index.js.map