"use client";

import { useState, useEffect } from "react";
import Reveal from "@/components/motion/Reveal";
import Panel from "@/components/ui/Panel";
import { ChevronDown, Save, Check } from "lucide-react";
import {
    readContactMethod,
    saveContactMethod,
    type ContactMethod,
    type ContactMethodType,
    type ContactMethodSource
} from "@/lib/case/contactMethod";
import { IssuerSubmissionMethod } from "@/lib/issuer/issuerFacts";

const submissionMethodLabel: Record<IssuerSubmissionMethod, string> = {
    [IssuerSubmissionMethod.PORTAL]: "Portal",
    [IssuerSubmissionMethod.EMAIL]: "Email",
    [IssuerSubmissionMethod.POST]: "Post",
};

interface IssuerContactPanelProps {
    caseId: string;
}

export default function IssuerContactPanel({ caseId }: IssuerContactPanelProps) {
    const [isOpen, setIsOpen] = useState(false); // Default closed
    const [method, setMethod] = useState<ContactMethodType>("UNKNOWN");
    const [value, setValue] = useState("");
    const [recordedFrom, setRecordedFrom] = useState<ContactMethodSource | null>(null);
    const [notes, setNotes] = useState("");
    const [feedback, setFeedback] = useState("");

    // Load initial state
    useEffect(() => {
        const stored = readContactMethod(caseId);
        if (stored) {
            setMethod(stored.method);
            setValue(stored.value || "");
            setRecordedFrom(stored.recorded_from);
            setNotes(stored.notes || "");
        }
    }, [caseId]);

    function handleSave() {
        const data: ContactMethod = {
            version: "1.0",
            method,
            value: value.trim() || null,
            recorded_from: recordedFrom,
            notes: notes.trim() || null,
            updated_at_iso: new Date().toISOString()
        };

        saveContactMethod(caseId, data);
        setFeedback("Saved");
        setTimeout(() => setFeedback(""), 2000);
    }

    return (
        <Reveal>
            <Panel variant="default">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex w-full items-center justify-between text-left"
                >
                    <h3 className="text-sm font-medium text-zinc-900">Issuer contact (for sending)</h3>
                    <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {isOpen && (
                    <div className="mt-4 space-y-4 border-t border-zinc-100 pt-4 animate-in fade-in slide-in-from-top-1">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Method */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-700">Method</label>
                                <select
                                    className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:ring-zinc-500"
                                    value={method}
                                    onChange={(e) => setMethod(e.target.value as ContactMethodType)}
                                >
                                    <option value="UNKNOWN">Not specified</option>
                                    <option value="EMAIL">Email</option>
                                    <option value="PORTAL">Online Portal</option>
                                    <option value="POST">Post</option>
                                </select>
                            </div>

                            {/* Source */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-zinc-700">Recorded from</label>
                                <select
                                    className="w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:ring-zinc-500"
                                    value={recordedFrom || ""}
                                    onChange={(e) => setRecordedFrom((e.target.value as ContactMethodSource) || null)}
                                >
                                    <option value="">(Select source)</option>
                                    <option value="NOTICE">Notice to Owner</option>
                                    <option value="WEBSITE">Official Website</option>
                                    <option value="USER">User knowledge</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Value */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-700">
                                {method === "EMAIL" ? "Email address" :
                                    method === "PORTAL" ? "Portal URL" :
                                        method === "POST" ? "Postal address" : "Details"}
                            </label>
                            <input
                                type="text"
                                className="w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:ring-zinc-500"
                                placeholder={
                                    method === "UNKNOWN" ? "Enter contact details..." :
                                        method === "PORTAL" ? "https://..." :
                                            method === "EMAIL" ? "appeals@..." : "Address..."
                                }
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                            />
                            <p className="text-[10px] text-zinc-500">
                                Enter only what is written on your notice or official website.
                            </p>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-zinc-700">Notes (optional)</label>
                            <textarea
                                className="w-full h-20 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-900 focus:border-zinc-500 focus:ring-zinc-500 resize-none"
                                placeholder="Any special instructions found..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value.slice(0, 280))}
                            />
                            <div className="flex justify-end">
                                <span className="text-[10px] text-zinc-400">{notes.length}/280</span>
                            </div>
                        </div>

                        {/* Save */}
                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-1.5 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                            >
                                {feedback === "Saved" ? (
                                    <>
                                        <Check className="h-4 w-4" />
                                        <span>Saved</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        <span>Save</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Panel>
        </Reveal>
    );
}
