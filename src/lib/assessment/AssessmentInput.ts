import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";
import type { EvidenceContext } from "@/lib/evidence/getEvidenceContext";

/**
 * Complete input for case assessment/generation.
 * This is the canonical contract between evidence collection and assessment logic.
 */
export type AssessmentInput = {
    /** Case identifier */
    caseId: string;

    /** Primary dispute type classification */
    disputeType: string | null;

    /** Canonical case facts with source tracking */
    facts: CaseFacts;

    /** Full evidence context including docs and extracted text */
    evidence: EvidenceContext;

    /** Raw questionnaire answers from persistence (for drafting) */
    rawAnswers: Record<string, string>;

    /** ISO timestamp when this input was generated */
    generatedAtISO: string;
};

// AssessmentStatus and AssessmentResult moved to ./AssessmentResult.ts

/**
 * Safe logging summary for AssessmentInput (no sensitive data).
 */
export function getAssessmentInputSummary(input: AssessmentInput): {
    caseId: string;
    disputeType: string | null;
    docCount: number;
    combinedTextLength: number;
    factsPresent: Record<string, boolean>;
    rawAnswerCount: number;
} {
    const factsPresent: Record<string, boolean> = {};
    for (const [key, field] of Object.entries(input.facts)) {
        factsPresent[key] = field?.value !== null;
    }

    return {
        caseId: input.caseId,
        disputeType: input.disputeType,
        docCount: input.evidence.docs.length,
        combinedTextLength: input.evidence.combinedText.length,
        factsPresent,
        rawAnswerCount: Object.keys(input.rawAnswers).length
    };
}

