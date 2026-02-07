import { NextRequest, NextResponse } from "next/server";
import { loadCaseState } from "@/lib/coverage/caseStateAdapter";
import { computeCoverage } from "@/lib/coverage/coverageEngine";
import { buildBrainPromptPack } from "@/lib/brain/promptPack";

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
        const prompt = buildBrainPromptPack(state, coverage);

        return NextResponse.json({ ok: true, prompt });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
