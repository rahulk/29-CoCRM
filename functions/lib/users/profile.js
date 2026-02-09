"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_1 = require("../config/firebase");
const firestore_1 = require("firebase-admin/firestore");
exports.updateUserProfile = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    // Ensure the user is authenticated
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { uid } = request.auth;
    const data = request.data;
    // Validate input
    if (!data || (typeof data !== "object")) {
        throw new https_1.HttpsError("invalid-argument", "The function must be called with one argument.");
    }
    // Sanitize and prepare update object
    const updates = {
        updated_at: firestore_1.FieldValue.serverTimestamp(),
        updated_by: uid,
    };
    if (Object.prototype.hasOwnProperty.call(data, 'name')) {
        if (typeof data.name !== "string" || data.name.trim().length === 0) {
            throw new https_1.HttpsError("invalid-argument", "Name must be a non-empty string.");
        }
        updates.name = data.name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(data, 'phone')) {
        if (typeof data.phone !== "string") {
            throw new https_1.HttpsError("invalid-argument", "Phone must be a string.");
        }
        updates.phone = data.phone.trim();
    }
    try {
        // Update the user document in Firestore
        await firebase_1.db.collection("users").doc(uid).set(updates, { merge: true });
        return { success: true };
    }
    catch (error) {
        console.error("Error updating user profile:", error);
        throw new https_1.HttpsError("internal", "Unable to update profile.");
    }
});
//# sourceMappingURL=profile.js.map