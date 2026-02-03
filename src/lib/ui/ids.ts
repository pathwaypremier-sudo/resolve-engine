/**
 * Generate stable, accessibility-safe IDs for UI elements.
 */
export const makeId = (caseId: string, suffix: string): string => `re-${caseId.slice(0, 8)}-${suffix}`;
