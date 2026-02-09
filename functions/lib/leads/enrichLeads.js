"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enrichLeads = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firebase_1 = require("../config/firebase");
const apify_1 = require("../services/apify");
// import { checkRateLimit } from "../utils/rateLimiter"; // Unused for now or we should use it? Plan mentioned it.
// Configuration
const REQUIRED_CREDITS = 50; // Cost per enrichment
const ACTOR_ID = "apify/contact-detail-scraper"; // Default actor
exports.enrichLeads = (0, https_1.onCall)({
    region: "asia-south1",
    secrets: ["APIFY_TOKEN"]
}, async (request) => {
    // 1. Auth Check
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "User must be logged in.");
    }
    const tenantId = request.auth.token.tenant_id;
    if (!tenantId) {
        throw new https_1.HttpsError("permission-denied", "User must belong to a tenant.");
    }
    const { leadIds } = request.data;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
        throw new https_1.HttpsError("invalid-argument", "leadIds array is required.");
    }
    const apifyToken = process.env.APIFY_TOKEN;
    if (!apifyToken) {
        throw new https_1.HttpsError("failed-precondition", "Apify configuration missing.");
    }
    const tenantRef = firebase_1.db.doc(`tenants/${tenantId}`);
    // 2. Transaction for Credits & Validation
    const validLeads = [];
    // Fetch leads (Optimization: Do in chunks if many leads)
    const leadsRef = firebase_1.db.collection("leads");
    // Limit to 30 for safety in one batch
    const leadsSnap = await leadsRef.where(admin.firestore.FieldPath.documentId(), "in", leadIds.slice(0, 30)).get();
    leadsSnap.forEach(doc => {
        const d = doc.data();
        if (d.tenant_id === tenantId) {
            if (d.business_details?.website && d.enrichment_status !== 'completed' && d.enrichment_status !== 'processing') {
                validLeads.push({ id: doc.id, ...d });
            }
        }
    });
    if (validLeads.length === 0) {
        return { success: true, message: "No eligible leads found for enrichment (must have website and not be completed)." };
    }
    const totalCost = validLeads.length * REQUIRED_CREDITS;
    // 3. Deduct Credits
    await firebase_1.db.runTransaction(async (t) => {
        const tDoc = await t.get(tenantRef);
        if (!tDoc.exists)
            throw new https_1.HttpsError("not-found", "Tenant not found during transaction.");
        const tData = tDoc.data();
        // Check balance
        if ((tData?.credits_balance || 0) < totalCost) {
            throw new https_1.HttpsError("resource-exhausted", `Insufficient credits. Need ${totalCost}.`);
        }
        // Deduct
        t.update(tenantRef, {
            credits_balance: admin.firestore.FieldValue.increment(-totalCost),
            "usage_current.enrichments_this_month": admin.firestore.FieldValue.increment(validLeads.length),
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_by: request.auth.uid
        });
        // Create Transaction Records
        const now = admin.firestore.Timestamp.now();
        validLeads.forEach(lead => {
            const transactionRef = firebase_1.db.collection("credit_transactions").doc();
            t.set(transactionRef, {
                tenant_id: tenantId,
                amount: -REQUIRED_CREDITS,
                reason: "lead_enrichment",
                reference_id: lead.id,
                status: "confirmed",
                timestamp: now,
                created_at: now,
                created_by: request.auth.uid
            });
            // Update Lead Status to 'processing'
            t.update(leadsRef.doc(lead.id), {
                enrichment_status: "processing",
                updated_at: now
            });
        });
    });
    // 4. Call Apify (Async)
    const startUrls = validLeads.map(lead => ({
        url: lead.business_details.website,
        userData: {
            leadId: lead.id,
            tenantId: tenantId
        }
    }));
    try {
        const run = await (0, apify_1.startApifyRun)(ACTOR_ID, {
            startUrls: startUrls,
            maxCrawlingDepth: 0,
            maxConcurrency: 5,
        }, apifyToken);
        return {
            success: true,
            enriched_count: validLeads.length,
            apify_run_id: run.id
        };
    }
    catch (apiError) {
        console.error("Apify Start Error", apiError);
        throw new https_1.HttpsError("internal", "Failed to start enrichment process.");
    }
});
//# sourceMappingURL=enrichLeads.js.map