"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Calendar } from "lucide-react";
import Panel, { PanelBody } from "@/components/ui/Panel";
import { KeyValueRow } from "@/components/ui/KeyValue";
import Reveal from "@/components/motion/Reveal";
import { ReferenceOnlyDisclaimer } from "@/components/ui/ReferenceOnlyDisclaimer";
import {
    computeDerivedDates,
    formatDateDisplay,
    type DerivedDate,
} from "@/lib/case/derivedDates";
import { makeId } from "@/lib/ui/ids";

interface DerivedDatesPanelProps {
    caseId: string;
}

export default function DerivedDatesPanel({ caseId }: DerivedDatesPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [derivedDates, setDerivedDates] = useState<DerivedDate[]>([]);

    const contentId = makeId(caseId, "derived-content");

    useEffect(() => {
        setDerivedDates(computeDerivedDates(caseId));
    }, [caseId]);

    return (
        <Reveal>
            <Panel variant="subtle" noPadding>
                <div className="p-4 space-y-3">
                    {/* Header - collapsible */}
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="w-full flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
                        aria-expanded={isOpen}
                        aria-controls={contentId}
                    >
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-zinc-400" />
                            <div>
                                <p className="text-sm font-medium text-zinc-900">
                                    Derived dates (reference only)
                                </p>
                                <p className="text-xs text-zinc-500">
                                    Computed from your timeline facts
                                </p>
                            </div>
                        </div>
                        <ChevronDown
                            className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""
                                }`}
                        />
                    </button>

                    {isOpen && (
                        <div id={contentId} className="space-y-3 pt-2 border-t border-zinc-100">
                            {derivedDates.length === 0 ? (
                                <p className="text-sm text-zinc-500">
                                    No derived dates available. Add timeline facts with a base date to
                                    see computed end dates.
                                </p>
                            ) : (
                                <ul className="space-y-2">
                                    {derivedDates.map((dd, index) => (
                                        <li
                                            key={index}
                                            className="rounded-lg bg-zinc-50 px-3 py-2"
                                        >
                                            <KeyValueRow label={dd.label} value={formatDateDisplay(dd.ends_on_iso)} />
                                            <p className="mt-1 text-xs text-zinc-500 text-right">
                                                {dd.days} days from {dd.base_date_label} ({formatDateDisplay(dd.base_date_iso)})
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Safety line */}
                            <div className="pt-1">
                                <p className="text-xs text-zinc-400 mb-1">Derived from case events.</p>
                                <ReferenceOnlyDisclaimer />
                            </div>
                        </div>
                    )}
                </div>
            </Panel>
        </Reveal>
    );
}
