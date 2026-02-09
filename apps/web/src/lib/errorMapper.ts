// utils/errorMapper.ts

interface ErrorMapping {
    code: string;
    messageIncludes?: string;
    userMessage: string;
    silent?: boolean; // If true, don't show toast
}

const ERROR_MAPPINGS: ErrorMapping[] = [
    // --- sendWhatsapp ---
    {
        code: "failed-precondition",
        messageIncludes: "Insufficient credits",
        userMessage: "Not enough credits. Please top up.",
    },
    {
        code: "failed-precondition",
        messageIncludes: "opted out",
        userMessage: "This contact has opted out of messages.",
    },
    {
        code: "failed-precondition",
        messageIncludes: "Trial expired",
        userMessage: "Your free trial has ended. Subscribe to continue.",
    },
    {
        code: "failed-precondition",
        messageIncludes: "24-hour service window",
        userMessage:
            "Use a template message — it's been over 24 hours since they replied.",
    },
    {
        code: "resource-exhausted",
        messageIncludes: "Daily send limit",
        userMessage: "Daily message limit reached. Resets at midnight.",
    },
    {
        code: "resource-exhausted",
        messageIncludes: "Monthly lead limit",
        userMessage: "Monthly lead limit reached. Upgrade for more.",
    },
    {
        code: "resource-exhausted",
        messageIncludes: "Rate limit",
        userMessage: "Too many requests. Please wait a moment.",
    },

    // --- Invitations ---
    {
        code: "already-exists",
        messageIncludes: "pending invitation",
        userMessage: "An invitation was already sent to this email.",
    },
    {
        code: "already-exists",
        messageIncludes: "already a member",
        userMessage: "This person is already on your team!",
    },

    // --- Onboarding ---
    {
        code: "already-exists",
        messageIncludes: "already has a tenant",
        userMessage: "You already have an organization.",
    },
    {
        code: "failed-precondition",
        messageIncludes: "Trial already activated",
        userMessage: "Your trial is already active!",
    },
    {
        code: "failed-precondition",
        messageIncludes: "Preview search limit",
        userMessage: "Preview limit reached. Start your free trial!",
    },
    {
        code: "failed-precondition",
        messageIncludes: "Invitation expired",
        userMessage: "This invitation has expired. Ask your admin for a new one.",
    },
    {
        code: "failed-precondition",
        messageIncludes: "different email",
        userMessage: "Sign in with the email this invitation was sent to.",
    },
    {
        code: "failed-precondition",
        messageIncludes: "another organization",
        userMessage: "You're already in another organization. Contact support.",
    },

    // --- Permissions ---
    {
        code: "failed-precondition",
        messageIncludes: "Cannot edit own",
        userMessage: "You cannot change your own permissions.",
    },
    {
        code: "failed-precondition",
        messageIncludes: "Cannot remove yourself",
        userMessage: "You cannot remove yourself.",
    },

    // --- External services ---
    {
        code: "unavailable",
        messageIncludes: "Google Places",
        userMessage: "Lead search is temporarily unavailable. Try again shortly.",
    },
    {
        code: "unavailable",
        messageIncludes: "Enrichment",
        userMessage: "Enrichment is temporarily unavailable. We'll retry automatically.",
    },
    {
        code: "unavailable",
        messageIncludes: "Messaging",
        userMessage: "WhatsApp is temporarily unavailable. Message saved as draft.",
    },
    {
        code: "unavailable",
        messageIncludes: "AI service",
        userMessage: "AI drafting unavailable. Write your reply manually.",
    },
    {
        code: "unavailable",
        messageIncludes: "Payment",
        userMessage: "Payments temporarily unavailable. Try again shortly.",
    },

    // --- Silent errors (logging) ---
    {
        code: "resource-exhausted",
        messageIncludes: "Error logging",
        userMessage: "",
        silent: true,
    },
    {
        code: "resource-exhausted",
        messageIncludes: "Login logging",
        userMessage: "",
        silent: true,
    },

    // --- Global fallbacks (ORDER MATTERS — these go last) ---
    { code: "unauthenticated", userMessage: "Please sign in to continue." },
    {
        code: "permission-denied",
        messageIncludes: "suspended",
        userMessage: "Your account has been suspended. Contact support.",
    },
    {
        code: "permission-denied",
        userMessage: "You don't have permission for this action.",
    },
    {
        code: "invalid-argument",
        userMessage: "Please check your input and try again.",
    },
    { code: "not-found", userMessage: "The requested item could not be found." },
    {
        code: "failed-precondition",
        userMessage: "This action cannot be completed right now.",
    },
    {
        code: "resource-exhausted",
        userMessage: "Too many requests. Please wait a moment.",
    },
    {
        code: "unavailable",
        userMessage: "Service temporarily unavailable. Please try again.",
    },
];

const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

export function mapErrorMessage(error: any): {
    message: string;
    silent: boolean;
} {
    const code = error?.code ?? ""; // e.g. "functions/failed-precondition" → extract after /
    const msg = error?.message ?? "";
    const normalizedCode = code.includes("/") ? code.split("/")[1] : code;

    for (const mapping of ERROR_MAPPINGS) {
        if (normalizedCode === mapping.code) {
            if (mapping.messageIncludes && !msg.includes(mapping.messageIncludes))
                continue;
            return { message: mapping.userMessage, silent: mapping.silent ?? false };
        }
    }

    return { message: DEFAULT_MESSAGE, silent: false };
}
