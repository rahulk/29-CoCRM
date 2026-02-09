"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreLead = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const vertexai_1 = require("@google-cloud/vertexai");
const firebase_1 = require("../config/firebase");
// Initialize Vertex AI
const vertexAI = new vertexai_1.VertexAI({ project: process.env.GCLOUD_PROJECT, location: "us-central1" });
const model = vertexAI.getGenerativeModel({ model: "gemini-1.5-flash-preview-0514" });
exports.scoreLead = (0, firestore_1.onDocumentUpdated)({
    region: "asia-south1",
    document: "leads/{leadId}",
    secrets: ["VERTEX_AI_PROJECT_ID"]
}, async (event) => {
    // Check if event.data exists (it might be undefined if delete, but onUpdate implies it exists)
    if (!event.data)
        return;
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    // Idempotency: Only run if enrichment_status changed to 'completed'
    if (!newData || !oldData || (oldData.enrichment_status === 'completed' || newData.enrichment_status !== 'completed')) {
        return;
    }
    const leadId = event.params.leadId;
    console.log(`Scoring lead: ${leadId}`);
    // Construct Prompt
    const business = newData.business_details || {};
    const contact = newData.contact_details || {};
    const rawEnrichment = newData.ai_analysis?.enrichment_data || {};
    const prompt = `
        Analyze this lead for a Study Center CRM.
        Rate the lead from 0 to 100 based on likelihood to buy a CRM.
        Factors:
        - Has Website: ${!!business.website}
        - Has Email: ${!!contact.email}
        - Has Socials: ${!!contact.social}
        - Rating: ${business.rating} (${business.review_count} reviews)
        
        Business Name: ${business.name}
        Description (if any): ${rawEnrichment.description || 'N/A'}
        
        Return JSON only:
        {
            "score": number,
            "priority": "High" | "Medium" | "Low",
            "summary": "Short 1-sentence reason",
            "suggested_tags": ["tag1", "tag2"]
        }
    `;
    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.candidates?.[0].content.parts[0].text;
        if (!text)
            throw new Error("No response from Vertex AI");
        // Parse valid JSON from markdown block if present
        const jsonStr = text.replace(/```json\n?|\n?```/g, "").trim();
        const analysis = JSON.parse(jsonStr);
        await firebase_1.db.collection("leads").doc(leadId).update({
            "ai_analysis.score": analysis.score,
            "ai_analysis.priority": analysis.priority,
            "ai_analysis.summary": analysis.summary,
            "ai_analysis.tags": analysis.suggested_tags,
            priority: analysis.priority, // Promoted field for sorting
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Lead ${leadId} scored: ${analysis.score}`);
    }
    catch (error) {
        console.error("Vertex AI Error", error);
    }
});
//# sourceMappingURL=scoreLead.js.map