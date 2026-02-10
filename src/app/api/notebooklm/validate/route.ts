
import { NextRequest, NextResponse } from "next/server";
import { getSafeNotebookLMOutput } from "@/lib/brain/notebookLMAdapter.server";
import type { EnforcementResult } from "@/lib/notebooklm-contract";
import { getActorIdFromRequest, unauthorizedResponse } from "@/lib/auth/session.server";
import { enforceValidateRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { log } from "@/lib/telemetry/log";
import { formatErrorResponse } from "@/lib/notebooklm-contract/errorCopy";

export const runtime = "nodejs";

const MAX_RAWTEXT_CHARS = 40000;

/**
 * POST /api/notebooklm/validate
 * 
 * Validates NotebookLM output against safety contract.
 * 
 * Security:
 * - Rate limited: 20 requests/minute per IP
 * - Requires valid session cookie (or dev fallback)
 * - Validates input structure and length.
 * - No rawText logging (metadata only).
 */
export async function POST(request: NextRequest) {
    try {
        // 0. Rate Limit Check
        const rlResult = enforceValidateRateLimit(request);
        if (!rlResult.ok) {
            log.warn("NotebookLM validate rate limit exceeded", { ip: rlResult.ip });
            return rateLimitResponse();
        }

        // 1. Security Check
        const actorId = getActorIdFromRequest(request);
        if (!actorId && process.env.NODE_ENV === "production") {
            log.warn("Unauthorized NotebookLM validate attempt");
            return unauthorizedResponse();
        }

        // 2. Parse Input
        const body = await request.json();
        const { rawText, caseId } = body;

        // 3. Validate rawText
        if (!rawText || typeof rawText !== "string") {
            return NextResponse.json(formatErrorResponse("MISSING_INPUT"), { status: 400 });
        }

        if (rawText.length > MAX_RAWTEXT_CHARS) {
            log.warn("NotebookLM validate rejected: rawText too long", {
                length: rawText.length,
                maxAllowed: MAX_RAWTEXT_CHARS,
                actorId
            });
            return NextResponse.json(formatErrorResponse("INPUT_TOO_LONG"), { status: 400 });
        }

        // 4. Validate caseId if provided
        if (caseId !== undefined && typeof caseId !== "string") {
            return NextResponse.json(formatErrorResponse("INVALID_CASE_ID"), { status: 400 });
        }

        const safeCaseId = typeof caseId === "string" ? caseId : undefined;

        log.info("Processing NotebookLM validation", {
            caseId: safeCaseId,
            actorId,
            rawTextLength: rawText.length
        });

        // 5. Pass untrusted input through the safety adapter
        const result: EnforcementResult = getSafeNotebookLMOutput(rawText, {
            caseId: safeCaseId,
        });

        // 6. Return the validated result (potentially fallback)
        return NextResponse.json(result);

    } catch (error) {
        log.error("Failed to process NotebookLM validation", error);
        return NextResponse.json(formatErrorResponse("INTERNAL_ERROR"), { status: 500 });
    }
}
