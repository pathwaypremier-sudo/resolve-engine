import { NextRequest, NextResponse } from "next/server";
import { loadCaseState } from "@/lib/coverage/caseStateAdapter";
import { computeCoverage } from "@/lib/coverage/coverageEngine";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");

    if (!caseId) {
        return NextResponse.json({ ok: false, error: "missing_case_id" }, { status: 400 });
    }

    try {
        const state = await loadCaseState(caseId);
        const coverage = computeCoverage(state);

        return NextResponse.json({
            ok: true,
            caseId,
            state, // Helpful for debugging, maybe remove in strict prod
            coverage
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
