"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
async function checkRateLimit(db, key, // e.g. "tenant_a_discoverLeads"
maxCalls, // e.g. 10
windowMs // e.g. 60000 (1 minute)
) {
    if (!key)
        throw new https_1.HttpsError('internal', 'Rate limit key missing');
    const ref = db.collection('rate_limits').doc(key);
    await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        const now = Date.now();
        if (!doc.exists) {
            tx.set(ref, { count: 1, window_start: now });
            return;
        }
        const data = doc.data();
        const elapsed = now - (data.window_start || 0);
        if (elapsed > windowMs) {
            // Window expired — reset
            tx.set(ref, { count: 1, window_start: now });
        }
        else if (data.count >= maxCalls) {
            throw new https_1.HttpsError('resource-exhausted', 'Rate limit exceeded.');
        }
        else {
            tx.update(ref, { count: firestore_1.FieldValue.increment(1) });
        }
    });
}
//# sourceMappingURL=rateLimiter.js.map