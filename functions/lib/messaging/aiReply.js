"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiReply = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
exports.aiReply = (0, firestore_1.onDocumentCreated)("tenants/{tenantId}/interactions/{interactionId}", async (event) => {
    const snap = event.data;
    if (!snap)
        return;
    const interaction = snap.data();
    // Only trigger on inbound whatsapp messages
    if (interaction.type !== "whatsapp_inbound")
        return;
    console.log("AI Reply Triggered for:", interaction.lead_id);
    // TODO: scalable RAG implementation
    // 1. Fetch Lead context
    // 2. Fetch recent history
    // 3. Fetch Knowledge Base (Brochures)
    // 4. Generate Gemini response
    // 5. Store as DRAFT interaction (type: 'ai_draft')
    // For Phase 3.1, we just placeholder this.
    return Promise.resolve();
});
//# sourceMappingURL=aiReply.js.map