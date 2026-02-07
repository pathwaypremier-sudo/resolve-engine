import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { priceIdForTier, isValidTier, Tier } from "@/lib/integrations/payments/stripePrices";
import { getActorIdWithFallback, unauthorizedResponse } from "@/lib/auth/session.server";
import { validateProductionEnv } from "@/lib/ops/env.server";
import { auditLog } from "@/lib/ops/auditLog.server";
import { getBaseUrl } from "@/lib/ops/baseUrl.server";

// Ensure Node.js runtime for Stripe SDK
export const runtime = "nodejs";

/**
 * POST /api/payments/checkout
 * Creates a Stripe Checkout Session for a given case and tier.
 * 
 * PRODUCTION: Requires valid session cookie (actorId from signed cookie).
 * DEV: Falls back to x-actor-id header or ephemeral actorId.
 * 
 * Request body: { caseId: string, tier: string }
 * Response: { ok: true, checkoutUrl: string } or { ok: false, error?: string }
 */
export async function POST(req: NextRequest) {
    // 0. Validate production env
    try {
        validateProductionEnv({ checkoutEnabled: true });
    } catch {
        auditLog({ eventType: "CHECKOUT_CONFIG_ERROR", reason: "env_validation_failed" });
        return NextResponse.json({ ok: false, error: "misconfigured" }, { status: 500 });
    }

    // 1. Determine actorId (production requires valid cookie)
    const actorResult = getActorIdWithFallback(req);

    if (!actorResult) {
        // Production and no valid cookie
        auditLog({ eventType: "CHECKOUT_UNAUTHORIZED", reason: "missing_session_cookie" });
        return unauthorizedResponse();
    }

    const { actorId, source: actorSource } = actorResult;

    // 2. Parse and validate input
    let body: { caseId?: string; tier?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    const { caseId, tier } = body;

    if (!caseId || typeof caseId !== "string" || caseId.trim().length === 0) {
        return NextResponse.json({ ok: false, error: "missing_case_id" }, { status: 400 });
    }

    if (!isValidTier(tier)) {
        return NextResponse.json({ ok: false, error: "invalid_tier" }, { status: 400 });
    }

    // 3. Check Stripe configuration
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
        auditLog({ eventType: "CHECKOUT_CONFIG_ERROR", reason: "missing_stripe_secret_key" });
        return NextResponse.json({ ok: false }, { status: 500 });
    }

    // Derive base URL from env or request headers
    const appBaseUrl = getBaseUrl(req);

    // 4. Get price ID for tier
    let priceId: string;
    try {
        priceId = priceIdForTier(tier as Tier);
    } catch (e) {
        auditLog({ eventType: "CHECKOUT_CONFIG_ERROR", reason: "missing_price_id", tier });
        return NextResponse.json({ ok: false }, { status: 500 });
    }

    // 5. Create Stripe client
    const stripe = new Stripe(stripeSecretKey);

    // 6. Create Checkout Session
    try {
        const session = await stripe.checkout.sessions.create({
            mode: "payment",
            line_items: [
                {
                    price: priceId,
                    quantity: 1
                }
            ],
            success_url: `${appBaseUrl}/app/case/${caseId}/deliver?checkout=success`,
            cancel_url: `${appBaseUrl}/app/case/${caseId}/checkout?checkout=cancelled`,
            metadata: {
                caseId,
                tier,
                actorId
            },
            client_reference_id: actorId
        });

        if (!session.url) {
            auditLog({ eventType: "CHECKOUT_SESSION_NO_URL", caseId, tier });
            return NextResponse.json({ ok: false, error: "no_checkout_url" }, { status: 502 });
        }

        auditLog({
            eventType: "CHECKOUT_SESSION_CREATED",
            caseId,
            tier,
            sessionId: session.id,
            actorSource
        });

        return NextResponse.json({ ok: true, checkoutUrl: session.url });

    } catch (e) {
        const errorType = e instanceof Stripe.errors.StripeError ? e.type : "unknown";
        auditLog({ eventType: "CHECKOUT_SESSION_FAILED", caseId, tier, errorType });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
