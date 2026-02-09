import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { db } from "../config/firebase";
import { Msg91Adapter } from "../providers/messaging/msg91Adapter";
import { WhatsAppPayload } from "../providers/messaging/IMessagingProvider";

const msg91 = new Msg91Adapter();

// Hardcoded cost for now, can be fetched from config
const WHATSATSAPP_COST = 1.0;

export const sendWhatsapp = functions.https.onCall(async (request) => {
    // 1. Auth Check
    if (!request.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
    }

    // 2. Validate Payload
    const { leadId, templateName, templateData, attachments } = request.data;
    if (!leadId || !templateName) {
        throw new functions.https.HttpsError("invalid-argument", "Missing leadId or templateName");
    }

    const tenantId = request.auth.token.tenant_id;
    if (!tenantId) {
        throw new functions.https.HttpsError("failed-precondition", "User has no tenantId");
    }

    const leadRef = db.doc(`tenants/${tenantId}/leads/${leadId}`);
    const tenantRef = db.doc(`tenants/${tenantId}`);

    // 3. Transaction for Credit Check & Deduction
    return await db.runTransaction(async (transaction) => {
        // Read Phase
        const leadSnap = await transaction.get(leadRef);
        if (!leadSnap.exists) {
            throw new functions.https.HttpsError("not-found", "Lead not found");
        }
        const lead = leadSnap.data();
        if (!lead?.phone) {
            throw new functions.https.HttpsError("failed-precondition", "Lead has no phone number");
        }

        const tenantSnap = await transaction.get(tenantRef);
        const tenant = tenantSnap.data();

        const currentBalance = tenant?.credits_balance || 0;

        if (currentBalance < WHATSATSAPP_COST) {
            throw new functions.https.HttpsError("resource-exhausted", "Insufficient credits");
        }

        // Write Phase 1: Deduct Credits & Create Pending Transaction
        const transactionRef = tenantRef.collection("credit_transactions").doc();
        const interactionRef = tenantRef.collection("interactions").doc();

        // Deduct
        transaction.update(tenantRef, {
            credits_balance: admin.firestore.FieldValue.increment(-WHATSATSAPP_COST)
        });

        // Log Credit Transaction
        transaction.set(transactionRef, {
            amount: -WHATSATSAPP_COST,
            type: "usage",
            description: `WhatsApp to ${lead.name || lead.phone}`,
            reference_id: interactionRef.id, // Link to interaction
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            created_by: request.auth?.uid
        });

        // Create Interaction (Pending)
        transaction.set(interactionRef, {
            type: "whatsapp_outbound",
            lead_id: leadId,
            lead_name: lead.name || "Unknown",
            content: `Template: ${templateName}`, // We might want more detail here later
            status: "sending",
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            created_by: request.auth?.uid,
            metadata: {
                templateName,
                templateData,
                cost: WHATSATSAPP_COST,
                transactionId: transactionRef.id
            }
        });

        return { interactionId: interactionRef.id, phone: lead.phone, leadName: lead.name };
    }).then(async (result) => {
        // 4. Send Message (Outside Transaction)
        const { interactionId, phone, leadName } = result;

        try {
            // Inject standard data like name/phone into templateData if not present
            const safeTemplateData = {
                name: leadName,
                phone: phone,
                ...templateData
            };

            const payload: WhatsAppPayload = {
                phone: phone,
                templateName: templateName,
                templateData: safeTemplateData,
                attachments: attachments
            };

            const response = await msg91.sendWhatsApp(payload);

            // 5. Update Status based on result
            await db.doc(`tenants/${tenantId}/interactions/${interactionId}`).update({
                status: response.success ? "sent" : "failed",
                "metadata.provider_id": response.messageId || null,
                "metadata.error": response.error || null,
                "metadata.raw_response": response.rawResponse || null
            });

            if (!response.success) {
                // Refund logic could go here, but for now we log failure. 
                // Ideally we initiate a refund transaction.
                console.error("WhatsApp Send Failed, need refund logic:", response.error);
                // TODO: Implement Refund Transaction
            }

            return { success: response.success, interactionId };

        } catch (error: any) {
            console.error("Critical Message Failure:", error);
            // Update interaction to failed
            await db.doc(`tenants/${tenantId}/interactions/${interactionId}`).update({
                status: "failed",
                "metadata.error": error.message
            });
            throw new functions.https.HttpsError("internal", "Failed to send message downstream");
        }
    });
});
