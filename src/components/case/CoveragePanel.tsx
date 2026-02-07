"use client";

import { useState, useEffect } from "react";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import Link from "next/link";

interface CoverageData {
    isComplete: boolean;
    completeness: number;
    missingRequired: Array<{ label: string; path: string }>;
    roadmap: { stage: string; action: string };
}

export default function CoveragePanel({ caseId }: { caseId: string }) {
    const [coverage, setCoverage] = useState<CoverageData | null>(null);

    useEffect(() => {
        fetch(`/api/cases/coverage/status?caseId=${caseId}`)
            .then(res => res.json())
            .then(data => {
                if (data.ok) setCoverage(data.coverage);
            })
            .catch(console.error);
    }, [caseId]);

    if (!coverage) return null;

    return (
        <div className="space-y-6">
            <Panel>
                <PanelHeader
                    title="Case Coverage"
                    subtitle={`${coverage.completeness}% Ready for Delivery`}
                />
                <PanelBody>
                    <div className="space-y-4">
                        {/* Progress Bar */}
                        <div className="w-full bg-zinc-200 rounded-full h-2.5">
                            <div
                                className={`h-2.5 rounded-full ${coverage.isComplete ? "bg-green-600" : "bg-amber-500"}`}
                                style={{ width: `${coverage.completeness}%` }}
                            ></div>
                        </div>

                        {/* Roadmap Status */}
                        <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Current Stage</p>
                            <p className="text-sm font-medium text-slate-900">{coverage.roadmap.stage}</p>
                            <p className="text-xs text-slate-600 mt-1">Recommended: {coverage.roadmap.action}</p>
                        </div>

                        {/* Missing Requirements List */}
                        {!coverage.isComplete && (
                            <div className="bg-red-50 p-3 rounded-md border border-red-200">
                                <p className="text-xs text-red-800 uppercase tracking-wide font-bold mb-2">
                                    Missing Actions
                                </p>
                                <ul className="list-disc pl-4 space-y-1">
                                    {coverage.missingRequired.map((item, i) => (
                                        <li key={i} className="text-sm text-red-700">
                                            {item.label}
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-3">
                                    <Link
                                        href={`/app/case/${caseId}/intake/review`}
                                        className="text-xs font-medium text-red-800 hover:text-red-900 underline"
                                    >
                                        Go to Intake to fix &rarr;
                                    </Link>
                                </div>
                            </div>
                        )}

                        {coverage.isComplete && (
                            <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-md border border-green-200">
                                <span>✓</span>
                                <span className="text-sm font-medium">All required information collected.</span>
                            </div>
                        )}
                    </div>
                </PanelBody>
            </Panel>
        </div>
    );
}
