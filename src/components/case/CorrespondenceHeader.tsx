"use client";

import { useEffect, useState } from "react";
import { readCorrespondenceHeaderInput, buildCorrespondenceHeaderText } from "@/lib/case/correspondenceHeader";

interface CorrespondenceHeaderProps {
    caseId: string;
    dateISO?: string | null;
    variant?: "default" | "compact";
}

export default function CorrespondenceHeader({
    caseId,
    dateISO,
    variant = "default",
}: CorrespondenceHeaderProps) {
    const [data, setData] = useState<{ issuer: string | null; reference: string | null }>({
        issuer: null,
        reference: null,
    });

    useEffect(() => {
        setData(readCorrespondenceHeaderInput(caseId));
    }, [caseId]);

    // Used for display logic - we render structured HTML, not just pre-formatted text, 
    // but structure must match the text formatter logic labels.

    const shortId = caseId.slice(0, 8);

    // Using a definition list style or monospace block?
    // "Renders as a small, monospace-ish block... labels left, values right OR stacked lines"
    // Let's use a subtle monospace look.

    return (
        <div className={`font-mono text-sm text-zinc-600 ${variant === "compact" ? "text-xs" : ""}`}>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <span className="text-zinc-400 select-none">Case ID:</span>
                <span className="text-zinc-900">{shortId}</span>

                {data.reference && (
                    <>
                        <span className="text-zinc-400 select-none">Your ref:</span>
                        <span className="text-zinc-900">{data.reference}</span>
                    </>
                )}

                {data.issuer && (
                    <>
                        <span className="text-zinc-400 select-none">To:</span>
                        <span className="text-zinc-900">{data.issuer}</span>
                    </>
                )}

                {dateISO && (
                    <>
                        <span className="text-zinc-400 select-none">Date:</span>
                        <span className="text-zinc-900">{dateISO.slice(0, 10)}</span>
                    </>
                )}
            </div>
        </div>
    );
}
