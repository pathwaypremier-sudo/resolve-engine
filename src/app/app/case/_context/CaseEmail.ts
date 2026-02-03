/**
 * Case email helper for Managed/Annual tiers.
 * Uses .test domain to indicate this is POC only.
 */

const STORAGE_KEY = (caseId: string) => `re_case_${caseId}_case_email`;

export function getOrCreateCaseEmail(caseId: string): { email: string; isNew: boolean } {
    const existing = localStorage.getItem(STORAGE_KEY(caseId));
    if (existing) {
        return { email: existing, isNew: false };
    }

    // Generate: case-{first8CharsOfCaseId}@resolve-engine.test
    const prefix = caseId.slice(0, 8).toLowerCase();
    const email = `case-${prefix}@resolve-engine.test`;
    localStorage.setItem(STORAGE_KEY(caseId), email);
    return { email, isNew: true };
}

export function getCaseEmail(caseId: string): string | null {
    return localStorage.getItem(STORAGE_KEY(caseId));
}
