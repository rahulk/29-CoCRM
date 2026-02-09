"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activateTrial = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_1 = require("../config/firebase");
const limits_1 = require("../config/limits");
const rateLimiter_1 = require("../utils/rateLimiter");
const firestore_1 = require("firebase-admin/firestore");
exports.activateTrial = (0, https_1.onCall)({ region: "asia-south1" }, async (request) => {
    // 1. Auth Check - Tenant Admin
    if (!request.auth || !request.auth.token.tenant_id) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { uid } = request.auth;
    const { tenant_id, role } = request.auth.token;
    if (role !== 'tenant_admin') {
        throw new https_1.HttpsError("permission-denied", "Only admins can activate trial.");
    }
    // 2. Rate Limit (User based)
    await (0, rateLimiter_1.checkRateLimit)(firebase_1.db, `user_${uid}_activateTrial`, limits_1.RATE_LIMITS.ACTIVATE_TRIAL.maxCalls, limits_1.RATE_LIMITS.ACTIVATE_TRIAL.windowMs);
    const tenantRef = firebase_1.db.collection("tenants").doc(tenant_id);
    try {
        await firebase_1.db.runTransaction(async (t) => {
            const doc = await t.get(tenantRef);
            if (!doc.exists) {
                throw new https_1.HttpsError("not-found", "Organization not found.");
            }
            const data = doc.data();
            // 3. Precondition Check
            if (data.subscription_status === 'active' || data.subscription_status === 'trial') {
                throw new https_1.HttpsError("failed-precondition", "Trial already activated.");
            }
            if (data.subscription_status === 'suspended') {
                throw new https_1.HttpsError("permission-denied", "Account suspended.");
            }
            // 4. Update Tenant
            const now = firestore_1.Timestamp.now();
            const trialEndsAt = firestore_1.Timestamp.fromMillis(now.toMillis() + (limits_1.QUOTAS.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));
            t.update(tenantRef, {
                subscription_status: 'trial',
                credits_balance: limits_1.QUOTAS.TRIAL_CREDITS,
                trial_ends_at: trialEndsAt,
                onboarding_step: "trial_activated",
                'usage_current.preview_searches_used': 0, // Reset for trial
                updated_at: now,
                updated_by: uid,
            });
            // 5. Create Credit Transaction
            const transactionRef = firebase_1.db.collection("credit_transactions").doc();
            t.set(transactionRef, {
                tenant_id: tenant_id,
                amount: limits_1.QUOTAS.TRIAL_CREDITS,
                reason: "trial_opening_balance",
                reference_id: tenant_id,
                status: "confirmed",
                idempotency_key: `trial_opening_${tenant_id}`,
                timestamp: now,
                created_at: now,
                created_by: uid
            });
        });
        return { success: true };
    }
    catch (error) {
        console.error("Error activating trial:", error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError("internal", "Failed to activate trial.");
    }
});
//# sourceMappingURL=activateTrial.js.map