import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "../config/firebase";
import { RATE_LIMITS, QUOTAS } from "../config/limits";
import { checkRateLimit } from "../utils/rateLimiter";
import { Timestamp } from "firebase-admin/firestore";

export const activateTrial = onCall({ region: "asia-south1" }, async (request) => {
    // 1. Auth Check - Tenant Admin
    if (!request.auth || !request.auth.token.tenant_id) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { uid } = request.auth;
    const { tenant_id, role } = request.auth.token;

    if (role !== 'tenant_admin') {
        throw new HttpsError("permission-denied", "Only admins can activate trial.");
    }

    // 2. Rate Limit (User based)
    await checkRateLimit(db, `user_${uid}_activateTrial`, RATE_LIMITS.ACTIVATE_TRIAL.maxCalls, RATE_LIMITS.ACTIVATE_TRIAL.windowMs);

    const tenantRef = db.collection("tenants").doc(tenant_id);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(tenantRef);
            if (!doc.exists) {
                throw new HttpsError("not-found", "Organization not found.");
            }

            const data = doc.data()!;

            // 3. Precondition Check
            if (data.subscription_status === 'active' || data.subscription_status === 'trial') {
                throw new HttpsError("failed-precondition", "Trial already activated.");
            }
            if (data.subscription_status === 'suspended') {
                throw new HttpsError("permission-denied", "Account suspended.");
            }

            // 4. Update Tenant
            const now = Timestamp.now();
            const trialEndsAt = Timestamp.fromMillis(now.toMillis() + (QUOTAS.TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000));

            t.update(tenantRef, {
                subscription_status: 'trial',
                credits_balance: QUOTAS.TRIAL_CREDITS,
                trial_ends_at: trialEndsAt,
                onboarding_step: "trial_activated",
                'usage_current.preview_searches_used': 0, // Reset for trial
                updated_at: now,
                updated_by: uid,
            });

            // 5. Create Credit Transaction
            const transactionRef = db.collection("credit_transactions").doc();
            t.set(transactionRef, {
                tenant_id: tenant_id,
                amount: QUOTAS.TRIAL_CREDITS,
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

    } catch (error: any) {
        console.error("Error activating trial:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "Failed to activate trial.");
    }
});
