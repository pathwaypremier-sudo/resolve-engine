"use client";

import { useEffect, useState } from "react";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import { deriveDeliverableReadiness } from "@/lib/assessment/deriveAssessmentReadinessFacts";

export default function DeliverReadinessPanel({ caseId }: { caseId: string }) {
    const [readiness, setReadiness] = useState<ReturnType<typeof deriveDeliverableReadiness> | null>(null);

    useEffect(() => {
        setReadiness(deriveDeliverableReadiness(caseId));
    }, [caseId]);

    if (!readiness) return null;

    if (readiness.isBlocking) {
        return (
            <Panel>
                <PanelHeader
                    title="Further information required"
                    subtitle="Case record incomplete"
                    className="border-b-amber-100 bg-amber-50/50"
                />
                <PanelBody className="space-y-4">
                    <div className="rounded-lg bg-amber-50 p-4 border border-amber-100 text-sm text-amber-900">
                        <p className="font-medium mb-2">Deliverables require complete case facts.</p>
                        <p className="mb-3 text-amber-800">Please record the following in the assessment to proceed:</p>
                        <ul className="space-y-2 list-disc list-inside">
                            {readiness.issues.filter(i => i.severity === "BLOCKING").map((issue, idx) => (
                                <li key={idx}>
                                    {issue.href ? (
                                        <a href={issue.href} className="underline hover:text-amber-700">{issue.label}</a>
                                    ) : (
                                        <span>{issue.label}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </PanelBody>
            </Panel>
        );
    }

    // If safe, show any warnings or just a "Ready" indicator + warnings
    const warnings = readiness.issues.filter(i => i.severity === "WARNING");

    return (
        <Panel>
            <PanelHeader
                title="Ready to export"
                subtitle={warnings.length > 0 ? "Case information incomplete" : "All checks passed"}
                className="border-b-emerald-100 bg-emerald-50/50"
            />
            <PanelBody className="space-y-3">
                {warnings.length > 0 ? (
                    <div className="rounded-lg bg-blue-50 p-4 border border-blue-100 text-sm text-blue-900">
                        <p className="font-medium mb-2">Note:</p>
                        <ul className="space-y-1 list-disc list-inside text-blue-800">
                            {warnings.map((w, i) => (
                                <li key={i}>{w.label}</li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <p className="text-sm text-zinc-600">
                        The case record appears complete for generating deliverables.
                    </p>
                )}
            </PanelBody>
        </Panel>
    );
}
