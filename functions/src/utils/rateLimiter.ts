import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { FieldValue } from 'firebase-admin/firestore';

export async function checkRateLimit(
    db: admin.firestore.Firestore,
    key: string,          // e.g. "tenant_a_discoverLeads"
    maxCalls: number,     // e.g. 10
    windowMs: number      // e.g. 60000 (1 minute)
): Promise<void> {

    if (!key) throw new HttpsError('internal', 'Rate limit key missing');

    const ref = db.collection('rate_limits').doc(key);

    await db.runTransaction(async (tx) => {
        const doc = await tx.get(ref);
        const now = Date.now();

        if (!doc.exists) {
            tx.set(ref, { count: 1, window_start: now });
            return;
        }

        const data = doc.data()!;
        const elapsed = now - (data.window_start || 0);

        if (elapsed > windowMs) {
            // Window expired — reset
            tx.set(ref, { count: 1, window_start: now });
        } else if (data.count >= maxCalls) {
            throw new HttpsError('resource-exhausted', 'Rate limit exceeded.');
        } else {
            tx.update(ref, { count: FieldValue.increment(1) });
        }
    });
}
