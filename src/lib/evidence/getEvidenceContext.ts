"use client";

import { getCaseDocumentText, type DocTextRecord } from "@/lib/case/docs/getCaseDocumentText";
import { extractFactsFromText, type ExtractedFacts, type Confidence } from "@/lib/extraction/extractFactsFromText";

/**
 * Evidence document with extracted text and facts.
 */
export type EvidenceDoc = {
    id: string;
    filename?: string;
    text: string;
    extractedFacts?: ExtractedFacts;
    confidence?: Record<string, Confidence>;
    provenance?: "OCR" | "NATIVE" | "MIXED";
};

/**
 * Complete evidence context for a case.
 */
export type EvidenceContext = {
    caseId: string;
    docs: EvidenceDoc[];
    combinedText: string;
    combinedFacts: Partial<ExtractedFacts>;
};

/**
 * Build confidence map from ExtractedFacts.
 */
function buildConfidenceMap(facts: ExtractedFacts): Record<string, Confidence> {
    const map: Record<string, Confidence> = {};
    const keys = Object.keys(facts) as Array<keyof ExtractedFacts>;
    for (const key of keys) {
        if (key === "rawMentions") continue;
        const field = facts[key];
        if (field && typeof field === "object" && "confidence" in field) {
            map[key] = field.confidence;
        }
    }
    return map;
}

/**
 * Merge two ExtractedFacts objects, preferring higher confidence values.
 */
function mergeExtractedFacts(a: Partial<ExtractedFacts>, b: ExtractedFacts): Partial<ExtractedFacts> {
    const result = { ...a };
    const keys = Object.keys(b) as Array<keyof ExtractedFacts>;

    for (const key of keys) {
        if (key === "rawMentions") continue;

        const existing = result[key];
        const incoming = b[key];

        if (!incoming || typeof incoming !== "object" || !("value" in incoming)) continue;

        if (!existing || typeof existing !== "object" || !("value" in existing)) {
            // No existing value, take incoming
            (result as any)[key] = incoming;
        } else {
            // Compare confidence: high > med > low
            const confidenceOrder: Record<Confidence, number> = { high: 3, med: 2, low: 1 };
            const existingConf = confidenceOrder[existing.confidence] || 0;
            const incomingConf = confidenceOrder[incoming.confidence] || 0;

            if (incomingConf > existingConf) {
                (result as any)[key] = incoming;
            }
        }
    }

    return result;
}

/**
 * Load all evidence for a case including document text and extracted facts.
 * 
 * @param caseId - The case ID to load evidence for
 * @returns EvidenceContext with all documents, combined text, and merged facts
 */
export async function getEvidenceContext(caseId: string): Promise<EvidenceContext> {
    if (typeof window === "undefined") {
        return {
            caseId,
            docs: [],
            combinedText: "",
            combinedFacts: {}
        };
    }

    // 1. Load document text records using existing helper
    const textRecords = await getCaseDocumentText(caseId);

    // 2. Build EvidenceDoc array with extracted facts
    const docs: EvidenceDoc[] = [];

    for (const record of textRecords) {
        if (!record.preferredText || record.preferredSource === "NONE") continue;

        // Extract facts from the document text
        const extractedFacts = extractFactsFromText(record.preferredText);

        // Build confidence map
        const confidence = buildConfidenceMap(extractedFacts);

        const doc: EvidenceDoc = {
            id: record.docId,
            filename: record.filename,
            text: record.preferredText,
            extractedFacts,
            confidence,
            provenance: record.preferredSource as "NATIVE" | "OCR"
        };

        docs.push(doc);
    }

    // 3. Build combined text (deterministic, sorted by doc ID for stability)
    const sortedDocs = [...docs].sort((a, b) => a.id.localeCompare(b.id));
    const combinedText = sortedDocs
        .map(d => `--- Document: ${d.id} ---\n${d.text}`)
        .join("\n\n");

    // 4. Merge facts across all documents (prefer higher confidence)
    let combinedFacts: Partial<ExtractedFacts> = {};
    for (const doc of sortedDocs) {
        if (doc.extractedFacts) {
            combinedFacts = mergeExtractedFacts(combinedFacts, doc.extractedFacts);
        }
    }

    return {
        caseId,
        docs,
        combinedText,
        combinedFacts
    };
}
