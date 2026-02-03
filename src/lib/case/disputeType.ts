export type DisputeType = "COUNCIL_PCN" | "PRIVATE_PARKING" | "CONSUMER_GOODS";

/**
 * Read the canonical dispute type for a case.
 * Returns null if missing, invalid, or "Not sure".
 */
export function readDisputeType(caseId: string): DisputeType | null {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`re_case_${caseId}_dispute_type`);
    if (raw === "COUNCIL_PCN" || raw === "PRIVATE_PARKING" || raw === "CONSUMER_GOODS") {
        return raw;
    }
    return null;
}

/**
 * Write the canonical dispute type for a case.
 */
export function writeDisputeType(caseId: string, type: DisputeType): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`re_case_${caseId}_dispute_type`, type);
}

/**
 * Clear the dispute type (e.g. if user selects "Not sure").
 */
export function clearDisputeType(caseId: string): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(`re_case_${caseId}_dispute_type`);
}

/**
 * Get the formatted human-readable label for a dispute type.
 */
export function getDisputeTypeLabel(type: DisputeType | string | null | undefined): string {
    if (type === "COUNCIL_PCN") return "Council PCN";
    if (type === "PRIVATE_PARKING") return "Private parking";
    if (type === "CONSUMER_GOODS") return "Consumer goods / retail";
    return "Provisional / Not sure";
}
