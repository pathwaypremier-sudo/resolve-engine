/**
 * NotebookLM Contract v1 — Shared Types & Enums
 *
 * These types define the vocabulary shared between the Strategy Engine
 * (deterministic) and the NotebookLM drafting layer.
 *
 * RULE: Strategy Engine DECIDES. NotebookLM DRAFTS + EXPLAINS only.
 */

// ─── Notice & Intent ────────────────────────────────────────────────

export type NoticeType = "COUNCIL_PCN" | "PRIVATE_PARKING" | "CAMERA_MATTER";

export type UserIntent = "CHALLENGE" | "AFFORDABILITY";

// ─── Strategy Signals (set by Strategy Engine, read-only for NotebookLM) ──

export type StrengthSignal = "STRONG" | "MIXED" | "WEAK";

export type ProceedAdvice =
    | "PROCEED"
    | "PROCEED_WITH_CAUTION"
    | "DO_NOT_PROCEED";

// ─── Determinism Block ──────────────────────────────────────────────

/** Attached to every input so the output can be traced to exact engine rules. */
export type DeterminismBlock = {
    /** Engine version that produced the strategy decision. */
    version: string;
    /** IDs of the rules that fired to produce this strategy. */
    rule_ids: string[];
};

// ─── Tone & Language Profiles ───────────────────────────────────────

export type ToneProfile = "calm_authoritative";

export type ForbiddenLanguageProfile = "motoring_v1";

// ─── Contract Version ───────────────────────────────────────────────

export type NotebookLMContractVersion = "v1";

export const CURRENT_CONTRACT_VERSION: NotebookLMContractVersion = "v1";

// ─── Validation & Fallback ──────────────────────────────────────────

export type NotebookLMValidationFailureReason =
    | "schema_invalid"
    | "missing_sections"
    | "extra_sections"
    | "forbidden_language"
    | "over_length"
    | "unapproved_source_reference"
    | "unsafe_tone"
    | "other";

export type NotebookLMFallbackMode =
    | "SAFE_EXPLANATION_ONLY"
    | "DO_NOT_PROCEED_NOTICE";

/** Result of validating a NotebookLM output against the contract. */
export type NotebookLMValidationResult = {
    valid: boolean;
    failures: Array<{
        reason: NotebookLMValidationFailureReason;
        detail: string;
    }>;
    /** If invalid, which fallback mode should the UI render? */
    fallback_mode: NotebookLMFallbackMode | null;
};
