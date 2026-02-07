/**
 * Stripe Price ID Mapping
 * Maps entitlement tiers to Stripe price IDs via environment variables.
 * Throws clear errors on misconfiguration to prevent silent misbilling.
 */

export type Tier = "APPEAL_BUILDER" | "MANAGED" | "PREMIUM" | "ANNUAL_ACCESS";

const TIER_ENV_MAP: Record<Tier, string> = {
    APPEAL_BUILDER: "STRIPE_PRICE_APPEAL_BUILDER",
    MANAGED: "STRIPE_PRICE_MANAGED",
    PREMIUM: "STRIPE_PRICE_PREMIUM",
    ANNUAL_ACCESS: "STRIPE_PRICE_ANNUAL_ACCESS"
};

/**
 * Get Stripe price ID for a given tier.
 * @throws Error if env var is not configured for the tier.
 */
export function priceIdForTier(tier: Tier): string {
    const envVar = TIER_ENV_MAP[tier];
    const priceId = process.env[envVar];

    if (!priceId) {
        throw new Error(
            `STRIPE_PRICE_MISSING: Environment variable ${envVar} is not set for tier "${tier}". ` +
            `Configure this in your .env.local or deployment environment.`
        );
    }

    return priceId;
}

/**
 * Validate that a string is a valid tier.
 */
export function isValidTier(value: unknown): value is Tier {
    return (
        typeof value === "string" &&
        ["APPEAL_BUILDER", "MANAGED", "PREMIUM", "ANNUAL_ACCESS"].includes(value)
    );
}
