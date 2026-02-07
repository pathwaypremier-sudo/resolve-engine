/**
 * Environment Validation Module (Server-Only)
 * Provides helpers for env var access and production validation.
 * 
 * IMPORTANT: Never log or expose actual env values.
 */

/**
 * Check if running in production.
 */
export function isProd(): boolean {
    return process.env.NODE_ENV === "production";
}

/**
 * Get boolean env var.
 */
export function getBoolEnv(name: string, defaultValue: boolean): boolean {
    const val = process.env[name];
    if (val === undefined || val === "") {
        return defaultValue;
    }
    return val === "1" || val.toLowerCase() === "true";
}

/**
 * Require env var to be set.
 * @throws Error with message "ENV_MISSING:<NAME>" if not set.
 */
export function requireEnv(name: string): string {
    const val = process.env[name];
    if (!val || val.trim() === "") {
        throw new Error(`ENV_MISSING:${name}`);
    }
    return val;
}

/**
 * Production env validation options.
 */
type ValidationOptions = {
    webhookEnabled?: boolean;
    checkoutEnabled?: boolean;
};

/**
 * Validate required env vars for production.
 * No-op in dev.
 * @throws Error if any required var is missing.
 */
export function validateProductionEnv(opts: ValidationOptions = {}): void {
    if (!isProd()) {
        return; // Skip validation in dev
    }

    // Always required in production (APP_BASE_URL now optional - derived from request headers)
    const alwaysRequired = [
        "SESSION_SECRET"
    ];

    for (const name of alwaysRequired) {
        requireEnv(name);
    }

    // Checkout-specific requirements
    if (opts.checkoutEnabled !== false) {
        const checkoutRequired = [
            "STRIPE_SECRET_KEY",
            "STRIPE_PRICE_APPEAL_BUILDER",
            "STRIPE_PRICE_MANAGED",
            "STRIPE_PRICE_PREMIUM",
            "STRIPE_PRICE_ANNUAL_ACCESS"
        ];

        for (const name of checkoutRequired) {
            requireEnv(name);
        }
    }

    // Webhook-specific requirements
    if (opts.webhookEnabled) {
        requireEnv("STRIPE_WEBHOOK_SECRET");
    }
}

/**
 * Check if webhook is enabled in production.
 * In dev, always returns true.
 */
export function isWebhookEnabled(): boolean {
    if (!isProd()) {
        return true;
    }
    return getBoolEnv("WEBHOOK_ENABLED", false);
}

/**
 * Error class for env validation failures.
 */
export class EnvValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EnvValidationError";
    }
}
