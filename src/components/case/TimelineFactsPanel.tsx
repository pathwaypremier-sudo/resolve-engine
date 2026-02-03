"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Pencil, Trash2, Plus } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import {
    readTimelineFacts,
    addTimelineFact,
    removeTimelineFact,
    updateTimelineFact,
    getFactKeyLabel,
    getAppliesFromLabel,
    getSourceLabel,
    type TimelineFact,
    type TimelineFactKey,
    type TimelineFactAppliesFrom,
    type TimelineFactSource,
} from "@/lib/case/timelineFacts";

interface TimelineFactsPanelProps {
    caseId: string;
}

const FACT_KEYS: TimelineFactKey[] = ["DISCOUNT_PERIOD", "APPEAL_WINDOW", "PAYMENT_DUE", "OTHER"];
const APPLIES_FROM_OPTIONS: TimelineFactAppliesFrom[] = ["NOTICE_DATE", "SERVICE_DATE", "UNKNOWN"];

import { makeId } from "@/lib/ui/ids";

export default function TimelineFactsPanel({ caseId }: TimelineFactsPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [facts, setFacts] = useState<TimelineFact[]>([]);
    const [editIndex, setEditIndex] = useState<number | null>(null);

    const contentId = makeId(caseId, "facts-content");

    // Form state
    const [formKey, setFormKey] = useState<TimelineFactKey>("DISCOUNT_PERIOD");
    const [formDays, setFormDays] = useState<string>("");
    const [formAppliesFrom, setFormAppliesFrom] = useState<TimelineFactAppliesFrom>("NOTICE_DATE");
    const [formSource] = useState<TimelineFactSource>("USER_ENTERED");
    const [formNotes, setFormNotes] = useState<string>("");

    useEffect(() => {
        const data = readTimelineFacts(caseId);
        setFacts(data.facts);
    }, [caseId]);

    function resetForm() {
        setFormKey("DISCOUNT_PERIOD");
        setFormDays("");
        setFormAppliesFrom("NOTICE_DATE");
        setFormNotes("");
        setEditIndex(null);
    }

    function handleAdd() {
        const fact: TimelineFact = {
            key: formKey,
            label: getFactKeyLabel(formKey),
            days: formDays ? parseInt(formDays, 10) : null,
            applies_from: formAppliesFrom,
            source: formSource,
            notes: formNotes || null,
        };

        if (editIndex !== null) {
            updateTimelineFact(caseId, editIndex, fact);
        } else {
            addTimelineFact(caseId, fact);
        }

        setFacts(readTimelineFacts(caseId).facts);
        resetForm();
    }

    function handleEdit(index: number) {
        const fact = facts[index];
        setFormKey(fact.key);
        setFormDays(fact.days !== null ? fact.days.toString() : "");
        setFormAppliesFrom(fact.applies_from);
        setFormNotes(fact.notes || "");
        setEditIndex(index);
    }

    function handleRemove(index: number) {
        removeTimelineFact(caseId, index);
        setFacts(readTimelineFacts(caseId).facts);
        if (editIndex === index) {
            resetForm();
        }
    }

    return (
        <Reveal>
            <Panel variant="subtle" className="space-y-3">
                {/* Header - collapsible */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    <div>
                        <p className="text-sm font-medium text-zinc-900">
                            Timeline facts (display-only)
                        </p>
                        <p className="text-xs text-zinc-500">
                            Record issuer/statutory timeframes here for reference.
                        </p>
                    </div>
                    <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </button>

                {isOpen && (
                    <div id={contentId} className="space-y-4 pt-2 border-t border-zinc-100">
                        {/* A) Explanation */}
                        <div className="text-sm text-zinc-600 space-y-1">
                            <p>
                                These are reference facts you record from the notice or official
                                guidance.
                            </p>
                            <p className="text-xs text-zinc-400">
                                They are not demands and do not pause deadlines unless the issuer
                                confirms.
                            </p>
                        </div>

                        {/* B) Existing facts list */}
                        {facts.length > 0 && (
                            <ul className="space-y-2">
                                {facts.map((fact, index) => (
                                    <li
                                        key={index}
                                        className="flex items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2"
                                    >
                                        <div className="text-sm">
                                            <span className="font-medium text-zinc-900">
                                                {fact.label}
                                            </span>
                                            {fact.days !== null && (
                                                <span className="text-zinc-600">
                                                    {" "}
                                                    • {fact.days} days
                                                </span>
                                            )}
                                            <span className="text-zinc-400">
                                                {" "}
                                                • From: {getAppliesFromLabel(fact.applies_from)}
                                            </span>
                                            <span className="text-zinc-400">
                                                {" "}
                                                • Source: {getSourceLabel(fact.source)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleEdit(index)}
                                                className="p-1 text-zinc-400 hover:text-zinc-600"
                                                title="Edit"
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(index)}
                                                className="p-1 text-zinc-400 hover:text-red-500"
                                                title="Remove"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* C) Add fact form */}
                        <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                {editIndex !== null ? "Edit fact" : "Add fact"}
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">
                                        Type
                                    </label>
                                    <select
                                        value={formKey}
                                        onChange={(e) =>
                                            setFormKey(e.target.value as TimelineFactKey)
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                                    >
                                        {FACT_KEYS.map((key) => (
                                            <option key={key} value={key}>
                                                {getFactKeyLabel(key)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">
                                        Days (optional)
                                    </label>
                                    <input
                                        type="number"
                                        value={formDays}
                                        onChange={(e) => setFormDays(e.target.value)}
                                        placeholder="e.g. 14"
                                        className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">
                                        Applies from
                                    </label>
                                    <select
                                        value={formAppliesFrom}
                                        onChange={(e) =>
                                            setFormAppliesFrom(
                                                e.target.value as TimelineFactAppliesFrom
                                            )
                                        }
                                        className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                                    >
                                        {APPLIES_FROM_OPTIONS.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {getAppliesFromLabel(opt)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-zinc-500 mb-1">
                                        Source
                                    </label>
                                    <select
                                        value={formSource}
                                        disabled
                                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-sm text-zinc-400"
                                    >
                                        <option value="USER_ENTERED">User entered</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-500 mb-1">
                                    Notes (optional)
                                </label>
                                <input
                                    type="text"
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    placeholder="e.g. Stated on notice front page"
                                    className="w-full rounded-lg border border-zinc-200 px-2 py-1 text-sm"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={handleAdd}
                                    className="flex items-center gap-1 rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                                >
                                    <Plus className="h-3 w-3" />
                                    {editIndex !== null ? "Update fact" : "Add fact"}
                                </button>
                                {editIndex !== null && (
                                    <button
                                        type="button"
                                        onClick={resetForm}
                                        className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* D) Safety line */}
                        <p className="text-xs text-zinc-400">
                            If you are unsure, leave this blank and keep the notice deadlines
                            visible in your case file.
                        </p>
                    </div>
                )}
            </Panel>
        </Reveal>
    );
}
