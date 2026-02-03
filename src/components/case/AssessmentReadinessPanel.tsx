"use client";

import { useEffect, useState } from "react";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import { deriveAssessmentReadinessFacts, ReadinessFact } from "@/lib/assessment/deriveAssessmentReadinessFacts";

export default function AssessmentReadinessPanel({ caseId, revision }: { caseId: string, revision?: number }) {
    const [facts, setFacts] = useState<ReadinessFact[]>([]);

    useEffect(() => {
        setFacts(deriveAssessmentReadinessFacts(caseId));
    }, [caseId, revision]);

    const StatusPill = ({ status, detail }: { status: string, detail?: string }) => {
        if (status === "recorded") {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {detail || "Recorded"}
                </span>
            );
        }
        if (status === "partial") {
            return (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {detail || "Partial"}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 border border-zinc-200">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                {detail || "Not recorded"}
            </span>
        );
    };

    if (facts.length === 0) return null;

    return (
        <Panel>
            <PanelHeader
                title="Assessment notes"
                subtitle="Based on current entries"
            />
            <PanelBody className="space-y-3">
                <ul className="divide-y divide-zinc-50">
                    {facts.map((fact, idx) => (
                        <li key={idx} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                            <span className="text-sm text-zinc-600">{fact.label}</span>
                            <StatusPill status={fact.status} detail={fact.detail} />
                        </li>
                    ))}
                </ul>
                <p className="pt-2 text-xs text-zinc-400">
                    These notes reflect what is currently recorded in this case.
                </p>
            </PanelBody>
        </Panel>
    );
}
