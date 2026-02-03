import type { ExtractCaseFieldsResult } from "./types";
import type { CasePacket } from "../casePacket/buildCasePacket";
import { extractFactsFromText, type ExtractedFacts } from "./extractFactsFromText";
import { getCaseDocumentText } from "../case/docs/getCaseDocumentText";

/**
 * Extract case fields from a case packet.
 * POC: Uses regex-based extraction from text if available, plus existing intake values.
 * Never throws.
 */
export async function extractCaseFields(
    casePacket: CasePacket | { id: string } | unknown,
    additionalContext?: { text?: string }[]
): Promise<ExtractCaseFieldsResult & { detected?: ExtractedFacts }> {
    const warnings: string[] = [];
    const packet = casePacket as Partial<CasePacket> & { id?: string };

    if (!packet || typeof packet !== "object") {
        return {
            extracted: { issuer: null, reference: null, notice_date: null },
            confidence: null,
            warnings: ["Invalid packet input"],
            provider: "stub",
            version: "1.0",
        };
    }

    // 2. Run deterministic extraction with provenance tracking
    let detected: ExtractedFacts = {};

    // Legacy context (manual strings) has no provenance specific info, treat as generic
    if (additionalContext) {
        additionalContext.forEach(c => {
            if (c.text) {
                const d = extractFactsFromText(c.text);
                detected = { ...detected, ...d };
            }
        });
    }

    // Packet docs (legacy)
    if (!packet.id && packet.docs?.items) {
        packet.docs.items.forEach((d: any) => {
            if (d.text) {
                const f = extractFactsFromText(d.text);
                detected = { ...detected, ...f };
            }
        });
    }

    if (packet.id) {
        try {
            const records = await getCaseDocumentText(packet.id);
            // Prioritize NATIVE records, then OCR records
            const sortedRecords = records.sort((a, b) => {
                if (a.preferredSource === "NATIVE" && b.preferredSource !== "NATIVE") return -1;
                if (a.preferredSource !== "NATIVE" && b.preferredSource === "NATIVE") return 1;
                return 0;
            });

            // Extract from each
            // We want to "fill in" gaps. If we already have a high confidence match, skip?
            // Simple strategy: Merge. Later overrides earlier ONLY if earlier was low confidence?
            // Or just: First valid match wins (since we sorted by priority).

            for (const r of sortedRecords) {
                if (!r.preferredText) continue;

                const d = extractFactsFromText(r.preferredText);

                // Inject provenance
                (Object.keys(d) as Array<keyof ExtractedFacts>).forEach(k => {
                    const val = d[k];
                    if (val && typeof val === "object" && !Array.isArray(val)) {
                        val.sourceType = r.preferredSource as "NATIVE" | "OCR";
                    }
                });

                // Merge
                (Object.keys(d) as Array<keyof ExtractedFacts>).forEach(k => {
                    if (detected[k] === undefined) {
                        // Cast to any to avoid complex union matching in TS for this generic merge
                        (detected as any)[k] = d[k];
                    }
                });
            }

        } catch (e) {
            console.error("Extraction provenance loop failed", e);
            warnings.push("Document text fetch failed");
        }
    }

    if (Object.keys(detected).length === 0) {
        warnings.push("No extractable text found");
    }

    // 3. Merge with existing intake
    const intake: any = packet.intake || {};

    const extracted = {
        issuer: intake.issuer ?? detected.pcnRef?.value ?? null,
        reference: intake.reference ?? detected.pcnRef?.value ?? null,
        notice_date: intake.notice_date ?? detected.issueDate?.value ?? null,
    };

    return {
        extracted,
        confidence: {
            reference: detected.pcnRef?.confidence === "high" ? 0.9 : 0.5,
            notice_date: detected.issueDate?.confidence === "high" ? 0.9 : 0.5
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        provider: "regex-v1",
        version: "1.1",
        detected // Pass raw detections to UI
    };
}
