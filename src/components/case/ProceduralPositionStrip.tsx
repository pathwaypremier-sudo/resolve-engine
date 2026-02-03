"use client";

import { useEffect, useState } from "react";
import Reveal from "@/components/motion/Reveal";
import { readCaseEvents } from "@/lib/case/events";

interface ProceduralPositionStripProps {
    caseId: string;
}

type ProceduralPosition =
    | "INTAKE_IN_PROGRESS"
    | "INTAKE_SUBMITTED"
    | "APPEAL_SUBMITTED"
    | "RESPONSE_RECORDED"
    | "AWAITING_RESPONSE";

const POSITION_LABELS: Record<ProceduralPosition, string> = {
    INTAKE_IN_PROGRESS: "Intake in progress.",
    INTAKE_SUBMITTED: "Intake submitted.",
    APPEAL_SUBMITTED: "Appeal submitted (recorded).",
    RESPONSE_RECORDED: "Issuer response recorded.",
    AWAITING_RESPONSE: "Awaiting issuer response (no response recorded).",
};

/**
 * Derive procedural position from events and storage.
 */
function derivePosition(caseId: string): ProceduralPosition {
    if (typeof window === "undefined") return "INTAKE_IN_PROGRESS";

    const intakeSubmitted = localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1";
    const events = readCaseEvents(caseId);

    const hasAppealSubmitted = events.some((e) => e.type === "APPEAL_SUBMITTED");
    const hasResponse = events.some(
        (e) => e.type === "RESPONSE_RECEIVED" || e.type === "APPEAL_REJECTED_PRE_COURT"
    );

    // Derive position
    if (hasResponse) {
        return "RESPONSE_RECORDED";
    }
    if (hasAppealSubmitted) {
        return "AWAITING_RESPONSE";
    }
    if (intakeSubmitted) {
        return "INTAKE_SUBMITTED";
    }
    return "INTAKE_IN_PROGRESS";
}

/**
 * Procedural Position Strip - Read-only, event-derived, display-only.
 */
export default function ProceduralPositionStrip({ caseId }: ProceduralPositionStripProps) {
    const [position, setPosition] = useState<ProceduralPosition>("INTAKE_IN_PROGRESS");

    useEffect(() => {
        setPosition(derivePosition(caseId));
    }, [caseId]);

    return (
        <Reveal>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 px-4 py-3 space-y-1">
                <div className="flex items-baseline gap-2">
                    <h4 className="text-sm font-medium text-zinc-700">Procedural position</h4>
                    <span className="text-[10px] text-zinc-400">reference only</span>
                </div>
                <p className="text-sm text-zinc-600">{POSITION_LABELS[position]}</p>
                <p className="text-[10px] text-zinc-400 pt-1">
                    Derived from recorded case events.
                </p>
            </div>
        </Reveal>
    );
}
