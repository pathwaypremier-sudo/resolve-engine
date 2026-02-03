
import { CaseEvent } from "@/lib/case/events";

export type ReasoningPack = {
    meta: {
        caseId: string;
        generatedAt: string;
        schemaVersion: string;
    };
    facts: {
        // Confirmed facts (e.g. from intake or extraction)
        // Key: factId, Value: { value: string, provenance: string }
        items: Record<string, { value: unknown; provenance?: string }>;
    };
    questionnaire: {
        disputeType: string | null;
        answers: Record<string, unknown>; // Map of answerId -> value
        triggerSnapshot: string[]; // Active question IDs based on answers
    };
    evidence: {
        status: string; // e.g. "PROVIDED"
        files: Array<{
            id: string;
            name: string;
            type: string;
            size: number;
            hasNativeText: boolean;
            hasOCR: boolean;
        }>;
    };
    events: CaseEvent[];
    readiness: {
        status: string; // e.g. "READY" | "NOT_READY"
        blocking: string[];
        warnings: string[];
    };
};
