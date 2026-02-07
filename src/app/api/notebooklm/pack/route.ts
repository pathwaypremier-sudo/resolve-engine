
import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { generateNotebookLMPack } from "@/lib/notebooklm/generateNotebookLMPack";
import { generateAssessmentReport } from "@/lib/exports/generateAssessmentReport";
import { runAssessment } from "@/lib/assessment/runAssessment";
import { log } from "@/lib/telemetry/log";
import { AssessmentInput } from "@/lib/assessment/AssessmentInput";
import { getActorIdFromRequest, unauthorizedResponse } from "@/lib/auth/session.server";
import { enforcePackDownloadRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * POST /api/notebooklm/pack
 * 
 * Generates a ZIP file containing the NotebookLM source pack.
 * Expects `AssessmentInput` in the body.
 * 
 * Security:
 * - Rate limited: 10 requests/minute per IP
 * - Requires valid session cookie (or dev fallback).
 * - Validates input structure.
 */
export async function POST(request: NextRequest) {
    try {
        // 0. Rate Limit Check
        const rlResult = enforcePackDownloadRateLimit(request);
        if (!rlResult.ok) {
            log.warn("Pack download rate limit exceeded", { ip: rlResult.ip });
            return rateLimitResponse();
        }

        // 1. Security Check
        const actorId = getActorIdFromRequest(request);
        if (!actorId && process.env.NODE_ENV === "production") {
            log.warn("Unauthorized NotebookLM pack attempt");
            return unauthorizedResponse();
        }

        // 2. Parse Input
        const input: AssessmentInput = await request.json();
        const caseId = input.caseId || "unknown-case";

        if (!input || !input.facts) {
            return NextResponse.json({ error: "Invalid input" }, { status: 400 });
        }

        log.info("Generating NotebookLM Pack", { caseId, actorId });

        // 3. Run Engine (Server-Side Verification)
        const result = await runAssessment(input);

        // 4. Generate Content
        const pack = generateNotebookLMPack(input, result);
        const report = generateAssessmentReport(input, result);

        // 5. Create Zip
        const zip = new JSZip();
        zip.file("case-summary.md", pack["case-summary.md"]);
        zip.file("evidence-index.md", pack["evidence-index.md"]);
        zip.file("evidence-merged.txt", pack["evidence-merged.txt"]);
        zip.file("assessment-report.md", report);

        // 6. Generate Buffer
        const content = await zip.generateAsync({ type: "nodebuffer" });

        // 7. Return Download
        const filename = `resolve-case-${caseId.slice(0, 8)}-notebooklm-pack.zip`;

        return new NextResponse(new Uint8Array(content), {
            status: 200,
            headers: {
                "Content-Type": "application/zip",
                "Content-Disposition": `attachment; filename="${filename}"`
            }
        });

    } catch (err) {
        log.error("Failed to generate NotebookLM pack", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
