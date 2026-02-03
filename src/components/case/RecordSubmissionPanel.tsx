"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Save, Send, Calendar } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { addCaseEvent } from "@/app/app/case/_context/CaseEvents";
import CorrespondenceHeader from "@/components/case/CorrespondenceHeader";

interface RecordSubmissionPanelProps {
    caseId: string;
    onSaved?: () => void;
}

// Minimal docs interface
type Doc = {
    id: string;
    name: string;
    category: string;
};

import { makeId } from "@/lib/ui/ids";

export default function RecordSubmissionPanel({ caseId, onSaved }: RecordSubmissionPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [docs, setDocs] = useState<Doc[]>([]);
    const [saved, setSaved] = useState(false);

    // Stable IDs
    const contentId = makeId(caseId, "submit-content");
    const methodId = makeId(caseId, "submit-method");
    const dateId = makeId(caseId, "submit-date");
    const proofId = makeId(caseId, "submit-proof");
    const notesId = makeId(caseId, "submit-notes");

    // Form state
    const [method, setMethod] = useState<string>("EMAIL");
    const [submittedDate, setSubmittedDate] = useState<string>("");
    const [linkedDocId, setLinkedDocId] = useState<string>(""); // "" = None
    const [notes, setNotes] = useState<string>("");

    // ...

    const handleSave = () => {
        const linkedDoc = docs.find((d) => d.id === linkedDocId);

        const meta = {
            method,
            submitted_date: submittedDate || null,
            linked_doc_id: linkedDocId || null,
            linked_doc_name: linkedDoc ? linkedDoc.name : null,
            notes: notes || null,
        };

        addCaseEvent(caseId, {
            type: "APPEAL_SUBMITTED",
            at: new Date().toISOString(),
            meta,
        });

        setSaved(true);
        if (onSaved) onSaved();

        // Reset form slightly but keep panel to show success
        setTimeout(() => {
            setSaved(false);
            setIsOpen(false);
            setNotes("");
            setSubmittedDate("");
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
                        <Send className="h-4 w-4 text-zinc-400" />
                        <div>
                            <p className="text-sm font-medium text-zinc-900">Record submission</p>
                            <p className="text-xs text-zinc-500">
                                Log how you sent the appeal and attach proof
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
                        <div className="space-y-3">
                            {/* Method */}
                            <div>
                                <label htmlFor={methodId} className="block text-xs font-medium text-zinc-700 mb-1">
                                    Submission method
                                </label>
                                <select
                                    id={methodId}
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value)}
                                    className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-white"
                                >
                                    <option value="EMAIL">Email</option>
                                    <option value="PORTAL">Online Portal</option>
                                    <option value="POST">Post / Mail</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>

                            {/* Date + Linked Doc */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor={dateId} className="block text-xs font-medium text-zinc-700 mb-1">
                                        Date sent (optional)
                                    </label>
                                    <input
                                        id={dateId}
                                        type="date"
                                        value={submittedDate}
                                        onChange={(e) => setSubmittedDate(e.target.value)}
                                        className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                                    />
                                </div>
                                <div>
                                    <label htmlFor={proofId} className="block text-xs font-medium text-zinc-700 mb-1">
                                        Proof document (optional)
                                    </label>
                                    <select
                                        id={proofId}
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
                                    placeholder="Confirmation reference, tracking number, etc..."
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
                                Save record
                            </button>
                        </div>
                    </div>
                )}
            </Panel>
        </Reveal>
    );
}
