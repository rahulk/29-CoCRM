
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { db } from "../config/firebase";
import axios from "axios";

export const handleApifyWebhook = onRequest({
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

        const response = await axios.get(datasetUrl);
        const items = response.data;

        if (!Array.isArray(items)) {
            res.status(200).send("No items");
            return;
        }

        const batch = db.batch();
        let updateCount = 0;

        for (const item of items) {
            const url = item.url || item.inputUrl;
            if (!url) continue;

            // Find lead by website
            const leadsRef = db.collection("leads");
            const q = leadsRef.where("business_details.website", "==", url).where("enrichment_status", "==", "processing").limit(1);
            const snap = await q.get();

            if (snap.empty) continue;
            const leadDoc = snap.docs[0];
            const leadId = leadDoc.id;

            // Extract emails and socials
            const emails = item.emails?.map((e: any) => e.address || e) || [];
            const socials = item.socialProfiles?.map((s: any) => s.url || s) || [];

            const email = emails[0] || null;
            const socialMap: any = {};
            socials.forEach((s: string) => {
                if (s.includes("facebook")) socialMap.facebook = s;
                if (s.includes("instagram")) socialMap.instagram = s;
                if (s.includes("linkedin")) socialMap.linkedin = s;
                if (s.includes("twitter") || s.includes("x.com")) socialMap.twitter = s;
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

    } catch (error) {
        console.error("Webhook Error", error);
        res.status(500).send("Processing Failed");
    }
});
