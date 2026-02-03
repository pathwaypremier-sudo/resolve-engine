"use client";

import { formatCaseIdShort } from "@/lib/case/formatCaseId";
import { Building2, FileText, Hash } from "lucide-react";
import type { CaseStage } from "@/lib/case/deriveCaseStage";

type CaseHeaderProps = {
    caseId: string;
    title?: string;
    subtitle?: string;
    rightAction?: React.ReactNode;
    disputeType?: string | null;
    issuer?: string | null;
    reference?: string | null;
    stage?: CaseStage | null;
};

export default function CaseHeader({
    caseId,
    title,
    subtitle,
    rightAction,
    disputeType,
    issuer,
    reference,
    stage
}: CaseHeaderProps) {
    const displayTitle = title || `Case ${formatCaseIdShort(caseId)}`;

    return (
        <div className="border-b border-zinc-100 pb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                        {displayTitle}
                    </h1>
                    {subtitle && (
                        <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
                    )}

                    {stage && (
                        <div className="mt-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stage.tone === "complete"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-zinc-100 text-zinc-600"
                                }`}>
                                {stage.label}
                            </span>
                        </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-zinc-600">
                        {/* Case ID is always authoritative */}
                        <div className="flex items-center gap-2" title="Case ID">
                            <Hash className="h-4 w-4 text-zinc-400" />
                            <span className="font-mono text-xs">{formatCaseIdShort(caseId)}</span>
                        </div>

                        {/* Dispute Type */}
                        {disputeType && (
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${disputeType === "COUNCIL_PCN"
                                    ? "bg-slate-50 text-slate-700 ring-slate-600/20"
                                    : disputeType === "PRIVATE_PARKING"
                                        ? "bg-blue-50 text-blue-700 ring-blue-700/10"
                                        : "bg-zinc-50 text-zinc-600 ring-zinc-500/10"
                                    }`}>
                                    {disputeType === "COUNCIL_PCN" ? "Council PCN" :
                                        disputeType === "PRIVATE_PARKING" ? "Private Parking" :
                                            "Unknown Type"}
                                </span>
                            </div>
                        )}

                        {/* Issuer */}
                        {issuer && (
                            <div className="flex items-center gap-2" title="Issuer">
                                <Building2 className="h-4 w-4 text-zinc-400" />
                                <span>{issuer}</span>
                            </div>
                        )}

                        {/* Reference */}
                        {reference && (
                            <div className="flex items-center gap-2" title="Reference Number">
                                <FileText className="h-4 w-4 text-zinc-400" />
                                <span className="font-mono">{reference}</span>
                            </div>
                        )}
                    </div>
                </div>

                {rightAction && (
                    <div className="flex-shrink-0">
                        {rightAction}
                    </div>
                )}
            </div>
        </div>
    );
}
