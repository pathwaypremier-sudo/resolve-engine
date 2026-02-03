"use client";

import { useEffect, useState } from "react";
import Panel from "@/components/ui/Panel";
import { formatCaseIdShort } from "@/lib/case/formatCaseId";

interface CaseIdentifiersProps {
    caseId: string;
}

export default function CaseIdentifiers({ caseId }: CaseIdentifiersProps) {
    const [issuer, setIssuer] = useState<string | null>(null);
    const [reference, setReference] = useState<string | null>(null);

    useEffect(() => {
        const storedIssuer = localStorage.getItem(`re_case_${caseId}_issuer`);
        const storedRef = localStorage.getItem(`re_case_${caseId}_reference`);
        setIssuer(storedIssuer && storedIssuer !== "NOT_SURE" ? storedIssuer : null);
        setReference(storedRef && storedRef !== "NOT_SURE" ? storedRef : null);
    }, [caseId]);

    return (
        <Panel variant="subtle" className="space-y-2">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                Case identifiers
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div>
                    <span className="text-zinc-500">Case ID:</span>{" "}
                    <span className="font-mono text-zinc-900">{formatCaseIdShort(caseId)}</span>
                </div>
                <div>
                    <span className="text-zinc-500">Issuer:</span>{" "}
                    <span className="text-zinc-900">{issuer ?? "Not set"}</span>
                </div>
                <div>
                    <span className="text-zinc-500">Reference:</span>{" "}
                    <span className="font-mono text-zinc-900">{reference ?? "Not set"}</span>
                </div>
            </div>
            <p className="text-xs text-zinc-400">
                Use these identifiers in every message. Keep everything in writing and keep copies.
            </p>
        </Panel>
    );
}
