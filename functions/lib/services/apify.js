"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startApifyRun = startApifyRun;
const axios_1 = require("axios");
const logger_1 = require("firebase-functions/logger");
const APIFY_BASE_URL = "https://api.apify.com/v2";
/**
 * Trigger an Apify Actor run
 * @param actorId The actor ID (e.g. 'apify/contact-detail-scraper')
 * @param input The input json for the actor
 * @param token Apify API Token
 * @returns The run object (containing id, defaultDatasetId, etc.)
 */
async function startApifyRun(actorId, input, token) {
    const url = `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${token}`;
    try {
        const response = await axios_1.default.post(url, input, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.data.data;
    }
    catch (error) {
        (0, logger_1.debug)("Apify API Error", error.response?.data || error.message);
        throw new Error(`Apify Run Failed: ${error.response?.data?.error?.message || error.message}`);
    }
}
//# sourceMappingURL=apify.js.map