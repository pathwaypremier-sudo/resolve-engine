/**
 * Case ID formatting helpers for consistent display.
 */

export function formatCaseIdShort(caseId: string): string {
    return caseId.slice(0, 8);
}

export function formatCaseIdFull(caseId: string): string {
    return caseId;
}
