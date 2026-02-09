"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectGMB = void 0;
const functions = require("firebase-functions");
const googleapis_1 = require("googleapis");
const firebase_1 = require("../../config/firebase");
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GMB_CLIENT_ID, process.env.GMB_CLIENT_SECRET, process.env.GMB_REDIRECT_URI);
exports.connectGMB = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { code } = request.data;
    const tenantId = request.auth.token.tenant_id;
    if (!tenantId) {
        throw new functions.https.HttpsError("failed-precondition", "User must belong to a tenant.");
    }
    try {
        const { tokens } = await oauth2Client.getToken(code);
        // Store tokens in Firestore (protected subcollection or root collection)
        // We store it in a subcollection 'integrations' under the tenant
        await firebase_1.db.doc(`tenants/${tenantId}/integrations/gmb`).set({
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token, // Optional to store, but good for caching
            expiry_date: tokens.expiry_date,
            connected_at: new Date(),
            status: 'connected'
        }, { merge: true });
        // Fetch locations to store them
        oauth2Client.setCredentials(tokens);
        const mybusinessbusinessinformation = googleapis_1.google.mybusinessbusinessinformation({
            version: 'v1',
            auth: oauth2Client
        });
        const accountsResolver = mybusinessbusinessinformation.accounts;
        const accounts = await accountsResolver.list();
        const accountId = accounts.data.accounts?.[0].name; // accounts/123456
        if (accountId) {
            const locations = await mybusinessbusinessinformation.accounts.locations.list({
                parent: accountId,
                readMask: 'name,title,storeCode'
            });
            await firebase_1.db.doc(`tenants/${tenantId}/integrations/gmb`).set({
                accountId: accountId,
                locations: locations.data.locations || []
            }, { merge: true });
        }
        return { success: true };
    }
    catch (error) {
        console.error("Error connecting GMB:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
//# sourceMappingURL=connectGMB.js.map