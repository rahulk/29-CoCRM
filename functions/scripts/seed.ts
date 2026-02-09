import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Assumes GOOGLE_APPLICATION_CREDENTIALS or gcloud login setup)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

async function seed() {
    console.log("Starting seed process...");

    // 1. Seed Public Metadata (Categories)
    console.log("Seeding categories...");
    await db.collection("public_metadata").doc("categories").set({
        list: [
            "Retail",
            "Real Estate",
            "Education",
            "Healthcare",
            "Consulting",
            "Technology & IT",
            "Financial Services",
            "Manufacturing",
            "Logistics & Transportation",
            "Hospitality & Tourism",
            "Media & Entertainment",
            "Non-Profit",
            "Other"
        ],
        updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 2. Seed Plans
    console.log("Seeding plans...");
    await db.collection("plans").doc("free").set({
        name: "Free Plan",
        description: "Perfect for getting started",
        price_inr: 0,
        credits_monthly: 50,
        leads_monthly: 200,
        features: ["200 Leads/mo", "50 AI Credits/mo", "Basic Analytics"],
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("plans").doc("pro").set({
        name: "Pro Plan",
        description: "For growing businesses",
        price_inr: 1499,
        credits_monthly: 1000,
        leads_monthly: 5000,
        features: ["5000 Leads/mo", "1000 AI Credits/mo", "Advanced Analytics", "Priority Support"],
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Seed Sample Templates (Example)
    console.log("Seeding templates...");
    await db.collection("msg91_templates").doc("welcome_msg").set({
        template_id: "welcome_123", // Example ID
        name: "Welcome Message",
        category: "onboarding",
        content: "Hi {{1}}, welcome to our service!",
        variables: ["name"],
        is_active: true
    });

    console.log("Seed completed successfully!");
}

seed().catch(console.error);
