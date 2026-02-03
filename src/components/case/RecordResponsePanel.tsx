"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Save, FileText, Calendar } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { addCaseEvent } from "@/app/app/case/_context/CaseEvents";
import CorrespondenceHeader from "@/components/case/CorrespondenceHeader";

interface RecordResponsePanelProps {
    caseId: string;
}

// Minimal docs interface
type Doc = {
    id: string;
    name: string;
    category: string;
};

import { makeId } from "@/lib/ui/ids";

// Record quality indicator statuses
type QualityStatus = "complete" | "partial" | "none";

const DOT_COLORS: Record<QualityStatus, string> = {
    complete: "bg-emerald-500/70",
    partial: "bg-amber-500/70",
    none: "bg-slate-400/70",
};

function MiniDot({ status }: { status: QualityStatus }) {
    return <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[status]}`} />;
}

interface RecordQualityCueProps {
    formatStatus: QualityStatus;
    methodStatus: QualityStatus;
    identifiersStatus: QualityStatus;
}

function RecordQualityCue({ formatStatus, methodStatus, identifiersStatus }: RecordQualityCueProps) {
    return (
        <div className="space-y-2 py-2">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Record quality (reference only)</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    <MiniDot status={formatStatus} /> Format
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    <MiniDot status={methodStatus} /> Method
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    <MiniDot status={identifiersStatus} /> Identifiers
                </span>
            </div>
            <p className="text-[10px] text-zinc-400">Reference only. Based on current entries. Saving records the final values.</p>
        </div>
    );
}

export default function RecordResponsePanel({ caseId }: RecordResponsePanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [docs, setDocs] = useState<Doc[]>([]);
    const [saved, setSaved] = useState(false);

    // Stable IDs
    const contentId = makeId(caseId, "response-content");
    const typeId = makeId(caseId, "response-type");
    const dateId = makeId(caseId, "response-date");
    const linkId = makeId(caseId, "response-link");
    const notesId = makeId(caseId, "response-notes");

    // Form state
    const [responseType, setResponseType] = useState<string>("ACKNOWLEDGEMENT");
    const [receivedDate, setReceivedDate] = useState<string>("");
    const [linkedDocId, setLinkedDocId] = useState<string>(""); // "" = None
    const [notes, setNotes] = useState<string>("");

    // Read docs for linking
    useEffect(() => {
        const json = localStorage.getItem(`re_case_${caseId}_docs`);
        if (json) {
            try {
                const parsed = JSON.parse(json);
                if (Array.isArray(parsed)) {
                    // Filter for likely relevant docs (Responses, Other)
                    const relevant = parsed.filter((d) => {
                        const c = (d.category || "").toLowerCase();
                        return (
                            c.includes("response") ||
                            c.includes("rejection") ||
                            c.includes("decision") ||
                            c.includes("letter") ||
                            c.includes("other") ||
                            c.includes("unknown")
                        );
                    });
                    setDocs(relevant);
                }
            } catch {
                // Ignore
            }
        }
    }, [caseId]);

    const handleSave = () => {
        const linkedDoc = docs.find((d) => d.id === linkedDocId);

        const meta = {
            response_type: responseType,
            received_date: receivedDate || null,
            linked_doc_id: linkedDocId || null,
            linked_doc_name: linkedDoc ? linkedDoc.name : null,
            notes: notes || null,
        };

        addCaseEvent(caseId, {
            type: "RESPONSE_RECEIVED",
            at: new Date().toISOString(),
            meta,
        });
        setSaved(true);

        // Reset form slightly but keep panel to show success
        setTimeout(() => {
            setSaved(false);
            setIsOpen(false);
            setNotes("");
            setReceivedDate("");
            setLinkedDocId("");
        }, 1500);
    };

    return (
        <Reveal>
            <Panel variant="subtle" className="space-y-3">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-zinc-400" />
                        <div>
                            <p className="text-sm font-medium text-zinc-900">Record a response</p>
                            <p className="text-xs text-zinc-500">
                                Log correspondence from the issuer
                            </p>
                        </div>
                    </div>
                    <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </button>

                {isOpen && (
                    <div id={contentId} className="pt-2 border-t border-zinc-100 space-y-4">
                        <CorrespondenceHeader caseId={caseId} variant="compact" />

                        {/* Record quality cue */}
                        <RecordQualityCue
                            formatStatus={responseType ? "complete" : "none"}
                            methodStatus="complete"
                            identifiersStatus={
                                receivedDate && linkedDocId
                                    ? "complete"
                                    : receivedDate || linkedDocId
                                        ? "partial"
                                        : "none"
                            }
                        />

                        <div className="space-y-3">
                            {/* Response Type */}
                            <div>
                                <label htmlFor={typeId} className="block text-xs font-medium text-zinc-700 mb-1">
                                    Response type
                                </label>
                                <select
                                    id={typeId}
                                    value={responseType}
                                    onChange={(e) => setResponseType(e.target.value)}
                                    className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                                >
                                    <option value="ACKNOWLEDGEMENT">Acknowledgement</option>
                                    <option value="REJECTION">Rejection</option>
                                    <option value="ACCEPTANCE">Acceptance / Cancelled</option>
                                    <option value="REQUEST_MORE_INFO">
                                        Request for Information
                                    </option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            {/* Date + Linked Doc */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor={dateId} className="block text-xs font-medium text-zinc-700 mb-1">
                                        Received date (optional)
                                    </label>
                                    <input
                                        id={dateId}
                                        type="date"
                                        value={receivedDate}
                                        onChange={(e) => setReceivedDate(e.target.value)}
                                        className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                                    />
                                </div>
                                <div>
                                    <label htmlFor={linkId} className="block text-xs font-medium text-zinc-700 mb-1">
                                        Link document (optional)
                                    </label>
                                    <select
                                        id={linkId}
                                        value={linkedDocId}
                                        onChange={(e) => setLinkedDocId(e.target.value)}
                                        className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                                    >
                                        <option value="">None</option>
                                        {docs.map((doc) => (
                                            <option key={doc.id} value={doc.id}>
                                                {doc.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label htmlFor={notesId} className="block text-xs font-medium text-zinc-700 mb-1">
                                    Notes (optional)
                                </label>
                                <textarea
                                    id={notesId}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value.slice(0, 280))}
                                    placeholder="Brief summary..."
                                    className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 min-h-[60px]"
                                />
                                <div className="text-right text-[10px] text-zinc-400">
                                    {notes.length}/280
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                            {saved ? (
                                <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                                    ✓ Saved to timeline
                                </span>
                            ) : (
                                <span />
                            )}
                            <button
                                onClick={handleSave}
                                disabled={saved}
                                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
                            >
                                <Save className="h-4 w-4" />
                                Save response
                            </button>
                        </div>
                    </div>
                )}
            </Panel>
        </Reveal>
    );
}
