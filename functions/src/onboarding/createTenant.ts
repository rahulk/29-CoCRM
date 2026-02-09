import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, auth } from "../config/firebase";
import { RATE_LIMITS } from "../config/limits";
import { checkRateLimit } from "../utils/rateLimiter";
import { FieldValue } from "firebase-admin/firestore";

export const createTenant = onCall({ region: "asia-south1" }, async (request) => {
    // 1. Auth Check (User must be signed in, but not yet have a tenant)
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { uid } = request.auth;
    const { company_name, city, admin_name } = request.data;
    const ip = request.rawRequest.ip || 'unknown';

    // 2. Validate Inputs
    if (!company_name || company_name.trim().length < 2) {
        throw new HttpsError("invalid-argument", "Company name is required (min 2 chars).");
    }
    if (!city || city.trim().length === 0) {
        throw new HttpsError("invalid-argument", "City is required.");
    }
    if (!admin_name || admin_name.trim().length < 2) {
        throw new HttpsError("invalid-argument", "Admin name is required.");
    }

    // 3. Rate Limit (IP based)
    await checkRateLimit(db, `ip_${ip}_createTenant`, RATE_LIMITS.CREATE_TENANT.maxCalls, RATE_LIMITS.CREATE_TENANT.windowMs);

    // 4. Check if user already has a tenant (from custom claims or DB)
    if (request.auth.token.tenant_id) {
        throw new HttpsError("already-exists", "User already belongs to an organization.");
    }

    // Double check DB in case token is stale
    const userDocRef = db.collection("users").doc(uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists && userDoc.data()?.tenant_id) {
        throw new HttpsError("already-exists", "User already belongs to an organization.");
    }

    // 5. Create Tenant and User
    const tenantRef = db.collection("tenants").doc();
    const tenantId = tenantRef.id;

    const now = FieldValue.serverTimestamp();
    const business_type = request.data.business_type || 'b2c_product'; // Default fallback

    // Default configuration based on business type
    const getDefaults = (type: string) => {
        switch (type) {
            case 'b2b_product': // e.g. Furniture Wholesaler
                return {
                    health_thresholds: { green_days: 30, yellow_days: 60 }, // Long cycle
                    quick_replies: [
                        { label: 'Product Catalog', message: 'Hi! Here is our latest product catalog: [LINK]. Let me know if you need bulk pricing.' },
                        { label: 'Follow Up', message: 'Hi! Just checking if you had a chance to review the catalog? We have stock available.' }
                    ]
                };
            case 'b2c_service': // e.g. Gym/Coaching
                return {
                    health_thresholds: { green_days: 7, yellow_days: 14 }, // Short cycle (urgency)
                    quick_replies: [
                        { label: 'Trial Offer', message: 'Hi! We have a free trial class this week. Would you like to book a slot?' },
                        { label: 'Pricing Info', message: 'Hi! Here are our membership packages: [LINK]. We have a 10% discount valid until Sunday.' }
                    ]
                };
            case 'b2b_service': // e.g. Agency
                return {
                    health_thresholds: { green_days: 14, yellow_days: 45 },
                    quick_replies: [
                        { label: 'Service Deck', message: 'Hi! Here is our capability deck: [LINK]. When is a good time to discuss?' },
                        { label: 'Meeting Request', message: 'Hi! Are you free for a quick 10min call tomorrow to discuss your requirements?' }
                    ]
                };
            case 'b2c_product': // e.g. Retail Store
            default:
                return {
                    health_thresholds: { green_days: 7, yellow_days: 30 },
                    quick_replies: [
                        { label: 'New Arrival', message: 'Hi! We just got some new stock you might like. Check it out here: [LINK]' },
                        { label: 'Sale Alert', message: 'Hi! We are running a 20% off sale this weekend. Hope to see you!' }
                    ]
                };
        }
    };

    const defaults = getDefaults(business_type);

    const tenantData = {
        company_name: company_name.trim(),
        subscription_status: "pending", // Trial not started yet
        credits_balance: 0,
        config: {
            target_city: city.trim(),
            business_type: business_type,
            health_thresholds: defaults.health_thresholds,
            quick_replies: defaults.quick_replies
        },
        usage_limits: {
            max_leads_per_month: 1000,
            max_whatsapp_msgs_daily: 500,
        },
        usage_current: {
            leads_fetched_this_month: 0,
            whatsapp_sent_today: 0,
            preview_searches_used: 0,
        },
        onboarding_step: "company_created",
        created_at: now,
        updated_at: now,
        created_by: uid,
        updated_by: uid,
    };

    const userData = {
        tenant_id: tenantId,
        role: "tenant_admin",
        name: admin_name.trim(),
        email: request.auth.token.email || "",
        is_active: true,
        permissions: {
            can_manage_team: true,
            can_manage_billing: true,
            can_export_data: true,
        },
        created_at: now,
        updated_at: now,
        created_by: uid,
        updated_by: uid,
    };

    try {
        await db.runTransaction(async (t) => {
            t.set(tenantRef, tenantData);
            t.set(userDocRef, userData, { merge: true });
        });

        // 6. Set Custom Claims
        await auth.setCustomUserClaims(uid, {
            tenant_id: tenantId,
            role: "tenant_admin",
        });

        return { success: true, tenant_id: tenantId };
    } catch (error) {
        console.error("Error creating tenant:", error);
        throw new HttpsError("internal", "Failed to create organization.");
    }
});
