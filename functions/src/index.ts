
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Export all triggers
export const healthCheck = functions.https.onRequest((request, response) => {
    response.send("OK");
});
