import { NextRequest, NextResponse } from "next/server";
import { getBrainGateway } from "@/lib/brain/BrainGateway.server";
import { getActorIdFromRequest } from "@/lib/auth/session.server";
import { auditLog } from "@/lib/ops/auditLog.server";

// Ensure Node.js runtime
export const runtime = "nodejs";

/**
 * POST /api/brain/bootstrap
 * 
 * Bootstraps a Brain notebook for a case.
 * Body: { caseId: string }
 */
export async function POST(req: NextRequest) {
    // Auth Check
    const actorId = getActorIdFromRequest(req);
    if (!actorId && process.env.NODE_ENV === "production") {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    let body: { caseId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    if (!body.caseId || typeof body.caseId !== "string") {
        return NextResponse.json({ ok: false, error: "missing_case_id" }, { status: 400 });
    }

    try {
        const gateway = getBrainGateway();
        const result = await gateway.bootstrapCase(body.caseId);

        return NextResponse.json({
            ok: true,
            provider: process.env.BRAIN_PROVIDER || "local",
            ...result
        });
    } catch (e: any) {
        auditLog({
            eventType: "BRAIN_BOOTSTRAP_ERROR",
            caseId: body.caseId,
            reason: e.message
        });
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
