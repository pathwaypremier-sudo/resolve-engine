import type { AssessmentInput } from "@/lib/assessment/AssessmentInput";
import type { AssessmentResult } from "@/lib/assessment/AssessmentResult";
import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * Valid file types for a NotebookLM pack.
 */
export type NotebookLMPack = {
    "case-summary.md": string;
    "evidence-index.md": string;
    "evidence-merged.txt": string;
};

/**
 * Generate a source pack suitable for uploading to Google NotebookLM.
 * This pack enables LLM reasoning over the specific case context.
 * 
 * @param input - The case inputs (facts, evidence)
 * @param result - The assessment result (verdict, checks)
 */
export function generateNotebookLMPack(
    input: AssessmentInput,
    result: AssessmentResult
): NotebookLMPack {
    return {
        "case-summary.md": generateCaseSummary(input, result),
        "evidence-index.md": generateEvidenceIndex(input),
        "evidence-merged.txt": generateMergedEvidence(input)
    };
}

function generateCaseSummary(input: AssessmentInput, result: AssessmentResult): string {
    const lines: string[] = [];
    lines.push(`# Case Summary: ${input.caseId}`);
    lines.push(`Date: ${new Date().toISOString().split('T')[0]}`);
    lines.push("");

    lines.push("## Facts (Canonical)");
    for (const [key, field] of Object.entries(input.facts)) {
        const val = (field as any).value;
        const source = (field as any).source;
        if (val) {
            lines.push(`- **${key}**: ${val} (Source: ${source})`);
        }
    }
    lines.push("");

    lines.push("## Assessment Verdict");
    lines.push(`**Verdict**: ${result.verdict}`);
    if (result.reasons.length > 0) {
        lines.push(`**Reasons**:`);
        result.reasons.forEach(r => lines.push(`- ${r}`));
    }
    lines.push("");

    lines.push("## Checks Analysis");
    for (const check of result.checks) {
        lines.push(`- [${check.passed ? "PASS" : "FAIL"}] **${check.label}**: ${check.rationale}`);
    }
    lines.push("");

    if (result.missingInfo.length > 0) {
        lines.push("## Missing Information");
        result.missingInfo.forEach(m => lines.push(`- ${m}`));
    }

    return lines.join("\n");
}

function generateEvidenceIndex(input: AssessmentInput): string {
    const lines: string[] = [];
    lines.push(`# Evidence Index`);
    lines.push(`Total Documents: ${input.evidence.docs.length}`);
    lines.push("");

    if (input.evidence.docs.length === 0) {
        lines.push("No documents available.");
    } else {
        input.evidence.docs.forEach((doc, idx) => {
            lines.push(`## Document ${idx + 1}`);
            lines.push(`- **ID**: ${doc.id}`);
            lines.push(`- **Filename**: ${doc.filename || "Unknown"}`);
            lines.push(`- **Provenance**: ${doc.provenance || "N/A"}`);
            // Describe extracted facts briefly if any
            if (doc.extractedFacts) {
                const count = Object.keys(doc.extractedFacts).length;
                lines.push(`- **Extracted Fields**: ${count} fields detected`);
            }
            lines.push("");
        });
    }

    return lines.join("\n");
}

function generateMergedEvidence(input: AssessmentInput): string {
    const parts: string[] = [];

    parts.push("=== BEGIN EVIDENCE MERGE ===");
    parts.push(`Case ID: ${input.caseId}`);
    parts.push(`Generated: ${new Date().toISOString()}`);
    parts.push("");

    input.evidence.docs.forEach((doc, idx) => {
        parts.push(`--- DOCUMENT ${idx + 1} START ---`);
        parts.push(`Meta: ID=${doc.id} Filename=${doc.filename || "Unknown"}`);
        parts.push("");
        parts.push(doc.text || "(No text content)");
        parts.push("");
        parts.push(`--- DOCUMENT ${idx + 1} END ---`);
        parts.push("");
    });

    parts.push("=== END EVIDENCE MERGE ===");
    return parts.join("\n");
}
