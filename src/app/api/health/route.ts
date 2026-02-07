import { NextResponse } from "next/server";
import {
    isProd,
    isWebhookEnabled,
    validateProductionEnv
} from "@/lib/ops/env.server";

// Ensure Node.js runtime
export const runtime = "nodejs";

/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring.
 * Returns environment status without exposing sensitive values.
 */
export async function GET() {
    const webhookEnabled = isWebhookEnabled();

    // Validate production env (core vars only, not checkout/Stripe)
    try {
        validateProductionEnv({ webhookEnabled, checkoutEnabled: false });
    } catch (e) {
        // Don't expose which env var is missing
        return NextResponse.json(
            { ok: false, error: "misconfigured" },
            { status: 500 }
        );
    }

    return NextResponse.json({
        ok: true,
        env: isProd() ? "production" : "development",
        timeIso: new Date().toISOString(),
        webhookEnabled
    });
}
