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
 * Strategy for COUNCIL_PCN CHALLENGE cases.
 */
export type ChallengeStrategy =
    | "EVIDENCE_FIRST"           // Signage unclear OR markings unclear OR facts incomplete
    | "PROCEDURAL_TIMING"        // Notice timing late OR statutory deadlines breached
    | "DISCRETIONARY_MITIGATION" // Fallback when above are weak or unavailable
    // Private Parking Challenge strategies
    | "KEEPER_LIABILITY_CHALLENGE"  // User is keeper (not driver) AND NTK timing late/non-compliant
    | "SIGNAGE_EVIDENCE_CHALLENGE"  // Signage unclear OR terms not prominently displayed
    | "EVIDENCE_REQUEST_FIRST"      // Facts incomplete OR operator proof required
    | "DISCRETIONARY_MITIGATION_PP"; // Fallback for private parking when above are weak

/**
 * Strength signal for the chosen strategy.
 */
export type StrengthSignal =
    | "STRONG"  // Key facts present AND evidence supports strategy
    | "MIXED"   // Some supporting facts but gaps remain
    | "WEAK";   // Strategy possible but evidence/facts are thin

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

    /** Deliverable type (for COUNCIL_PCN CHALLENGE cases) */
    deliverable_type?: string;

    /** Chosen strategy (for COUNCIL_PCN CHALLENGE cases) */
    chosen_strategy?: ChallengeStrategy;

    /** Strength signal (for COUNCIL_PCN CHALLENGE cases) */
    strength_signal?: StrengthSignal;

    /** Internal reasoning notes (for COUNCIL_PCN CHALLENGE cases) */
    reasoning_notes?: string;
};
