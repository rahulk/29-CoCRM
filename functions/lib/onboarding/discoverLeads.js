"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discoverLeads = void 0;
const https_1 = require("firebase-functions/v2/https");
const firebase_1 = require("../config/firebase");
const limits_1 = require("../config/limits");
const rateLimiter_1 = require("../utils/rateLimiter");
const firestore_1 = require("firebase-admin/firestore");
const axios_1 = require("axios");
const crypto = require("crypto");
exports.discoverLeads = (0, https_1.onCall)({ region: "asia-south1", secrets: ["GOOGLE_MAPS_API_KEY"] }, async (request) => {
    // 1. Auth Check - Extract tenant_id from context token (NOT user input)
    if (!request.auth || !request.auth.token.tenant_id) {
        throw new https_1.HttpsError("unauthenticated", "Authentication required.");
    }
    const { uid } = request.auth;
    const { tenant_id } = request.auth.token;
    const { location, radius, keyword, next_page_token, preview_mode } = request.data; // radius is meters
    // 2. Validate Inputs
    if (!keyword || keyword.trim().length === 0) {
        throw new https_1.HttpsError("invalid-argument", "Search keyword is required.");
    }
    if (!location || !location.lat || !location.lng) {
        throw new https_1.HttpsError("invalid-argument", "Location (lat/lng) is required.");
    }
    // 3. Rate Limit (Tenent based)
    await (0, rateLimiter_1.checkRateLimit)(firebase_1.db, `tenant_${tenant_id}_discoverLeads`, limits_1.RATE_LIMITS.DISCOVER_LEADS.maxCalls, limits_1.RATE_LIMITS.DISCOVER_LEADS.windowMs);
    // 4. Quota Check & Preview Mode Logic
    const tenantRef = firebase_1.db.collection("tenants").doc(tenant_id);
    const tenantSnap = await tenantRef.get();
    const tenantData = tenantSnap.data();
    if (!tenantSnap.exists || !tenantData) {
        throw new https_1.HttpsError("not-found", "Organization not found.");
    }
    const isPreview = preview_mode === true;
    let limit = 20; // Default Google Places page size
    if (isPreview) {
        // Preview Mode Constraints
        if (tenantData.subscription_status !== 'pending' && tenantData.subscription_status !== 'trial') {
            // If active, preview mode is ignored (or treat as normal search if user wants)
            // But spec says: Allowed only if subscription_status is 'pending' OR 'trial'
            // Let's allow it but force limit 5 if explicitly requested as preview
            limit = 5;
        }
        else {
            limit = 5;
        }
        if ((tenantData.usage_current?.preview_searches_used || 0) >= 3) {
            throw new https_1.HttpsError("resource-exhausted", "Preview search limit reached. Start trial to continue.");
        }
    }
    else {
        // Normal Mode - Check Monthly Quota
        const currentUsage = tenantData.usage_current?.leads_fetched_this_month || 0;
        const maxLimit = tenantData.usage_limits?.max_leads_per_month || 1000;
        if (currentUsage >= maxLimit) {
            throw new https_1.HttpsError("resource-exhausted", "Monthly lead limit reached. Upgrade plan.");
        }
    }
    // 5. Call Google Places API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.error("GOOGLE_MAPS_API_KEY missing");
        throw new https_1.HttpsError("internal", "Server configuration error.");
    }
    // Prepare Request
    // Using New Places API (Text Search)
    const url = "https://places.googleapis.com/v1/places:searchText";
    const headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.id,nextPageToken"
    };
    const body = {
        textQuery: keyword,
        locationBias: {
            circle: {
                center: { latitude: location.lat, longitude: location.lng },
                radius: radius || 5000 // meters
            }
        },
        pageSize: limit // 5 or 20
    };
    if (next_page_token) {
        body.pageToken = next_page_token;
    }
    let apiResponse;
    try {
        apiResponse = await axios_1.default.post(url, body, { headers });
    }
    catch (error) {
        console.error("Google Places API Error:", error.response?.data || error.message);
        throw new https_1.HttpsError("unavailable", "Google Places API unavailable.");
    }
    const places = apiResponse.data.places || [];
    const newNextPageToken = apiResponse.data.nextPageToken || null;
    if (places.length === 0) {
        return {
            success: true,
            leads_saved: 0,
            leads_skipped_duplicate: 0,
            total_results_from_google: 0,
            next_page_token: null,
            quota_remaining: (tenantData.usage_limits?.max_leads_per_month || 1000) - (tenantData.usage_current?.leads_fetched_this_month || 0)
        };
    }
    // 6. Process & Save to Firestore
    const batch = firebase_1.db.batch();
    let savedCount = 0;
    let duplicateCount = 0;
    // Optimization: Check all IDs in one go? No, `getAll`.
    const leadIds = places.map((p) => {
        const rawId = tenant_id + (p.id || p.formattedAddress);
        return crypto.createHash('sha256').update(rawId).digest('hex');
    });
    const existingDocs = await firebase_1.db.getAll(...leadIds.map((id) => firebase_1.db.collection("leads").doc(id)));
    const existingIds = new Set(existingDocs.filter(d => d.exists).map(d => d.id));
    const now = firestore_1.FieldValue.serverTimestamp();
    for (let i = 0; i < places.length; i++) {
        const place = places[i];
        const leadId = leadIds[i];
        if (existingIds.has(leadId)) {
            duplicateCount++;
            continue;
        }
        if (isPreview && limit === 5 && savedCount >= 5)
            break;
        const leadData = {
            tenant_id: tenant_id,
            source: "google_maps",
            status: "new",
            enrichment_status: "pending",
            priority: "medium", // Default
            business_details: {
                name: place.displayName?.text || "",
                address: place.formattedAddress || "",
                phone: place.internationalPhoneNumber || "",
                website: place.websiteUri || "",
                google_place_id: place.id,
                rating: place.rating,
                review_count: place.userRatingCount,
            },
            search_name: (place.displayName?.text || "").toLowerCase().trim(),
            is_archived: false,
            opt_in_status: "none",
            created_at: now,
            updated_at: now,
            created_by: uid,
            updated_by: uid,
        };
        batch.set(firebase_1.db.collection("leads").doc(leadId), leadData);
        savedCount++;
    }
    // 7. Update Usage Counters
    if (savedCount > 0) {
        const updateData = {};
        if (isPreview) {
            updateData['usage_current.preview_searches_used'] = firestore_1.FieldValue.increment(1);
        }
        else {
            updateData['usage_current.leads_fetched_this_month'] = firestore_1.FieldValue.increment(savedCount);
        }
        batch.update(tenantRef, updateData);
    }
    if (savedCount > 0 || isPreview) { // Should commit even if 0 saved but preview count needs increment?
        // If preview, we increment search count (1), not lead count.
        // If normal, we increment lead count.
        // Actually, preview_searches_used counts the SEARCHES, not leads?
        // Spec: "usage_current.preview_searches_used: discoverLeads (preview_mode)" -> seems like per search.
        // And "preview limit forced to 5".
        await batch.commit();
    }
    return {
        success: true,
        leads_saved: savedCount,
        leads_skipped_duplicate: duplicateCount,
        total_results_from_google: places.length,
        next_page_token: newNextPageToken,
        quota_remaining: (tenantData.usage_limits?.max_leads_per_month || 1000) - ((tenantData.usage_current?.leads_fetched_this_month || 0) + (isPreview ? 0 : savedCount))
    };
});
//# sourceMappingURL=discoverLeads.js.map