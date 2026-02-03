"use client";

import { createContext, useContext, useMemo } from "react";
import { getCaseEvents } from "./CaseEvents";

export type CaseStatus =
    | "INTAKE_IN_PROGRESS"
    | "ASSESSMENT_READY"
    | "ENTITLED"
    | "PREMIUM_ACTIVE";

export type Case = {
    id: string;
    status: CaseStatus;
};

const CaseContext = createContext<Case | null>(null);

function deriveStatus(caseId: string): CaseStatus {
    const events = getCaseEvents(caseId);

    const intakeSubmitted = events.some((e) => e.type === "INTAKE_SUBMITTED");
    const tierEvent = events.find((e) => e.type === "TIER_SELECTED");

    if (!intakeSubmitted) {
        return "INTAKE_IN_PROGRESS";
    }

    if (!tierEvent) {
        return "ASSESSMENT_READY";
    }

    const tier = tierEvent.meta?.tier;
    if (tier === "premium") {
        return "PREMIUM_ACTIVE";
    }

    return "ENTITLED";
}

export function CaseProvider({
    caseId,
    children,
}: {
    caseId: string;
    children: React.ReactNode;
}) {
    const caseData = useMemo<Case>(() => {
        return {
            id: caseId,
            status: deriveStatus(caseId),
        };
    }, [caseId]);

    return (
        <CaseContext.Provider value={caseData}>
            {children}
        </CaseContext.Provider>
    );
}

export function useCase() {
    const ctx = useContext(CaseContext);
    if (!ctx) {
        throw new Error("useCase must be used inside CaseProvider");
    }
    return ctx;
}
