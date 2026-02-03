"use client";

import { useState, useEffect } from "react";
import { ChevronDown, CheckCircle2, AlertCircle, FileText, ArrowRight } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import {
    buildEvidenceChecklist,
    type EvidenceChecklist as EvidenceChecklistType,
    type EvidenceItem,
} from "@/lib/case/evidenceChecklist";
import { type CaseEvent, appendCaseEvent } from "@/lib/case/events";
import { buildMissingEvidenceNote } from "@/lib/case/followUpNote";
import { useShareSafe } from "@/lib/ui/shareSafe";
import { Copy, Download } from "lucide-react";
import Link from "next/link";

interface EvidenceChecklistProps {
    caseId: string;
}

export default function EvidenceChecklist({ caseId }: EvidenceChecklistProps) {
    // ALL HOOKS MUST BE DECLARED FIRST - before any early returns
    const [isOpen, setIsOpen] = useState(true);
    const [checklist, setChecklist] = useState<EvidenceChecklistType | null>(null);
    const [gapFeedback, setGapFeedback] = useState("");
    const [noteFeedback, setNoteFeedback] = useState("");
    const { isRedacted } = useShareSafe();

    // Derive intakeSubmitted safely (not a hook, just a computed value)
    const intakeSubmitted = typeof window !== "undefined"
        ? localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1"
        : false;

    useEffect(() => {
        setChecklist(buildEvidenceChecklist(caseId));
    }, [caseId]);

    // Early return AFTER all hooks are declared
    if (!checklist) return null;

    // Check for explicit "No Evidence" declaration
    const evidenceStatus = typeof window !== "undefined"
        ? localStorage.getItem(`re_case_${caseId}_evidence_status`)
        : null;

    if (evidenceStatus === "NONE_DECLARED") {
        const EmptyState = require("@/components/ui/EmptyState").default;
        return (
            <Reveal>
                <Panel variant="subtle">
                    <div className="p-4">
                        <EmptyState
                            title="No documents added"
                            body="This section derives from uploaded documents. Your case can continue using manual entries."
                            primaryAction={{
                                label: "Add documents",
                                href: `/intake?case=${caseId}`
                            }}
                            icon={FileText}
                        />
                    </div>
                </Panel>
            </Reveal>
        );
    }

    const { summary, items, disclaimer } = checklist;

    function handleRecordGap() {
        if (!checklist) return;

        const missingRequired = items.filter(i => i.status === "MISSING").map(i => i.label);
        const optionalMissing = items.filter(i => i.status === "OPTIONAL").map(i => i.label);
        const present = items.filter(i => i.status === "PRESENT").map(i => i.label);

        const event: CaseEvent = {
            type: "EVIDENCE_GAP_SNAPSHOT",
            at: new Date().toISOString(),
            meta: {
                missing_required: missingRequired,
                optional_missing: optionalMissing,
                present: present,
                counts: {
                    present: summary.present,
                    missing: summary.missing,
                    optional: summary.optional
                }
            }
        };

        appendCaseEvent(caseId, event);
        setGapFeedback("Recorded");
        setTimeout(() => setGapFeedback(""), 2000);
    }

    // PATCH10: Follow-up Note
    function handleCopyNote() {
        if (!checklist) return;
        const note = buildMissingEvidenceNote(caseId, checklist, isRedacted);
        if (!note) return;

        navigator.clipboard.writeText(note);
        setNoteFeedback("Copied");
        setTimeout(() => setNoteFeedback(""), 2000);
    }

    function handleDownloadNote() {
        if (!checklist) return;
        const note = buildMissingEvidenceNote(caseId, checklist, isRedacted);
        if (!note) return;

        const blob = new Blob([note], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED" : "";
        const filename = `resolve-engine-case-${shortId}-evidence-followup${safeSuffix}.txt`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Filter for "Next to locate"
    const missingRequired = items.filter((i) => i.status === "MISSING");
    const optionalMissing = items.filter((i) => i.status === "OPTIONAL");

    return (
        <Reveal>
            <Panel variant="subtle" className="space-y-3">
                {/* Header - collapsible */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between text-left"
                    aria-expanded={isOpen}
                >
                    <div className="flex-1">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-zinc-900">
                                Evidence checklist
                            </p>
                            {/* Summary counts */}
                            <div className="flex items-center gap-3 text-xs mr-2">
                                <span className="text-green-600 font-medium">
                                    {summary.present} Found
                                </span>
                                {summary.missing > 0 && (
                                    <span className="text-amber-600 font-medium">
                                        {summary.missing} Missing
                                    </span>
                                )}
                                <span className="text-zinc-400">{summary.optional} Optional</span>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Case file completeness (checklist only).
                            {intakeSubmitted && (
                                <>
                                    {" · "}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRecordGap();
                                        }}
                                        className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
                                        title="Log current evidence gap to timeline"
                                    >
                                        {gapFeedback || "Record evidence gap"}
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                    <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </button>

                {isOpen && (
                    <div className="space-y-4 pt-3 border-t border-zinc-100">
                        {/* Items List */}
                        <ul className="space-y-2">
                            {items.map((item) => (
                                <li
                                    key={item.key}
                                    className="flex items-start gap-3 rounded-lg bg-white p-2 border border-zinc-100"
                                >
                                    <ItemIcon status={item.status} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm text-zinc-900 font-medium">
                                                {item.label}
                                            </p>
                                            <StatusBadge status={item.status} />
                                        </div>
                                        {item.status === "PRESENT" &&
                                            item.matched_docs.length > 0 && (
                                                <div className="mt-1 flex flex-wrap gap-1">
                                                    {item.matched_docs.map((doc) => (
                                                        <span
                                                            key={doc.id}
                                                            className="inline-flex items-center gap-1 rounded bg-zinc-50 px-1.5 py-0.5 text-[10px] text-zinc-500 border border-zinc-200 truncate max-w-full"
                                                        >
                                                            <FileText className="h-3 w-3" />
                                                            {doc.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        {item.status !== "PRESENT" && (
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                {item.status === "MISSING"
                                                    ? "Required for completeness"
                                                    : "If applicable / available"}
                                            </p>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Next to locate guidance */}
                        {(missingRequired.length > 0 || optionalMissing.length > 0) && (
                            <div className="rounded-lg bg-zinc-50 p-3 space-y-3">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                        Next to locate (if applicable)
                                    </p>
                                    <ul className="space-y-2 text-sm">
                                        {missingRequired.map((item) => (
                                            <li key={item.key} className="flex items-start gap-2">
                                                <span className="text-amber-500 font-bold">•</span>
                                                <span className="text-zinc-700">
                                                    Locate the <strong>{item.label}</strong> to complete
                                                    your file.
                                                </span>
                                            </li>
                                        ))}
                                        {missingRequired.length === 0 &&
                                            optionalMissing.slice(0, 2).map((item) => (
                                                <li key={item.key} className="flex items-start gap-2">
                                                    <span className="text-zinc-400">•</span>
                                                    <span className="text-zinc-600">
                                                        Check if you have{" "}
                                                        <strong>{item.label}</strong> available.
                                                    </span>
                                                </li>
                                            ))}
                                    </ul>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <Link
                                        href={`/app/case/${caseId}/intake/docs`}
                                        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-900 hover:text-zinc-700 hover:underline"
                                    >
                                        Upload documents <ArrowRight className="h-3 w-3" />
                                    </Link>

                                    {/* PATCH10: Follow-up Note Actions */}
                                    {intakeSubmitted && missingRequired.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleCopyNote}
                                                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                                                title="Copy follow-up request note"
                                            >
                                                <Copy className="h-3 w-3" />
                                                <span>{noteFeedback || "Copy note"}</span>
                                            </button>
                                            <button
                                                onClick={handleDownloadNote}
                                                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
                                                title="Download follow-up request note"
                                            >
                                                <Download className="h-3 w-3" />
                                                <span>.txt</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Disclaimer */}
                        <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-100">
                            {disclaimer}
                        </p>
                    </div>
                )}
            </Panel>
        </Reveal>
    );
}

function ItemIcon({ status }: { status: "PRESENT" | "MISSING" | "OPTIONAL" }) {
    if (status === "PRESENT") {
        return <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />;
    }
    if (status === "MISSING") {
        return <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />;
    }
    return <div className="h-5 w-5 rounded-full border-2 border-zinc-200 flex-shrink-0 mt-0.5" />;
}

function StatusBadge({ status }: { status: "PRESENT" | "MISSING" | "OPTIONAL" }) {
    if (status === "PRESENT") {
        return (
            <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700 border border-green-100">
                Present
            </span>
        );
    }
    if (status === "MISSING") {
        return (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-100">
                Missing
            </span>
        );
    }
    return (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 border border-zinc-200">
            Optional
        </span>
    );
}
