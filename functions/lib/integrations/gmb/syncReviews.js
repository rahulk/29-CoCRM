"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncReviews = void 0;
const functions = require("firebase-functions");
const googleapis_1 = require("googleapis");
const firebase_1 = require("../../config/firebase");
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GMB_CLIENT_ID, process.env.GMB_CLIENT_SECRET, process.env.GMB_REDIRECT_URI);
// Helper to get authenticated client for a tenant
async function getClientForTenant(tenantId) {
    const doc = await firebase_1.db.doc(`tenants/${tenantId}/integrations/gmb`).get();
    const data = doc.data();
    if (!data || !data.refresh_token)
        return null;
    oauth2Client.setCredentials({
        refresh_token: data.refresh_token
    });
    return { client: oauth2Client, accountId: data.accountId, locations: data.locations };
}
exports.syncReviews = functions.https.onCall(async (request) => {
    // ... auth checks ...
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Auth required");
    const tenantId = request.auth.token.tenant_id;
    // Fetch stored tokens
    const gmbData = await getClientForTenant(tenantId);
    if (!gmbData)
        return { success: false, reason: "Not connected or no locations" };
    const { locations } = gmbData;
    // accountId is also available if needed
    // Initialize API
    // @ts-ignore - types might be outdated in my internal view, but this handles the runtime
    const mybusinessreviews = googleapis_1.google.mybusinessreviews({
        version: 'v1',
        auth: oauth2Client
    });
    // Iterate locations
    let totalSynced = 0;
    for (const location of locations) {
        // location.name is like "locations/12345...""
        const locationName = location.name;
        // Reviews need "accounts/{accountId}/locations/{locationId}"
        // Actually, the new API takes `parent` as the location resource name.
        try {
            const res = await mybusinessreviews.accounts.locations.reviews.list({
                parent: locationName,
                pageSize: 50
            });
            const reviews = res.data.reviews || [];
            // Batch write to Firestore
            const batch = firebase_1.db.batch();
            let opCount = 0;
            for (const review of reviews) {
                const reviewId = review.reviewId;
                const reviewRef = firebase_1.db.doc(`tenants/${tenantId}/reviews/${reviewId}`);
                batch.set(reviewRef, {
                    reviewId: review.reviewId,
                    reviewer: review.reviewer,
                    starRating: review.starRating,
                    comment: review.comment || "",
                    createTime: review.createTime,
                    updateTime: review.updateTime,
                    reviewReply: review.reviewReply || null,
                    locationName: locationName,
                    syncedAt: new Date()
                }, { merge: true });
                opCount++;
            }
            if (opCount > 0) {
                await batch.commit();
            }
            totalSynced += opCount;
        }
        catch (err) {
            console.error(`Error syncing location ${locationName}`, err);
        }
    }
    return { success: true, count: totalSynced };
});
//# sourceMappingURL=syncReviews.js.map