"use client";

import { getEvidenceContext } from "@/lib/evidence/getEvidenceContext";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import type { Confidence } from "@/lib/extraction/extractFactsFromText";

/**
 * Source of a fact value.
 */
export type FactSource = "questionnaire" | "extracted" | "none";

/**
 * A single case fact field with source tracking.
 */
export type CaseFactField = {
    value: string | null;
    source: FactSource;
    confidence?: Confidence;
};

/**
 * Canonical case facts combining questionnaire and extracted data.
 */
export type CaseFacts = {
    pcnNumber: CaseFactField;
    issuer: CaseFactField;
    issueDate: CaseFactField;
    issueTime: CaseFactField;
    vrn: CaseFactField;
    location: CaseFactField;
    contraventionType: CaseFactField;
    disputeType: CaseFactField;
    eventDate: CaseFactField;
    amountDue: CaseFactField;
    reference: CaseFactField;
    noticeType: CaseFactField;
};

/**
 * Helper to get localStorage key for a case field.
 */
function keyFor(caseId: string, key: string): string {
    return `re_case_${caseId}_${key}`;
}

/**
 * Mapping from CaseFacts field to questionnaire key and extracted facts key.
 */
export const FIELD_MAPPINGS: Array<{
    factField: keyof CaseFacts;
    questionnaireKey: string;
    extractedKey: string;
}> = [
        { factField: "pcnNumber", questionnaireKey: "pcn_number", extractedKey: "pcnRef" },
        { factField: "reference", questionnaireKey: "reference", extractedKey: "pcnRef" },
        { factField: "issuer", questionnaireKey: "issuer", extractedKey: "issuerName" },
        { factField: "issueDate", questionnaireKey: "notice_date", extractedKey: "issueDate" },
        { factField: "issueTime", questionnaireKey: "time_of_issue", extractedKey: "issueTime" },
        { factField: "vrn", questionnaireKey: "vehicle_reg", extractedKey: "vrn" },
        { factField: "location", questionnaireKey: "location", extractedKey: "location" },
        { factField: "contraventionType", questionnaireKey: "contravention_code", extractedKey: "contraventionCode" },
        { factField: "disputeType", questionnaireKey: "dispute_type", extractedKey: "" }, // No extracted equivalent
        { factField: "eventDate", questionnaireKey: "event_date", extractedKey: "eventDate" },
        { factField: "amountDue", questionnaireKey: "amount_due", extractedKey: "amountDue" },
        { factField: "noticeType", questionnaireKey: "notice_type", extractedKey: "noticeType" },
    ];

/**
 * Build canonical case facts by combining questionnaire answers and extracted facts.
 * 
 * Precedence rules:
 * 1. Questionnaire value wins if present and not "NOT_SURE"
 * 2. Otherwise use extracted value from evidence
 * 3. Else null
 * 
 * @param caseId - The case ID to build facts for
 * @returns CaseFacts with source tracking per field
 */
export async function getCaseFacts(caseId: string): Promise<CaseFacts> {
    // Load extracted facts from evidence context
    const evidenceContext = await getEvidenceContext(caseId);
    const extractedFacts = evidenceContext.combinedFacts;

    // Build CaseFacts with precedence logic
    const result: Partial<CaseFacts> = {};

    for (const mapping of FIELD_MAPPINGS) {
        const { factField, questionnaireKey, extractedKey } = mapping;

        // 1. Check questionnaire value
        const qValue = persistence.get(keyFor(caseId, questionnaireKey));
        const qValid = qValue && qValue.trim() !== "" && qValue !== "NOT_SURE";

        if (qValid) {
            result[factField] = {
                value: qValue,
                source: "questionnaire"
            };
            continue;
        }

        // 2. Check extracted value
        if (extractedKey && extractedFacts) {
            const extracted = (extractedFacts as any)[extractedKey];
            if (extracted && typeof extracted === "object" && "value" in extracted && extracted.value) {
                result[factField] = {
                    value: extracted.value,
                    source: "extracted",
                    confidence: extracted.confidence
                };
                continue;
            }
        }

        // 3. No value available
        result[factField] = {
            value: null,
            source: "none"
        };
    }

    return result as CaseFacts;
}

/**
 * Get a summary of which facts are present (for logging/debugging).
 * Does not include actual values to avoid logging sensitive data.
 */
export function getCaseFactsSummary(facts: CaseFacts): {
    presentCount: number;
    fromQuestionnaire: number;
    fromExtracted: number;
    missing: string[];
} {
    const keys = Object.keys(facts) as Array<keyof CaseFacts>;
    let presentCount = 0;
    let fromQuestionnaire = 0;
    let fromExtracted = 0;
    const missing: string[] = [];

    for (const key of keys) {
        const field = facts[key];
        if (field.value !== null) {
            presentCount++;
            if (field.source === "questionnaire") fromQuestionnaire++;
            if (field.source === "extracted") fromExtracted++;
        } else {
            missing.push(key);
        }
    }

    return { presentCount, fromQuestionnaire, fromExtracted, missing };
}
