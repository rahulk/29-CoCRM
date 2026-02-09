import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db } from "../config/firebase";

export const handleInboundMessage = functions.https.onRequest(async (req, res) => {
    // MSG91 Webhook Payload parsing
    try {
        const body = req.body;
        console.log("Inbound Webhook:", JSON.stringify(body));

        // Msg91 Structure: { sidebar_data: {...}, sender: { phone: "..." }, content: "..." } ??
        // Need to check actual Msg91 inbound payload structure.
        // Assuming standard structure or based on docs if available.
        // Common MSG91 inbound:
        // {
        //   "sender": "919999999999",
        //   "content": "Hello",
        //   "type": "text", ...
        // }
        // Let's assume a generic handler for now and log it.

        // Extract phone and content
        // This is highly dependent on provider format.
        // For now, prompt-driven development assumes we might need to adjust this later.

        let phone = body?.sender?.phone || body?.from; // Adjust based on actual payload
        const content = body?.content?.text || body?.text || body?.content;

        if (!phone || !content) {
            console.warn("Invalid webhook payload", body);
            res.status(200).send("Ignored");
            return;
        }

        // Normalize phone (remove 91 prefix if needed, or match fuzzy)
        // Assume database stores typically with country code or without?
        // Let's assume we store as is or standardized.

        // Find Tenant? 
        // Inbound hooks are usually global unless configured per number.
        // If we use one integrated number for ALL tenants, we have a problem identifying the tenant 
        // unless the user is already in a tenant's lead list.
        // We must search ALL leads index? Or have a `leads_index` collection map phone -> tenantId.

        // For MVP/Dev: Assume Single Tenant or search.
        // Let's search across all tenants (expensive) OR use a dedicated lookup.
        // Since we don't have a lookup table yet, we might skip tenant resolution for now 
        // OR just log it to a global `failed_inbounds` if not found.

        // BUT: If the user replies to a message we sent, we can try to find the active conversation?

        // Strategy: Collection Group Query on 'leads' where phone == incoming.
        const leadsQuery = await db.collectionGroup("leads").where("phone", "==", phone).limit(1).get();

        if (leadsQuery.empty) {
            console.log("No lead found for inbound message:", phone);
            // Optional: Create new lead in a default 'Unassigned' bucket or tenant?
            res.status(200).send("No lead found");
            return;
        }

        const leadDoc = leadsQuery.docs[0];
        const lead = leadDoc.data();
        const tenantRef = leadDoc.ref.parent.parent;

        if (!tenantRef) {
            res.status(200).send("Orphaned lead");
            return;
        }

        const interactionRef = tenantRef.collection("interactions").doc();

        await interactionRef.set({
            type: "whatsapp_inbound",
            lead_id: leadDoc.id,
            lead_name: lead.name || "Unknown",
            content: content,
            status: "received",
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            metadata: {
                raw_payload: body
            }
        });

        // Update Lead's last_interaction
        await leadDoc.ref.update({
            last_interaction_at: admin.firestore.FieldValue.serverTimestamp(),
            last_interaction_type: "whatsapp_inbound",
            unread_count: admin.firestore.FieldValue.increment(1)
        });

        res.status(200).send("Processed");

    } catch (err) {
        console.error("Webhook Error:", err);
        res.status(500).send("Error");
    }
});
