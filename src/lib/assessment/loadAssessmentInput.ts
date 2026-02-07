"use client";

import { getCaseEvents, type CaseEvent } from "@/app/app/case/_context/CaseEvents";
import { getCaseFacts } from "@/lib/caseFacts/getCaseFacts";
import { getEvidenceContext } from "@/lib/evidence/getEvidenceContext";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { AssessmentInput, getAssessmentInputSummary } from "./AssessmentInput";
import { log } from "@/lib/telemetry/log";

/**
 * Known questionnaire keys to load into rawAnswers.
 * These map to the standard intake and assessment fields.
 */
const KNOWN_QUESTIONNAIRE_KEYS = [
    // Core identifiers
    "dispute_type",
    "issuer",
    "reference",
    "pcn_number",

    // Dates
    "notice_date",
    "event_date",
    "time_of_issue",

    // Vehicle/location
    "vehicle_reg",
    "location",

    // Case details
    "summary",
    "desired_outcome",
    "already_contacted",

    // Council-specific
    "council_stage",
    "council_appealed",

    // Private parking-specific
    "private_notice_type",
    "private_appealed",

    // Assessment questions
    "contravention_code",
    "amount_due",
    "notice_type",

    // Additional fields for drafting
    "dispute_type_guess",
    "mitigating_circumstances",
    "signage_issue",
    "machine_fault",
    "blue_badge",
    "loading_unloading",
    "driver_identity",
];

/**
 * Helper to get localStorage key for a case field.
 */
function keyFor(caseId: string, key: string): string {
    return `re_case_${caseId}_${key}`;
}

/**
 * Load all raw questionnaire answers from persistence.
 */
function loadRawAnswers(caseId: string): Record<string, string> {
    const answers: Record<string, string> = {};

    for (const key of KNOWN_QUESTIONNAIRE_KEYS) {
        const value = persistence.get(keyFor(caseId, key));
        if (value && value.trim() !== "") {
            answers[key] = value;
        }
    }

    return answers;
}

/**
 * Load the complete AssessmentInput for a case.
 * This is the canonical entry point for assessment/generation logic.
 * 
 * @param caseId - The case ID to load input for
 * @returns Complete AssessmentInput with facts, evidence, and raw answers
 */
export async function loadAssessmentInput(caseId: string): Promise<AssessmentInput> {
    // Load evidence context (docs + extracted text + merged facts)
    const evidence = await getEvidenceContext(caseId);

    // Load canonical case facts (questionnaire > extracted precedence)
    const facts = await getCaseFacts(caseId);

    // Load dispute type directly
    const disputeType = persistence.get(keyFor(caseId, "dispute_type")) || null;

    // Load all raw answers for drafting
    const rawAnswers = loadRawAnswers(caseId);

    return {
        caseId,
        disputeType,
        facts,
        evidence,
        rawAnswers,
        generatedAtISO: new Date().toISOString()
    };
}

/**
 * Log a safe summary of AssessmentInput (no sensitive data).
 * Use this for debugging and audit logging.
 */
export function logAssessmentInputSummary(input: AssessmentInput): void {
    const coreFacts = {
        pcnNumber: input.facts.pcnNumber.value !== null,
        issuer: input.facts.issuer.value !== null,
        issueDate: input.facts.issueDate.value !== null,
        vrn: input.facts.vrn.value !== null,
        location: input.facts.location.value !== null,
        disputeType: input.disputeType !== null,
    };

    console.log("[AssessmentInput] caseId:", input.caseId);
    console.log("[AssessmentInput] docCount:", input.evidence.docs.length);
    console.log("[AssessmentInput] combinedTextLength:", input.evidence.combinedText.length);
    console.log("[AssessmentInput] coreFacts:", coreFacts);
    console.log("[AssessmentInput] rawAnswerCount:", Object.keys(input.rawAnswers).length);
}
