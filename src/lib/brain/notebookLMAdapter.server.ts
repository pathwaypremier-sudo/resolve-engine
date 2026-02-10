/**
 * NotebookLM Output Adapter (Server-Side)
 *
 * Designated ingestion seam for all NotebookLM model output.
 * Routes raw model text through contract enforcement, ensuring
 * fail-closed safety before any output reaches downstream consumers.
 *
 * This is the ONLY function that should receive raw NotebookLM output.
 */

import {
    enforceNotebookLMContract,
    type EnforcementResult,
    type NotebookLMFallbackMode,
} from "@/lib/notebooklm-contract";
import { auditLog } from "@/lib/ops/auditLog.server";

export type SafeNotebookLMOutputOptions = {
    fallbackMode?: NotebookLMFallbackMode;
    caseId?: string;
};

/**
 * Process raw NotebookLM model output through contract enforcement.
 *
 * - Valid output: passes through unchanged.
 * - Invalid/unsafe output: returns deterministic safe fallback.
 * - NEVER throws. Always returns a usable result.
 */
export function getSafeNotebookLMOutput(
    rawText: string,
    opts?: SafeNotebookLMOutputOptions
): EnforcementResult {
    const result = enforceNotebookLMContract(rawText, opts?.fallbackMode);

    auditLog({
        eventType: result.safe_mode_used
            ? "NOTEBOOKLM_OUTPUT_FALLBACK"
            : "NOTEBOOKLM_OUTPUT_ACCEPTED",
        caseId: opts?.caseId,
        reason: result.reason,
        status: result.safe_mode_used ? "fallback" : "ok",
    });

    return result;
}
