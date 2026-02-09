"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleApifyWebhook = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const firebase_1 = require("../config/firebase");
const axios_1 = require("axios");
exports.handleApifyWebhook = (0, https_1.onRequest)({
    region: "asia-south1",
    secrets: ["APIFY_TOKEN"]
}, async (req, res) => {
    // 1. Validation 
    const { eventType, resource } = req.body;
    if (eventType !== "ACTOR.RUN.SUCCEEDED" && eventType !== "ACTOR.RUN.FAILED" && eventType !== "ACTOR.RUN.TIMED_OUT") {
        res.status(200).send("Ignored event type");
        return;
    }
    const defaultDatasetId = resource?.defaultDatasetId;
    const apifyToken = process.env.APIFY_TOKEN;
    if (!apifyToken || !defaultDatasetId) {
        console.error("Missing Apify Token or Dataset ID");
        res.status(500).send("Config Error");
        return;
    }
    try {
        // Fetch dataset items
        const datasetUrl = `https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${apifyToken}&clean=true`;
        const response = await axios_1.default.get(datasetUrl);
        const items = response.data;
        if (!Array.isArray(items)) {
            res.status(200).send("No items");
            return;
        }
        const batch = firebase_1.db.batch();
        let updateCount = 0;
        for (const item of items) {
            const url = item.url || item.inputUrl;
            if (!url)
                continue;
            // Find lead by website
            const leadsRef = firebase_1.db.collection("leads");
            const q = leadsRef.where("business_details.website", "==", url).where("enrichment_status", "==", "processing").limit(1);
            const snap = await q.get();
            if (snap.empty)
                continue;
            const leadDoc = snap.docs[0];
            const leadId = leadDoc.id;
            // Extract emails and socials
            const emails = item.emails?.map((e) => e.address || e) || [];
            const socials = item.socialProfiles?.map((s) => s.url || s) || [];
            const email = emails[0] || null;
            const socialMap = {};
            socials.forEach((s) => {
                if (s.includes("facebook"))
                    socialMap.facebook = s;
                if (s.includes("instagram"))
                    socialMap.instagram = s;
                if (s.includes("linkedin"))
                    socialMap.linkedin = s;
                if (s.includes("twitter") || s.includes("x.com"))
                    socialMap.twitter = s;
            });
            batch.update(leadsRef.doc(leadId), {
                "contact_details.email": email,
                "contact_details.social": socialMap,
                enrichment_status: "completed",
                ai_analysis: {
                    enrichment_data: item
                },
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            updateCount++;
        }
        if (updateCount > 0) {
            await batch.commit();
        }
        res.status(200).send(`Processed ${updateCount} items`);
    }
    catch (error) {
        console.error("Webhook Error", error);
        res.status(500).send("Processing Failed");
    }
});
//# sourceMappingURL=handleApifyWebhook.js.map