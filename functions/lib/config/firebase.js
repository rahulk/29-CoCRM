"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = exports.db = void 0;
const admin = require("firebase-admin");
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.db = admin.firestore();
exports.auth = admin.auth();
//# sourceMappingURL=firebase.js.map