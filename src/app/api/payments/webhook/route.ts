import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { enforceWebhookRateLimit } from "@/lib/rateLimit";
import {
    insertPaymentEventIfNew,
    upsertEntitlementGrant,
    upsertEntitlementRevoke,
    computeRawHash,
    PaymentEventStatus
} from "@/lib/integrations/payments/paymentsLedger.server";
import { isProd, isWebhookEnabled, validateProductionEnv } from "@/lib/ops/env.server";
import { auditLog } from "@/lib/ops/auditLog.server";

// Ensure Node.js runtime for Stripe SDK
export const runtime = "nodejs";

/**
 * Timing-safe comparison of two hex digest strings.
 */
function verifyHmacSignature(expected: string, actual: string): boolean {
    if (expected.length !== actual.length) {
        return false;
    }
    try {
        return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
    } catch {
        return false;
    }
}

/**
 * Map Stripe event type to ledger status.
 * Returns null for events we don't confidently classify.
 */
function mapStripeEventToLedgerStatus(eventType: string): PaymentEventStatus | null {
    switch (eventType) {
        case "checkout.session.completed":
        case "payment_intent.succeeded":
            return "PAID";
        case "payment_intent.payment_failed":
            return "FAILED";
        case "checkout.session.expired":
            return "CANCELED";
        case "charge.refunded":
        case "refund.updated":
            return "REFUNDED";
        case "charge.dispute.created":
            return "DISPUTED";
        default:
            return null;
    }
}

/**
 * Internal webhook payload shape for unified processing.
 */
type WebhookPayload = {
    provider: "stripe" | "stub";
    providerEventId: string;
    sessionId: string | null;
    caseId: string | null;
    actorId: string | null;
    tier: string | null;
    status: PaymentEventStatus | null;
    livemode?: boolean;
    stripeEventType?: string;
    rawHash: string;
};

