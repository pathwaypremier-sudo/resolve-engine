import "server-only";

/**
 * Validates unsafe or missing configurations at runtime when in production mode.
 * Throws controlled errors to prevent misconfigured production starts.
 */
export function validateProductionGuards() {
    if (process.env.NODE_ENV !== "production") return;

    // 1. Payments Security Gate
    const provider = process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER;
    const stripeSecret = process.env.STRIPE_SECRET_KEY;

    if (provider === "stripe" && !stripeSecret) {
        throw new Error("STRIPE_NOT_CONFIGURED");
    }

    // 2. Latency Simulation Gate (If used in future)
    const latency = process.env.NEXT_PUBLIC_SIMULATE_LATENCY;
    if (latency && parseInt(latency, 10) > 0) {
        throw new Error("DEV_LATENCY_NOT_ALLOWED_IN_PROD");
    }

    console.log("[ProductionGuards] All safety gates passed.");
}
