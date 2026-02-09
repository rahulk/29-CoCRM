
import axios from "axios";
import { debug } from "firebase-functions/logger";

interface ApifyRunInput {
    startUrls: Array<{
        url: string;
        userData: {
            leadId: string;
            tenantId: string;
        };
    }>;
    maxCrawlingDepth?: number;
    maxConcurrency?: number;
    [key: string]: any;
}

const APIFY_BASE_URL = "https://api.apify.com/v2";

/**
 * Trigger an Apify Actor run
 * @param actorId The actor ID (e.g. 'apify/contact-detail-scraper')
 * @param input The input json for the actor
 * @param token Apify API Token
 * @returns The run object (containing id, defaultDatasetId, etc.)
 */
export async function startApifyRun(actorId: string, input: ApifyRunInput, token: string) {
    const url = `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${token}`;

    try {
        const response = await axios.post(url, input, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        return response.data.data;
    } catch (error: any) {
        debug("Apify API Error", error.response?.data || error.message);
        throw new Error(`Apify Run Failed: ${error.response?.data?.error?.message || error.message}`);
    }
}