export async function POST(req: NextRequest) {
    // 1. Production Gating: WEBHOOK_ENABLED must be "1" in production
    if (isProd() && !isWebhookEnabled()) {
        return new NextResponse(null, { status: 404 });
    }

    // 2. Validate production env if webhook is enabled
    if (isProd()) {
        try {
            validateProductionEnv({ webhookEnabled: true, checkoutEnabled: false });
        } catch {
            auditLog({ eventType: "WEBHOOK_CONFIG_ERROR", reason: "env_validation_failed" });
            return NextResponse.json({ ok: false }, { status: 500 });
        }
    }

    // 3. Rate Limiting (before reading body)
    const rlResult = enforceWebhookRateLimit(req);
    if (!rlResult.ok) {
        auditLog({ eventType: "WEBHOOK_RATE_LIMITED", ip: rlResult.ip, bucket: rlResult.bucket });
        return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
    }

    // 3. Read raw body bytes (needed for both verification methods)
    const rawBody = await req.arrayBuffer();
    const rawBodyBuffer = Buffer.from(rawBody);
    const rawHash = computeRawHash(rawBodyBuffer);

    // 4. Determine verification path: Stripe or HMAC (dev fallback)
    const stripeSignatureHeader = req.headers.get("stripe-signature");
    let payload: WebhookPayload;

    if (stripeSignatureHeader) {
        // ===== STRIPE VERIFICATION PATH =====
        const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!stripeWebhookSecret) {
            auditLog({ eventType: "WEBHOOK_CONFIG_ERROR", reason: "missing_stripe_webhook_secret" });
            return NextResponse.json({ ok: false }, { status: 500 });
        }

        let event: Stripe.Event;
        try {
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
            event = stripe.webhooks.constructEvent(
                rawBodyBuffer,
                stripeSignatureHeader,
                stripeWebhookSecret
            );
        } catch (e) {
            auditLog({ eventType: "WEBHOOK_UNAUTHENTICATED", reason: "bad_stripe_signature" });
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        // Extract Stripe event details
        const stripeEventId = event.id;
        const stripeEventType = event.type;
        const livemode = event.livemode;

        auditLog({
            eventType: "WEBHOOK_STRIPE_VERIFIED",
            stripeEventId,
            stripeEventType,
            livemode
        });

        // Extract metadata from session if available
        let caseId: string | null = null;
        let tier: string | null = null;
        let actorId: string | null = null;
        let sessionId: string | null = null;

        if (event.type === "checkout.session.completed") {
            const session = event.data.object as Stripe.Checkout.Session;
            sessionId = session.id;
            caseId = session.metadata?.caseId || null;
            tier = session.metadata?.tier || null;
            actorId = session.metadata?.actorId || session.client_reference_id || null;
        } else if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
            // Try to extract actorId from charge metadata if available
            const charge = event.data.object as Stripe.Charge;
            actorId = charge.metadata?.actorId || null;
            caseId = charge.metadata?.caseId || null;
        }

        const status = mapStripeEventToLedgerStatus(stripeEventType);

        payload = {
            provider: "stripe",
            providerEventId: stripeEventId,
            sessionId,
            caseId,
            actorId,
            tier,
            status,
            livemode,
            stripeEventType,
            rawHash
        };

    } else {
        // ===== DEV HMAC VERIFICATION PATH (fallback) =====
        const hmacSecret = process.env.WEBHOOK_SECRET;
        if (!hmacSecret) {
            auditLog({ eventType: "WEBHOOK_SIGNATURE_FAILED", reason: "missing_secret" });
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        const rawSignatureHeader = req.headers.get("x-webhook-signature");
        if (!rawSignatureHeader) {
            auditLog({ eventType: "WEBHOOK_SIGNATURE_FAILED", reason: "missing_signature_header" });
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        const signatureHeader = rawSignatureHeader.startsWith("sha256=")
            ? rawSignatureHeader.slice(7)
            : rawSignatureHeader;

        const computedSignature = createHmac("sha256", hmacSecret)
            .update(rawBodyBuffer)
            .digest("hex");

        if (!verifyHmacSignature(computedSignature, signatureHeader)) {
            auditLog({ eventType: "WEBHOOK_SIGNATURE_FAILED", reason: "invalid_signature" });
            return NextResponse.json({ ok: false }, { status: 401 });
        }

        // Parse JSON body for dev webhook
        let body: Record<string, unknown>;
        try {
            body = JSON.parse(rawBodyBuffer.toString("utf-8"));
        } catch {
            auditLog({ eventType: "WEBHOOK_PARSE_ERROR" });
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        const { caseId, checkoutId, providerEventId, category, actorId, tier } = body as {
            caseId?: string;
            checkoutId?: string;
            providerEventId?: string;
            category?: string;
            actorId?: string;
            tier?: string;
        };

        if (!providerEventId || !category) {
            return NextResponse.json({ ok: false }, { status: 400 });
        }

        payload = {
            provider: "stub",
            providerEventId: providerEventId,
            sessionId: checkoutId || null,
            caseId: caseId || null,
            actorId: actorId || null,
            tier: tier || null,
            status: category as PaymentEventStatus,
            rawHash
        };
    }

    // 5. Idempotency Check (in-memory/persistence layer)
    const idempotencyKey = payload.provider === "stripe"
        ? `re_webhook_processed_stripe_${payload.providerEventId}`
        : `re_webhook_processed_${payload.providerEventId}`;

    const existingRecord = persistence.getJSON<{ at: string }>(idempotencyKey);
    if (existingRecord) {
        auditLog({
            eventType: "WEBHOOK_IDEMPOTENT_REPLAY",
            providerEventId: payload.providerEventId,
            provider: payload.provider
        });
        return NextResponse.json({ ok: true, skipped: true });
    }

    // 6. For events we can't confidently classify, acknowledge without DB write
    if (!payload.status) {
        persistence.setJSON(idempotencyKey, { at: new Date().toISOString() });
        auditLog({
            eventType: "WEBHOOK_ACCEPTED_NO_ACTION",
            providerEventId: payload.providerEventId,
            provider: payload.provider,
            stripeEventType: payload.stripeEventType
        });
        return NextResponse.json({ ok: true });
    }

    try {
        // 7. Write to ledger FIRST (idempotent via UNIQUE constraint)
        const { inserted } = insertPaymentEventIfNew({
            provider: payload.provider,
            providerEventId: payload.providerEventId,
            sessionId: payload.sessionId,
            caseId: payload.caseId,
            actorId: payload.actorId,
            tier: payload.tier,
            status: payload.status,
            receivedAtIso: new Date().toISOString(),
            rawHash: payload.rawHash
        });

        if (!inserted) {
            // Already in ledger - DB-level idempotency caught it
            auditLog({
                eventType: "WEBHOOK_LEDGER_DUPLICATE",
                providerEventId: payload.providerEventId,
                provider: payload.provider
            });
            persistence.setJSON(idempotencyKey, { at: new Date().toISOString() });
            return NextResponse.json({ ok: true, skipped: true });
        }

        auditLog({
            eventType: "WEBHOOK_LEDGER_INSERTED",
            providerEventId: payload.providerEventId,
            provider: payload.provider,
            status: payload.status
        });

        // 8. Update entitlements based on status (only if actorId present)
        if (payload.actorId) {
            if (payload.status === "PAID" && payload.tier) {
                upsertEntitlementGrant(payload.actorId, payload.tier, payload.providerEventId);
                auditLog({
                    eventType: "ENTITLEMENT_GRANTED",
                    actorId: payload.actorId,
                    tier: payload.tier,
                    sourceEventId: payload.providerEventId
                });
            } else if (payload.status === "REFUNDED" || payload.status === "DISPUTED") {
                upsertEntitlementRevoke(payload.actorId, payload.providerEventId);
                auditLog({
                    eventType: "ENTITLEMENT_REVOKED",
                    actorId: payload.actorId,
                    reason: payload.status,
                    sourceEventId: payload.providerEventId
                });
            }
        }

        // 9. Mark as processed in persistence layer
        persistence.setJSON(idempotencyKey, { at: new Date().toISOString() });

        auditLog({
            eventType: "WEBHOOK_PROCESSED",
            providerEventId: payload.providerEventId,
            provider: payload.provider,
            status: payload.status
        });

        // 10. Hardened response: no internal details
        return NextResponse.json({ ok: true });

    } catch (e) {
        auditLog({ eventType: "WEBHOOK_PROCESS_ERROR", providerEventId: payload.providerEventId });
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}
