export type CorrespondenceHeaderInput = {
    caseId: string;
    issuer?: string | null;
    reference?: string | null;
    date_iso?: string | null;
};

/**
 * Read correspondence header input from localStorage.
 */
export function readCorrespondenceHeaderInput(caseId: string): { issuer: string | null; reference: string | null } {
    if (typeof window === "undefined") {
        return { issuer: null, reference: null };
    }
    return {
        issuer: localStorage.getItem(`re_case_${caseId}_issuer`),
        reference: localStorage.getItem(`re_case_${caseId}_reference`),
    };
}

/**
 * format the standardized header block string for outputs.
 */
export function buildCorrespondenceHeaderText(input: CorrespondenceHeaderInput): string {
    const lines: string[] = [];

    // 1) Case ID: {shortId} (Using first 8 chars for brevity if full ID provided)
    // Actually ID is usually short. If UUID, slice it? 
    // The prompt says "Case ID: {shortId}". In existing code, usually `caseId.slice(0, 8)`.
    lines.push(`Case ID: ${input.caseId.slice(0, 8)}`);

    // 2) If reference present: "Your ref: {reference}"
    if (input.reference && input.reference.trim()) {
        lines.push(`Your ref: ${input.reference.trim()}`);
    }

    // 3) If issuer present: "To: {issuer}"
    if (input.issuer && input.issuer.trim()) {
        lines.push(`To: ${input.issuer.trim()}`);
    }

    // 4) If date provided: "Date: {yyyy-mm-dd}"
    if (input.date_iso) {
        // Ensure standard formatting (YYYY-MM-DD). If ISO string provided, just take first 10 chars.
        lines.push(`Date: ${input.date_iso.slice(0, 10)}`);
    }

    return lines.join("\n");
}
