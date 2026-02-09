"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replyToReview = void 0;
const functions = require("firebase-functions");
const googleapis_1 = require("googleapis");
const firebase_1 = require("../../config/firebase");
const oauth2Client = new googleapis_1.google.auth.OAuth2(process.env.GMB_CLIENT_ID, process.env.GMB_CLIENT_SECRET, process.env.GMB_REDIRECT_URI);
exports.replyToReview = functions.https.onCall(async (request) => {
    if (!request.auth)
        throw new functions.https.HttpsError("unauthenticated", "Auth required");
    const { tenantId } = request.auth.token;
    const { reviewId, replyText, locationName } = request.data;
    // locationName is resource name: locations/xxx
    if (!replyText)
        throw new functions.https.HttpsError("invalid-argument", "Reply text required");
    // Fetch tokens
    const docSnap = await firebase_1.db.doc(`tenants/${tenantId}/integrations/gmb`).get();
    const data = docSnap.data();
    if (!data?.refresh_token) {
        throw new functions.https.HttpsError("failed-precondition", "GMB not connected");
    }
    oauth2Client.setCredentials({ refresh_token: data.refresh_token });
    // Initialize API
    // @ts-ignore
    const mybusinessreviews = googleapis_1.google.mybusinessreviews({
        version: 'v1',
        auth: oauth2Client
    });
    try {
        // Construct parent for the review
        // API format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}/reply
        // BUT `locationName` is `locations/{locationId}` or `accounts/{accountId}/locations/{locationId}` depending on how we stored it.
        // Assuming we stored the full resource name in syncReviews.
        // Wait, list reviews takes `parent` as location.
        // But `reply` operation is on the `review` resource name + `/reply`?
        // Actually, looking at discovery docs: PUT {name}/reply
        // where name is accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
        // So we need the full review resource name.
        // In syncReviews, `review.name` (not reviewId) holds this.
        // Let's assume frontend sends us the stored Firestore doc which should have `name`.
        // If not, we construct it.
        // Let's look up the stored review to be safe
        const reviewDoc = await firebase_1.db.doc(`tenants/${tenantId}/reviews/${reviewId}`).get();
        const reviewData = reviewDoc.data();
        if (!reviewData)
            throw new functions.https.HttpsError("not-found", "Review not found in DB");
        const reviewResourceName = reviewData.name || `${locationName}/reviews/${reviewId}`; // Fallback if we didn't store name
        await mybusinessreviews.accounts.locations.reviews.updateReply({
            name: `${reviewResourceName}/reply`,
            requestBody: {
                comment: replyText
            }
        });
        // Update local DB
        await reviewDoc.ref.update({
            "reviewReply.comment": replyText,
            "reviewReply.updateTime": new Date().toISOString()
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error replying to review:", error);
        throw new functions.https.HttpsError("internal", error.message);
    }
});
//# sourceMappingURL=replyToReview.js.map