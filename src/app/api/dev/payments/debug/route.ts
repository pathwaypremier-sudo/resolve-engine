import { NextRequest, NextResponse } from "next/server";
import {
    getEntitlement,
    getPaymentEventsForActor
} from "@/lib/integrations/payments/paymentsLedger.server";

// Ensure Node.js runtime
export const runtime = "nodejs";

/**
 * GET /api/dev/payments/debug?actorId=...
 * DEV-ONLY: Returns entitlements and recent payment events for an actor.
 * 
 * Guard: NODE_ENV !== "production"
 * No secrets/payloads returned.
 */
export async function GET(req: NextRequest) {
    // Production Guard
    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const actorId = searchParams.get("actorId");

    if (!actorId) {
        return NextResponse.json({ ok: false, error: "missing_actor_id" }, { status: 400 });
    }

    const entitlement = getEntitlement(actorId);
    const recentEvents = getPaymentEventsForActor(actorId, 10);

    return NextResponse.json({
        ok: true,
        actorId,
        entitlement: entitlement || { tier: "NONE", active: false, sourceEventId: null, updatedAtIso: null },
        recentPaymentEvents: recentEvents
    });
}
