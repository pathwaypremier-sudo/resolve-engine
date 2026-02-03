export type CaseRegistryItem = {
    id: string;
    createdAt: string;
    lastActivityAt: string;
    disputeType: "COUNCIL_PCN" | "PRIVATE_PARKING" | "CONSUMER_GOODS" | null;
    issuerName?: string;
    title?: string;
};

const REGISTRY_KEY = "re_case_registry_v1";

export function readCaseRegistry(): CaseRegistryItem[] {
    if (typeof window === "undefined") return [];

    try {
        const raw = localStorage.getItem(REGISTRY_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        // Sort by lastActivityAt descending
        return parsed.sort((a, b) => {
            return new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime();
        });
    } catch (e) {
        console.error("Failed to read case registry", e);
        return [];
    }
}

export function upsertCaseRegistryItem(item: CaseRegistryItem): void {
    if (typeof window === "undefined") return;

    try {
        const current = readCaseRegistry();
        const index = current.findIndex((i) => i.id === item.id);

        if (index >= 0) {
            // Update existing
            current[index] = { ...current[index], ...item };
        } else {
            // Add new
            current.unshift(item); // Add to front
        }

        localStorage.setItem(REGISTRY_KEY, JSON.stringify(current));
    } catch (e) {
        console.error("Failed to update case registry", e);
    }
}
