"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BANNER_THRESHOLDS = exports.QUOTAS = exports.CREDIT_COSTS = exports.RATE_LIMITS = void 0;
exports.RATE_LIMITS = {
    DISCOVER_LEADS: { maxCalls: 10, windowMs: 60_000, scope: 'tenant' },
    SEND_WHATSAPP: { maxCalls: 50, windowMs: 60_000, scope: 'tenant' },
    CREATE_TENANT: { maxCalls: 5, windowMs: 60_000, scope: 'ip' },
    LOG_ERROR: { maxCalls: 10, windowMs: 60_000, scope: 'user' },
    LOG_LOGIN: { maxCalls: 5, windowMs: 60_000, scope: 'user' },
    ENRICH_LEADS: { maxCalls: 5, windowMs: 60_000, scope: 'tenant' },
    ACTIVATE_TRIAL: { maxCalls: 3, windowMs: 300_000, scope: 'user' },
    SEND_INVITE: { maxCalls: 10, windowMs: 3_600_000, scope: 'tenant' },
    AI_REPLY: { maxCalls: 20, windowMs: 60_000, scope: 'tenant' },
};
exports.CREDIT_COSTS = {
    WHATSAPP_MARKETING: 80, // paisa
    WHATSAPP_UTILITY: 30,
    WHATSAPP_FREEFORM: 30,
    ENRICHMENT_PER_LEAD: 50,
    DISCOVERY: 0,
};
exports.QUOTAS = {
    PREVIEW_SEARCHES_MAX: 3,
    TRIAL_CREDITS: 50_000, // paisa (₹500)
    TRIAL_DURATION_DAYS: 7,
    QUIET_HOURS_START: 21, // 9 PM local
    QUIET_HOURS_END: 9, // 9 AM local
};
exports.BANNER_THRESHOLDS = {
    CREDITS_WARNING_PAISA: 10_000, // ₹100
    TRIAL_EXPIRY_DAYS: 2,
    DAILY_CAP_PERCENT: 0.80, // 80%
};
//# sourceMappingURL=limits.js.map