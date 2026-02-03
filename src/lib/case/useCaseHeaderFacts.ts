"use client";

import { useState, useEffect } from "react";
import { deriveCaseStage, type CaseStage } from "./deriveCaseStage";

export function useCaseHeaderFacts(caseId: string) {
    const [issuer, setIssuer] = useState<string | null>(null);
    const [reference, setReference] = useState<string | null>(null);
    const [disputeType, setDisputeType] = useState<string | null>(null);
    const [stage, setStage] = useState<CaseStage | null>(null);

    useEffect(() => {
        const storedIssuer = localStorage.getItem(`re_case_${caseId}_issuer`);
        const storedRef = localStorage.getItem(`re_case_${caseId}_reference`);
        const storedDT = localStorage.getItem(`re_case_${caseId}_dispute_type`);

        setIssuer(storedIssuer && storedIssuer !== "NOT_SURE" ? storedIssuer : null);
        setReference(storedRef && storedRef !== "NOT_SURE" ? storedRef : null);
        setDisputeType(storedDT || null);
        setStage(deriveCaseStage(caseId));
    }, [caseId]);

    return { issuer, reference, disputeType, stage };
}
