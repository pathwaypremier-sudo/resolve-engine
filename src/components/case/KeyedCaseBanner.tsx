"use client";

import { useEffect, useState } from "react";
// Context decoupled - receives explicit ID
import CaseContextBanner from "./CaseContextBanner";
import { type CaseIdentity } from "@/lib/case/identity";
import { getDisputeTypeLabel } from "@/lib/case/disputeType";

interface KeyedCaseBannerProps {
    caseId: string;
}

export default function KeyedCaseBanner({ caseId }: KeyedCaseBannerProps) {
    const [identity, setIdentity] = useState<CaseIdentity | null>(null);

    useEffect(() => {
        if (!caseId) return;

        const disputeType = localStorage.getItem(`re_case_${caseId}_dispute_type`) || "";
        const issuer = localStorage.getItem(`re_case_${caseId}_issuer`) || "";
        const reference = localStorage.getItem(`re_case_${caseId}_reference`) || "";

        const disputeTypeLabel = getDisputeTypeLabel(disputeType);

        setIdentity({
            id: caseId,
            issuer: issuer || "Not provided",
            reference: reference || "Not provided",
            issuerRaw: issuer || null,
            referenceRaw: reference || null,
            disputeTypeRaw: disputeType,
            disputeTypeLabel: disputeTypeLabel
        });
    }, [caseId]);

    if (!identity) return null;

    return <CaseContextBanner identity={identity} />;
}
