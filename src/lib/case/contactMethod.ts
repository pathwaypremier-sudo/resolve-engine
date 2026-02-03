
export type ContactMethodType = "EMAIL" | "PORTAL" | "POST" | "UNKNOWN";
export type ContactMethodSource = "NOTICE" | "WEBSITE" | "USER" | "OTHER";

export type ContactMethod = {
    version: "1.0";
    method: ContactMethodType;
    value: string | null;
    recorded_from: ContactMethodSource | null;
    notes: string | null;
    updated_at_iso: string;
};

export function readContactMethod(caseId: string): ContactMethod | null {
    if (typeof window === "undefined") return null;
    const json = localStorage.getItem(`re_case_${caseId}_contact_method`);
    if (!json) return null;
    try {
        return JSON.parse(json) as ContactMethod;
    } catch (e) {
        console.warn("Failed to parse contact method", e);
        return null; // Gracefully handle corruption
    }
}

export function saveContactMethod(caseId: string, data: ContactMethod): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(`re_case_${caseId}_contact_method`, JSON.stringify(data));
}
