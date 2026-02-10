/**
 * Draft Pipeline (Phase N5)
 *
 * Orchestrates the end-to-end NotebookLM drafting process:
 * 1. Construction of contract-valid input (Phase N4)
 * 2. (Future) Call to NotebookLM
 * 3. Enforcement of safety contract on output (Phase N2)
 *
 * This function is the primary entry point for the "Draft" capability.
 */

import {
    type NotebookLMInput,
    type NotebookLMOutput,
    type NotebookLMFallbackMode,
    type NotebookLMValidationFailureReason,
    type NoticeType,
    type UserIntent,
} from "@/lib/notebooklm-contract";
import { buildMinimumNotebookLMPack } from "./minimumInputPack";
import { getSafeNotebookLMOutput } from "./notebookLMAdapter.server";

type DraftPipelineArgs = {
    case_id: string;
    notice_type: NoticeType;
    user_intent: UserIntent;
    strategy: NotebookLMInput["strategy"];
    facts?: Record<string, unknown>;
    evidence?: Partial<NotebookLMInput["evidence"]>;
    approved_sources?: string[];
    rawModelOutputText: string; // Supplied by caller in N5
    fallbackMode?: NotebookLMFallbackMode;
};

export type DraftPipelineResult = {
    notebookInput: NotebookLMInput;
    safeOutput: NotebookLMOutput;
    safe_mode_used: boolean;
    reason?: NotebookLMValidationFailureReason;
};

/**
 * Runs the draft pipeline:
 * - Builds contract-valid input from provided args.
 * - Processes raw model output through the fail-closed safety adapter.
 *
 * Designed to be deterministic and safe.
 */
export function runDraftPipeline(args: DraftPipelineArgs): DraftPipelineResult {
    // 1. Build the contract-valid input pack (N4)
    // We pass args directly; types are compatible.
    const notebookInput = buildMinimumNotebookLMPack({
        case_id: args.case_id,
        notice_type: args.notice_type,
        user_intent: args.user_intent,
        strategy: args.strategy,
        facts: args.facts,
        evidence: args.evidence,
        approved_sources: args.approved_sources,
    });

    // 2. Process raw model output through the safe adapter (N2)
    // This ensures fail-closed safety: if the model output is invalid,
    // we get a safe fallback.
    const enforcementResult = getSafeNotebookLMOutput(args.rawModelOutputText, {
        fallbackMode: args.fallbackMode,
        caseId: args.case_id,
    });

    return {
        notebookInput,
        safeOutput: enforcementResult.output,
        safe_mode_used: enforcementResult.safe_mode_used,
        reason: enforcementResult.reason,
    };
}
