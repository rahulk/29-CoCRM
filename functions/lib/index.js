"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
// Export all triggers
exports.healthCheck = functions.https.onRequest((request, response) => {
    response.send("OK");
});
//# sourceMappingURL=index.js.map