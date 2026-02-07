import type { AssessmentInput } from "./AssessmentInput";
import type { AssessmentResult, AssessmentCitation } from "./AssessmentResult";
import type { CaseFacts, CaseFactField } from "@/lib/caseFacts/getCaseFacts";
import { FIELD_MAPPINGS } from "@/lib/caseFacts/getCaseFacts";
import type { Confidence, ExtractedField } from "@/lib/extraction/extractFactsFromText";

/**
 * Enhanced CaseFactField with evidence provenance.
 */
export type FactWithProvenance = CaseFactField & {
    /** Files that likely support this fact (only if source="extracted") */
    evidenceDocIds: string[];
};

/**
 * Mapping of assessment checks to their citations.
 */
export type CheckProvenanceMap = Record<string, AssessmentCitation[]>;

/**
 * Explainability data derived from assessment input and result.
 */
export type AssessmentExplainability = {
    /** Facts enriched with document sources */
    factsWithSources: Record<keyof CaseFacts, FactWithProvenance>;

    /** Citations for each check */
    checkEvidenceMap: CheckProvenanceMap;
};

/**
 * Derive explainability metadata from the assessment input and result.
 * This helper links facts back to their source documents and aggregates citations.
 * 
 * @param input - The original input used for assessment
 * @param result - The output result from the assessment engine
 */
export function getExplainability(
    input: AssessmentInput,
    result: AssessmentResult
): AssessmentExplainability {
    // 1. Enrich facts with evidence provenance
    const factsWithSources = {} as Record<keyof CaseFacts, FactWithProvenance>;

    for (const mapping of FIELD_MAPPINGS) {
        const key = mapping.factField;
        const fact = input.facts[key];
        const extractedKey = mapping.extractedKey;

        let evidenceDocIds: string[] = [];

        // If fact is extracted, find which documents provided it
        if (fact.source === "extracted" && extractedKey) {
            // Find docs that contain this field in their extraction results
            evidenceDocIds = input.evidence.docs
                .filter(doc => {
                    if (!doc.extractedFacts) return false;
                    const extractedField = (doc.extractedFacts as any)[extractedKey] as ExtractedField | undefined;
                    // Loose check: if doc has a value for this field and it roughly matches the chosen value
                    return extractedField && extractedField.value === fact.value;
                })
                .map(doc => doc.id);
        }

        factsWithSources[key] = {
            ...fact,
            evidenceDocIds
        };
    }

    // 2. Map checks to citations
    const checkEvidenceMap: CheckProvenanceMap = {};
    for (const check of result.checks) {
        if (check.citations.length > 0) {
            checkEvidenceMap[check.id] = check.citations;
        }
    }

    return {
        factsWithSources,
        checkEvidenceMap
    };
}
