"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/motion/Reveal";
import { readCaseEvents } from "@/lib/case/events";

interface CaseIntegritySignalProps {
    caseId: string;
}

type IntegrityState = "COMPLETE" | "INCOMPLETE" | "NO_RESPONSE";

type IndicatorStatus = "complete" | "partial" | "none";

interface DerivedIndicators {
    state: IntegrityState;
    responseRecorded: IndicatorStatus;
    metadataLogged: IndicatorStatus;
    identifiersPresent: IndicatorStatus;
}

/**
 * Derive response integrity state and individual indicators from events.
 */
function deriveIndicators(caseId: string): DerivedIndicators {
    if (typeof window === "undefined") {
        return {
            state: "NO_RESPONSE",
            responseRecorded: "none",
            metadataLogged: "none",
            identifiersPresent: "none",
        };
    }

    const events = readCaseEvents(caseId);
    const responseEvents = events.filter(
        (e) => e.type === "RESPONSE_RECEIVED" || e.type === "APPEAL_REJECTED_PRE_COURT"
    );

    if (responseEvents.length === 0) {
        return {
            state: "NO_RESPONSE",
            responseRecorded: "none",
            metadataLogged: "none",
            identifiersPresent: "none",
        };
    }

    // Check metadata completeness across all response events
    let hasAnyFormat = false;
    let hasAnyMethod = false;
    let hasAnyIdentifiers = false;
    let allComplete = true;

    for (const event of responseEvents) {
        const meta = event.meta || {};
        const hasFormat = !!meta.response_type || !!meta.outcome;
        const hasMethod = !!meta.method || !!meta.via;
        const hasIdentifiers = !!meta.reference || !!meta.date || !!meta.linked_doc_name;

        if (hasFormat) hasAnyFormat = true;
        if (hasMethod) hasAnyMethod = true;
        if (hasIdentifiers) hasAnyIdentifiers = true;

        if (!hasFormat || !hasMethod || !hasIdentifiers) {
            allComplete = false;
        }
    }

    return {
        state: allComplete ? "COMPLETE" : "INCOMPLETE",
        responseRecorded: "complete",
        metadataLogged: hasAnyFormat && hasAnyMethod ? "complete" : hasAnyFormat || hasAnyMethod ? "partial" : "none",
        identifiersPresent: hasAnyIdentifiers ? "complete" : "none",
    };
}

const STATE_SUMMARIES: Record<IntegrityState, string> = {
    COMPLETE: "All response records are complete.",
    INCOMPLETE: "A response has been recorded with some metadata missing.",
    NO_RESPONSE: "No issuer response has been recorded yet.",
};

const DOT_COLORS: Record<IndicatorStatus, string> = {
    complete: "bg-emerald-500/70",
    partial: "bg-amber-500/70",
    none: "bg-slate-400/70",
};

const PILL_STYLES: Record<IndicatorStatus, string> = {
    complete: "border-emerald-200/60 bg-emerald-50/40",
    partial: "border-amber-200/60 bg-amber-50/40",
    none: "border-zinc-200/60 bg-zinc-50/40",
};

interface StatusPillProps {
    label: string;
    status: IndicatorStatus;
}

function StatusPill({ label, status }: StatusPillProps) {
    return (
        <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 ${PILL_STYLES[status]}`}
        >
            <span className={`w-[7px] h-[7px] rounded-full ${DOT_COLORS[status]}`} />
            <span className="text-sm text-zinc-600">{label}</span>
        </div>
    );
}

/**
 * Case Integrity Signal - Read-only, non-blocking, informational.
 * Investor-grade visual presentation.
 */
export default function CaseIntegritySignal({ caseId }: CaseIntegritySignalProps) {
    const [indicators, setIndicators] = useState<DerivedIndicators>({
        state: "NO_RESPONSE",
        responseRecorded: "none",
        metadataLogged: "none",
        identifiersPresent: "none",
    });

    useEffect(() => {
        setIndicators(deriveIndicators(caseId));
    }, [caseId]);

    return (
        <Reveal>
            <div className="rounded-xl border border-zinc-100 bg-white p-6 space-y-5 shadow-sm">
                {/* Header */}
                <div>
                    <h4 className="text-base font-semibold text-zinc-800 tracking-tight">Case integrity</h4>
                    <p className="text-xs text-zinc-400 mt-0.5">Reference only</p>
                </div>

                {/* Status Pills */}
                <div className="flex flex-wrap gap-3">
                    <StatusPill label="Response recorded" status={indicators.responseRecorded} />
                    <StatusPill label="Metadata logged" status={indicators.metadataLogged} />
                    <StatusPill label="Identifiers present" status={indicators.identifiersPresent} />
                </div>

                {/* Summary */}
                <p className="text-sm text-zinc-600 leading-relaxed">
                    {STATE_SUMMARIES[indicators.state]}
                </p>

                {/* Footer */}
                <div className="pt-4 border-t border-zinc-100">
                    <p className="text-[10px] text-zinc-400 tracking-wide">
                        Derived from recorded case data.
                    </p>
                </div>
            </div>
        </Reveal>
    );
}
