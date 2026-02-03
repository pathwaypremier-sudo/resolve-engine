"use client";

import { useState } from "react";
import { CaseEvent } from "@/lib/case/events";
import { Save, X } from "lucide-react";

interface CorrectEventPanelProps {
    event: CaseEvent;
    onSave: (correctedFields: Record<string, any>, reason: string) => void;
    onCancel: () => void;
}

export default function CorrectEventPanel({ event, onSave, onCancel }: CorrectEventPanelProps) {
    const [reason, setReason] = useState("");
    const [formData, setFormData] = useState<Record<string, any>>({});

    // Initialize form with current meta values
    useState(() => {
        if (event.meta) {
            setFormData({ ...event.meta });
        }
    });

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        // Calculate diff or just save all current fields as "corrected_fields" to be simple?
        // Prompt says "corrected_fields: object". Usually this means what CHANGED.
        // But for simplicity/audit, storing the Snapshot of valid fields is also fine.
        // Let's store the specific relevant fields for the type.

        const relevantFields: Record<string, any> = {};

        if (event.type === "RESPONSE_RECEIVED") {
            if (formData.response_type) relevantFields.response_type = formData.response_type;
            if (formData.received_date) relevantFields.received_date = formData.received_date;
            if (formData.linked_doc_id) relevantFields.linked_doc_id = formData.linked_doc_id;
            if (formData.notes) relevantFields.notes = formData.notes;
        } else if (event.type === "APPEAL_SUBMITTED") {
            if (formData.method) relevantFields.method = formData.method;
            if (formData.submitted_date) relevantFields.submitted_date = formData.submitted_date;
            if (formData.linked_doc_id) relevantFields.linked_doc_id = formData.linked_doc_id;
            if (formData.notes) relevantFields.notes = formData.notes;
        }

        onSave(relevantFields, reason);
    };

    if (event.type === "RESPONSE_RECEIVED") {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs space-y-3 mt-2">
                <div className="flex justify-between items-center text-amber-800 font-medium">
                    <span>Correcting Response Event</span>
                    <button onClick={onCancel} className="bg-transparent hover:bg-amber-200 rounded p-1"><X className="h-3 w-3" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-zinc-600">Response Type</span>
                        <input
                            type="text"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1"
                            value={formData.response_type || ""}
                            onChange={e => handleChange("response_type", e.target.value)}
                        />
                    </label>
                    <label className="block">
                        <span className="text-zinc-600">Received Date</span>
                        <input
                            type="date"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1"
                            value={formData.received_date || ""}
                            onChange={e => handleChange("received_date", e.target.value)}
                        />
                    </label>
                    <label className="block col-span-2">
                        <span className="text-zinc-600">Notes / Outcome</span>
                        <input
                            type="text"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1"
                            value={formData.notes || formData.outcome || ""} // mapping outcome to notes generally or keeping outcomes? existing mapping said 'outcome'
                            onChange={e => handleChange("outcome", e.target.value)}
                        />
                    </label>
                </div>

                <div className="border-t border-amber-200 pt-2">
                    <label className="block">
                        <span className="text-zinc-600 font-medium">Reason for correction (required)</span>
                        <input
                            type="text"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1 bg-white"
                            placeholder="e.g. Typo in date, selected wrong type"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onCancel} className="px-3 py-1 bg-white border border-zinc-300 rounded hover:bg-zinc-50">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={!reason.trim()}
                        className="px-3 py-1 bg-zinc-900 text-white rounded hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1"
                    >
                        <Save className="h-3 w-3" />
                        <span>Save Correction</span>
                    </button>
                </div>
            </div>
        );
    }

    if (event.type === "APPEAL_SUBMITTED") {
        return (
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs space-y-3 mt-2">
                <div className="flex justify-between items-center text-amber-800 font-medium">
                    <span>Correcting Appeal Submission</span>
                    <button onClick={onCancel} className="bg-transparent hover:bg-amber-200 rounded p-1"><X className="h-3 w-3" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-zinc-600">Method</span>
                        <input
                            type="text"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1"
                            value={formData.method || ""}
                            onChange={e => handleChange("method", e.target.value)}
                        />
                    </label>
                    <label className="block">
                        <span className="text-zinc-600">Submitted Date</span>
                        <input
                            type="date"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1"
                            value={formData.submitted_date || ""}
                            onChange={e => handleChange("submitted_date", e.target.value)}
                        />
                    </label>
                    <label className="block col-span-2">
                        <span className="text-zinc-600">Notes</span>
                        <input
                            type="text"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1"
                            value={formData.notes || ""}
                            onChange={e => handleChange("notes", e.target.value)}
                        />
                    </label>
                </div>

                <div className="border-t border-amber-200 pt-2">
                    <label className="block">
                        <span className="text-zinc-600 font-medium">Reason for correction (required)</span>
                        <input
                            type="text"
                            className="w-full mt-1 border border-zinc-300 rounded px-2 py-1 bg-white"
                            placeholder="e.g. Wrong date"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onCancel} className="px-3 py-1 bg-white border border-zinc-300 rounded hover:bg-zinc-50">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={!reason.trim()}
                        className="px-3 py-1 bg-zinc-900 text-white rounded hover:bg-zinc-800 disabled:opacity-50 flex items-center gap-1"
                    >
                        <Save className="h-3 w-3" />
                        <span>Save Correction</span>
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
