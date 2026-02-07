import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * The high-level outcome of the assessment.
 */
export type AssessmentVerdict =
    | "APPEAL_POSSIBLE"  // Good grounds found, likely to win or worth trying
    | "PAY_DISCOUNT"     // No strong grounds, risk of higher charge outweighs benefit
    | "UNCERTAIN"       // Insufficient facts to determine
    | "UNSUPPORTED";    // Case type or circumstances not covered by engine

/**
 * Reference to a source of authority.
 */
export type AssessmentCitation = {
    /** Type of authority */
    source: "legislation" | "code_of_practice" | "precedent" | "policy";

    /** Reference identifier (e.g., "TMA 2004 s.82") */
    ref: string;

    /** Quote or summary of the rule */
    text?: string;

    /** Link to the source if available */
    url?: string;
};

/**
 * A specific pass/fail check performed on the case facts.
 */
export type AssessmentCheck = {
    /** Unique identifier for the check (e.g., "check_dates_valid") */
    id: string;

    /** User-friendly label for the check */
    label: string;

    /** Whether the check passed (favorable to positive outcome) */
    passed: boolean;

    /** Explanation of why it passed or failed */
    rationale: string;

    /** Supporting authorities */
    citations: AssessmentCitation[];
};

/**
 * Canonical result of the assessment engine.
 */
export type AssessmentResult = {
    /** The overall recommendation */
    verdict: AssessmentVerdict;

    /** List of individual checks performed */
    checks: AssessmentCheck[];

    /** Human-readable summary reasons for the verdict */
    reasons: string[];

    /** List of missing fact keys that prevented a better assessment */
    missingInfo: Array<keyof CaseFacts>;

    /** ISO timestamp of generation */
    generatedAt: string;
};
