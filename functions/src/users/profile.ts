import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { FieldValue } from "firebase-admin/firestore";

interface UpdateProfileData {
    name?: string;
    phone?: string;
}

export const updateUserProfile = onCall({ region: "asia-south1" }, async (request) => {
    // Ensure the user is authenticated
    if (!request.auth) {
        throw new HttpsError(
            "unauthenticated",
            "The function must be called while authenticated."
        );
    }

    const { uid } = request.auth;
    const data = request.data as UpdateProfileData;

    // Validate input
    if (!data || (typeof data !== "object")) {
        throw new HttpsError("invalid-argument", "The function must be called with one argument.");
    }

    // Sanitize and prepare update object
    const updates: Record<string, any> = {
        updated_at: FieldValue.serverTimestamp(),
        updated_by: uid,
    };

    if (Object.prototype.hasOwnProperty.call(data, 'name')) {
        if (typeof data.name !== "string" || data.name.trim().length === 0) {
            throw new HttpsError("invalid-argument", "Name must be a non-empty string.");
        }
        updates.name = data.name.trim();
    }

    if (Object.prototype.hasOwnProperty.call(data, 'phone')) {
        if (typeof data.phone !== "string") {
            throw new HttpsError("invalid-argument", "Phone must be a string.");
        }
        updates.phone = data.phone.trim();
    }

    try {
        // Update the user document in Firestore
        await db.collection("users").doc(uid).set(updates, { merge: true });
        return { success: true };
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw new HttpsError("internal", "Unable to update profile.");
    }
});
