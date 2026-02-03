import { persistence } from "../persistence/PersistenceAdapter";
import { VerticalId, getDefaultVerticalId, isVerticalEnabled } from "../verticals/verticals";

/**
 * Centralized Case Storage Access
 * All writes/reads for case data should eventually route through here.
 */

export const CaseStorage = {
    // Key Builders
    keys: {
        base: (caseId: string) => `re_case_${caseId}`,
        field: (caseId: string, field: string) => `re_case_${caseId}_${field}`,
        evidenceStatus: (caseId: string) => `re_case_${caseId}_evidence_status`,
        verticalId: (caseId: string) => `re_case_${caseId}_vertical`,
    },

    // Accessors
    getVerticalId(caseId: string): VerticalId {
        const val = persistence.get(this.keys.verticalId(caseId));
        if (val && isVerticalEnabled(val)) return val as VerticalId;
        return getDefaultVerticalId();
    },

    setVerticalId(caseId: string, id: VerticalId): void {
        const target = isVerticalEnabled(id) ? id : getDefaultVerticalId();
        persistence.set(this.keys.verticalId(caseId), target);
    },
    getEvidenceStatus(caseId: string): "PROVIDED" | "NONE_DECLARED" | null {
        const val = persistence.get(this.keys.evidenceStatus(caseId));
        if (val === "PROVIDED" || val === "NONE_DECLARED") return val;
        return null;
    },

    setEvidenceStatus(caseId: string, status: "PROVIDED" | "NONE_DECLARED"): void {
        persistence.set(this.keys.evidenceStatus(caseId), status);
    },

    getField(caseId: string, field: string): string | null {
        return persistence.get(this.keys.field(caseId, field));
    },

    setField(caseId: string, field: string, value: string): void {
        persistence.set(this.keys.field(caseId, field), value);
    },

    // Add specific accessors as we migrate
};
