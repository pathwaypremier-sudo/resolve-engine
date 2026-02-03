"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useCase } from "./CaseContext";

export type EntitlementTier =
    | "NONE"
    | "APPEAL_BUILDER"
    | "MANAGED"
    | "PREMIUM"
    | "ANNUAL_ACCESS";

export type Capability =
    | "GENERATE_APPEAL"
    | "SHOW_SUBMISSION_INSTRUCTIONS"
    | "SUBMIT_ON_BEHALF"
    | "TRACK_RESPONSES"
    | "HANDLE_REJECTIONS_PRE_COURT"
    | "HANDLE_COURT_BAILIFFS_CCJ";

export type Entitlement = {
    tier: EntitlementTier;
    capabilities: Capability[];
};

const EntitlementContext = createContext<Entitlement | null>(null);

function tierToCapabilities(tier: EntitlementTier): Capability[] {
    switch (tier) {
        case "APPEAL_BUILDER":
            return ["GENERATE_APPEAL", "SHOW_SUBMISSION_INSTRUCTIONS"];
        case "MANAGED":
            return [
                "GENERATE_APPEAL",
                "SHOW_SUBMISSION_INSTRUCTIONS",
                "SUBMIT_ON_BEHALF",
                "TRACK_RESPONSES",
                "HANDLE_REJECTIONS_PRE_COURT",
            ];
        case "PREMIUM":
            return [
                "GENERATE_APPEAL",
                "SHOW_SUBMISSION_INSTRUCTIONS",
                "SUBMIT_ON_BEHALF",
                "TRACK_RESPONSES",
                "HANDLE_REJECTIONS_PRE_COURT",
                "HANDLE_COURT_BAILIFFS_CCJ",
            ];
        case "ANNUAL_ACCESS":
            // Annual gives Appeal Builder + Managed, NOT Premium
            return [
                "GENERATE_APPEAL",
                "SHOW_SUBMISSION_INSTRUCTIONS",
                "SUBMIT_ON_BEHALF",
                "TRACK_RESPONSES",
                "HANDLE_REJECTIONS_PRE_COURT",
            ];
        default:
            return [];
    }
}

export function EntitlementProvider({ children }: { children: React.ReactNode }) {
    const { id: caseId } = useCase();
    const [tier, setTier] = useState<EntitlementTier>("NONE");

    useEffect(() => {
        // per-case tier chosen at checkout
        const stored = localStorage.getItem(`re_case_tier_${caseId}`) as
            | EntitlementTier
            | null;

        if (stored) {
            setTier(stored);
            return;
        }

        // Optional: account-level annual access (future)
        // For now: if set, treat as Annual Access
        const annual = localStorage.getItem("re_annual_access") === "1";
        if (annual) setTier("ANNUAL_ACCESS");
    }, [caseId]);

    const entitlement = useMemo<Entitlement>(() => {
        return { tier, capabilities: tierToCapabilities(tier) };
    }, [tier]);

    return (
        <EntitlementContext.Provider value={entitlement}>
            {children}
        </EntitlementContext.Provider>
    );
}

export function useEntitlement() {
    const ctx = useContext(EntitlementContext);
    if (!ctx) throw new Error("useEntitlement must be used inside EntitlementProvider");
    return ctx;
}
