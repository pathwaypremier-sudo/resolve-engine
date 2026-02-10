/**
 * Minimum Input Pack Builder (Phase N4)
 * 
 * Constructs a fully contract-valid NotebookLMInput object from minimal
 * or incomplete user data. Fills safe defaults deterministically.
 * 
 * PHILOSOPHY:
 * - Never invent facts.
 * - If data is missing, mark as unknown or omit safely.
 * - Always produce a valid contract object so the model can run safely.
 */

import {
    type NotebookLMInput,
    type NoticeType,
    type UserIntent,
    type StrengthSignal,
    type ProceedAdvice,
} from "@/lib/notebooklm-contract";

export type MinimumPackArgs = {
    case_id?: string;
    notice_type: NoticeType;
    user_intent: UserIntent;
    strategy: {
        selected_path: string;
        selected_strategy: string;
        strength_signal: StrengthSignal;
        proceed_advice: ProceedAdvice;
        checklist?: string[];
        fallbacks?: string[];
        determinism: {
            version: string;
            rule_ids: string[];
        };
    };
    facts?: Record<string, unknown>;
    evidence?: Partial<NotebookLMInput["evidence"]>;
    approved_sources?: string[];
};

/**
 * Builds a deterministic, contract-valid NotebookLMInput from minimal args.
 */
export function buildMinimumNotebookLMPack(args: MinimumPackArgs): NotebookLMInput {
    // 1. Defaults for scalar fields
    const case_id = args.case_id || "case_unknown";
    const approved_sources = args.approved_sources || ["constitution_book_motoring_v1"];

    // 2. Defaults for strategy arrays
    const checklist = args.strategy.checklist || [];
    const fallbacks = args.strategy.fallbacks || [];

    // 3. Defaults for evidence
    // We merge provided partial evidence with strict defaults (all false)
    const evidence: NotebookLMInput["evidence"] = {
        uploads: {
            has_notice: args.evidence?.uploads?.has_notice ?? false,
            has_photos: args.evidence?.uploads?.has_photos ?? false,
            has_correspondence: args.evidence?.uploads?.has_correspondence ?? false,
            other: args.evidence?.uploads?.other ?? false,
        },
        evidence_flags: args.evidence?.evidence_flags || [],
        extracted_text_available: args.evidence?.extracted_text_available ?? false,
    };

    // 4. Defaults for facts
    const facts = args.facts || {};

    // 5. Construct final object
    return {
        case_id,
        notice_type: args.notice_type,
        user_intent: args.user_intent,
        strategy: {
            selected_path: args.strategy.selected_path,
            selected_strategy: args.strategy.selected_strategy,
            strength_signal: args.strategy.strength_signal,
            proceed_advice: args.strategy.proceed_advice,
            checklist,
            fallbacks,
            determinism: args.strategy.determinism,
        },
        facts,
        evidence,
        constraints: {
            approved_sources,
            forbidden_language_profile: "motoring_v1",
            tone_profile: "calm_authoritative",
            jurisdiction: "UK",
        },
    };
}
