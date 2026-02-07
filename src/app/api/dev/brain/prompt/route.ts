import { NextRequest, NextResponse } from "next/server";
import { loadCaseState } from "@/lib/coverage/caseStateAdapter";
import { computeCoverage } from "@/lib/coverage/coverageEngine";
import { buildBrainPromptPack } from "@/lib/brain/promptPack";

export const runtime = "nodejs";

/**
 * DEV ONLY ENDPOINT
 * Exposes the exact prompt that would be sent to the Brain.
 * Allows overriding 'tier' to simulate Managed behavior.
 */
/**
 * Two-Factor Dev Guard:
 * BOTH conditions must be true to enable dev endpoints:
 * 1) process.env.DEV_ENDPOINTS_ENABLED === "1"
 * 2) Request header "x-dev-endpoints-enabled" === "1"
 */
function devEnvEnabled(): boolean {
    return process.env.DEV_ENDPOINTS_ENABLED === "1";
}

function headerEnabled(req: NextRequest): boolean {
    return req.headers.get("x-dev-endpoints-enabled") === "1";
}

export async function GET(req: NextRequest) {
    // SECURITY: Fail closed if BOTH factors are not explicitly "1"
    if (!devEnvEnabled() || !headerEnabled(req)) {
        return new NextResponse(null, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const caseId = searchParams.get("caseId");
    const tier = searchParams.get("tier") || "APPEAL_BUILDER";

    if (!caseId) {
        return NextResponse.json({ ok: false, error: "missing_case_id" }, { status: 400 });
    }

    try {
        // Load state (will be empty defaults if case doesn't exist, which is fine for prompting tests)
        const state = await loadCaseState(caseId);
        const coverage = computeCoverage(state);

        // Build prompt with explicit tier override
        const prompt = buildBrainPromptPack(state, coverage, tier);

        return NextResponse.json({
            ok: true,
            caseId,
            tier,
            prompt
        });
    } catch (e: any) {
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
