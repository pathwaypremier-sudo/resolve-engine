/**
 * NotebookLM Contract v1 — Barrel Exports
 */

// Types & enums
export type {
    NoticeType,
    UserIntent,
    StrengthSignal,
    ProceedAdvice,
    DeterminismBlock,
    ToneProfile,
    ForbiddenLanguageProfile,
    NotebookLMContractVersion,
    NotebookLMValidationFailureReason,
    NotebookLMFallbackMode,
    NotebookLMValidationResult,
} from "./types";

export { CURRENT_CONTRACT_VERSION } from "./types";

// Forbidden language
export {
    FORBIDDEN_PHRASES,
    FORBIDDEN_PATTERN_STRINGS,
    getForbiddenPhraseRegexes,
    containsForbiddenLanguage,
} from "./forbiddenLanguage";

export type { ForbiddenLanguageResult } from "./forbiddenLanguage";

// Schemas & inferred types
export {
    NotebookLMInputSchema,
    NotebookLMOutputSchema,
    SECTION_MAX_CHARS,
    SECTION_MIN_CHARS,
} from "./contract";

export type { NotebookLMInput, NotebookLMOutput } from "./contract";

// Enforcement (Phase N2)
export {
    parseNotebookLMJson,
    validateNotebookLMOutput,
    buildFallbackOutput,
    enforceNotebookLMContract,
} from "./enforce";

export type {
    ValidationResult,
    ValidationSuccess,
    ValidationFailure,
    EnforcementResult,
} from "./enforce";
