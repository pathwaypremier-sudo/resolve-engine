import { NextRequest, NextResponse } from "next/server";
import {
    getActorIdFromRequest,
    generateActorId,
    createSessionToken,
    createSessionCookieHeader
} from "@/lib/auth/session.server";
import { validateProductionEnv } from "@/lib/ops/env.server";
import { auditLog } from "@/lib/ops/auditLog.server";

// Ensure Node.js runtime
export const runtime = "nodejs";

/**
 * POST /api/session/bootstrap
 * 
 * If request has valid session cookie:
 *   - Return { ok: true, actorId } without rotating.
 * Else:
 *   - Generate new actorId
 *   - Set signed session cookie
 *   - Return { ok: true, actorId }
 */
export async function POST(req: NextRequest) {
    // Validate production env
    try {
        validateProductionEnv({ checkoutEnabled: false, webhookEnabled: false });
    } catch {
        return NextResponse.json({ ok: false, error: "misconfigured" }, { status: 500 });
    }

    // Check for existing valid session
    const existingActorId = getActorIdFromRequest(req);

    if (existingActorId) {
        auditLog({
            eventType: "SESSION_BOOTSTRAP_EXISTING",
            actorId: existingActorId
        });

        return NextResponse.json({
            ok: true,
            actorId: existingActorId,
            isNew: false
        });
    }

    // Generate new session
    const actorId = generateActorId();
    const token = createSessionToken(actorId);
    const cookieHeader = createSessionCookieHeader(token);

    auditLog({
        eventType: "SESSION_BOOTSTRAP_NEW",
        actorId
    });

    const response = NextResponse.json({
        ok: true,
        actorId,
        isNew: true
    });

    response.headers.set("Set-Cookie", cookieHeader);

    return response;
}
