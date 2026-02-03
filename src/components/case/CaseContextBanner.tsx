import React from "react";
import { type CaseIdentity } from "@/lib/case/identity";

interface CaseContextBannerProps {
    identity: CaseIdentity;
}

export default function CaseContextBanner({ identity }: CaseContextBannerProps) {
    return (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-zinc-900">
                        Case {identity.id.slice(0, 8)}
                    </span>
                    <span className="inline-flex items-center rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs font-medium text-zinc-600">
                        {identity.disputeTypeLabel}
                    </span>
                </div>

                <div className="hidden sm:block">
                    <div className="flex flex-col gap-1 min-w-[200px]">
                        {identity.issuerRaw && (
                            <div className="flex justify-between gap-4 text-xs">
                                <span className="text-zinc-500 uppercase tracking-wide">Issuer</span>
                                <span className="font-medium text-zinc-900">{identity.issuerRaw}</span>
                            </div>
                        )}
                        {identity.referenceRaw && (
                            <div className="flex justify-between gap-4 text-xs">
                                <span className="text-zinc-500 uppercase tracking-wide">Reference</span>
                                <span className="font-medium text-zinc-900">{identity.referenceRaw}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
