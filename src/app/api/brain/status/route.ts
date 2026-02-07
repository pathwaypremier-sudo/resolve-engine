import { NextRequest, NextResponse } from "next/server";
import { getBrainGateway } from "@/lib/brain/BrainGateway.server";

// Ensure Node.js runtime
export const runtime = "nodejs";

/**
 * GET /api/brain/status
 * 
 * Gets Brain status for a case.
 * Query: ?caseId=...
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
        return NextResponse.json({ ok: false, error: "missing_case_id" }, { status: 400 });
    }

    try {
        const gateway = getBrainGateway();
        const status = await gateway.getStatus(caseId);

        return NextResponse.json({
            ok: true,
            ...status
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
