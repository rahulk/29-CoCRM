import * as functions from "firebase-functions";
import { google } from "googleapis";
import { db } from "../../config/firebase";

const oauth2Client = new google.auth.OAuth2(
    process.env.GMB_CLIENT_ID,
    process.env.GMB_CLIENT_SECRET,
    process.env.GMB_REDIRECT_URI
);

export const connectGMB = functions.https.onCall(async (request) => {
    if (!request.auth) {
        throw new functions.https.HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { code } = request.data;
    const tenantId = request.auth.token.tenant_id;

    if (!tenantId) {
        throw new functions.https.HttpsError(
            "failed-precondition",
            "User must belong to a tenant."
        );
    }

    try {
        const { tokens } = await oauth2Client.getToken(code);

        // Store tokens in Firestore (protected subcollection or root collection)
        // We store it in a subcollection 'integrations' under the tenant
        await db.doc(`tenants/${tenantId}/integrations/gmb`).set({
            refresh_token: tokens.refresh_token,
            access_token: tokens.access_token, // Optional to store, but good for caching
            expiry_date: tokens.expiry_date,
            connected_at: new Date(),
            status: 'connected'
        }, { merge: true });

        // Fetch locations to store them
        oauth2Client.setCredentials(tokens);
        const mybusinessbusinessinformation = google.mybusinessbusinessinformation({
            version: 'v1',
            auth: oauth2Client
        });

        const accountsResolver = mybusinessbusinessinformation.accounts as any;
        const accounts = await accountsResolver.list();
        const accountId = accounts.data.accounts?.[0].name; // accounts/123456

        if (accountId) {
            const locations = await mybusinessbusinessinformation.accounts.locations.list({
                parent: accountId,
                readMask: 'name,title,storeCode'
            });

            await db.doc(`tenants/${tenantId}/integrations/gmb`).set({
                accountId: accountId,
                locations: locations.data.locations || []
            }, { merge: true });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error connecting GMB:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
