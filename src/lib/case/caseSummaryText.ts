import { redactReference } from "../redaction/redact";

export interface SummaryData {
    caseId: string;
    status: string;
    tier: string;
    identifiers: {
        issuer: string;
        reference: string;
    };
    counts: {
        docs: number;
        submissions: number;
        responses: number;
        outputs: number;
    };
    evidence: {
        present: number;
        missing: number;
        optional: number;
    };
    lastActivity: string | null;
}

export function formatCaseSummary(data: SummaryData): string {
    const lines = [
        `RESOLVE ENGINE CASE FILE`,
        `========================`,
        `Case ID:      ${data.caseId}`,
        `Status:       ${data.status.replace(/_/g, " ")}`,
        `Tier:         ${data.tier}`,
        `Last Active:  ${data.lastActivity ? new Date(data.lastActivity).toLocaleString() : "None"}`,
        ``,
        `COUNTS`,
        `------`,
        `Documents:    ${data.counts.docs}`,
        `Evidence:     ${data.evidence.present} Present / ${data.evidence.missing} Missing / ${data.evidence.optional} Optional`,
        `Submissions:  ${data.counts.submissions}`,
        `Responses:    ${data.counts.responses}`,
        `Outputs:      ${data.counts.outputs}`,
        ``,
        `IDENTIFIERS`,
        `-----------`,
        `Issuer:       ${data.identifiers.issuer || "(Not set)"}`,
        `Reference:    ${data.identifiers.reference || "(Not set)"}`,
        ``,
        `-----------------------------------------------------------`,
        `DISCLAIMER: Reference only. Keep everything in writing and keep copies.`
    ];

    return lines.join("\n");
}

export function redactCaseSummary(text: string, data: SummaryData): string {
    let output = text;

    // Redact Reference
    if (data.identifiers.reference) {
        const safeRef = redactReference(data.identifiers.reference);
        // Escape for regex
        const escapedRef = data.identifiers.reference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Replace all occurrences
        output = output.replace(new RegExp(escapedRef, 'g'), safeRef);
    }

    return output;
}
