"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildQuestions, Ctx, Question, QGroup } from "@/lib/assessment/questions";
import { useCase } from "../../../_context/CaseContext";
import { readDisputeType } from "@/lib/case/disputeType";
import { CaseStorage } from "@/lib/case/CaseStorage";
import { persistence } from "@/lib/persistence/PersistenceAdapter";

function keyFor(caseId: string, key: string) {
    return `re_case_${caseId}_${key}`;
}

function loadAnswers(caseId: string, questions: Question[]) {
    const out: Record<string, string> = {};
    for (const q of questions) {
        const v = persistence.get(keyFor(caseId, q.key));
        if (v) out[q.key] = v;
    }
    return out;
}

type Suggestions = {
    issuer: string | null;
    issuerProv?: string | null;
    reference: string | null;
    referenceProv?: string | null;
    date: string | null;
    dateProv?: string | null;
};

function loadSuggestions(caseId: string): Suggestions {
    return {
        issuer: persistence.get(`re_case_${caseId}_suggest_issuer`),
        issuerProv: persistence.get(`re_case_${caseId}_suggest_issuer_provenance`),
        reference: persistence.get(`re_case_${caseId}_suggest_reference`),
        referenceProv: persistence.get(`re_case_${caseId}_suggest_reference_provenance`),
        date: persistence.get(`re_case_${caseId}_suggest_date`),
        dateProv: persistence.get(`re_case_${caseId}_suggest_date_provenance`),
    };
}

function clearSuggestions(caseId: string) {
    persistence.remove(`re_case_${caseId}_suggest_issuer`);
    persistence.remove(`re_case_${caseId}_suggest_reference`);
    persistence.remove(`re_case_${caseId}_suggest_date`);
}

export default function Questionnaire({
    nextHref,
}: {
    nextHref: string;
}) {
    const router = useRouter();
    const { id: caseId } = useCase();

    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [activeGroup, setActiveGroup] = useState<QGroup>("CORE");
    const [suggestions, setSuggestions] = useState<Suggestions>({ issuer: null, reference: null, date: null });

    const disputeType = readDisputeType(caseId) || undefined;

    const ctx: Ctx = useMemo(() => ({ disputeType, answers }), [disputeType, answers]);

    const allQuestions = useMemo(() => buildQuestions(ctx), [ctx]);

    const visibleQuestions = useMemo(
        () => allQuestions.filter((q) =>
            q.group === activeGroup && (q.when ? q.when(ctx) : true)
        ),
        [allQuestions, ctx, activeGroup]
    );

    useEffect(() => {
        const loaded = loadAnswers(caseId, allQuestions);
        setAnswers((prev) => ({ ...loaded, ...prev }));
        setSuggestions(loadSuggestions(caseId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caseId]);

    function setValue(q: Question, value: string) {
        setAnswers((prev) => ({ ...prev, [q.key]: value }));
        persistence.set(keyFor(caseId, q.key), value || "NOT_SURE");
    }

    function handleApplySuggestions() {
        const updates: Record<string, string> = {};

        if (suggestions.issuer && suggestions.issuer !== "NOT_SURE") {
            updates.issuer = suggestions.issuer;
            persistence.set(keyFor(caseId, "issuer"), suggestions.issuer);
        }
        if (suggestions.reference && suggestions.reference !== "NOT_SURE") {
            updates.reference = suggestions.reference;
            persistence.set(keyFor(caseId, "reference"), suggestions.reference);
        }
        if (suggestions.date && suggestions.date !== "NOT_SURE") {
            updates.notice_date = suggestions.date;
            persistence.set(keyFor(caseId, "notice_date"), suggestions.date);
        }

        setAnswers((prev) => ({ ...prev, ...updates }));
        clearSuggestions(caseId);
        setSuggestions({ issuer: null, reference: null, date: null });
    }

    const hasSuggestions = suggestions.issuer || suggestions.reference || suggestions.date;

    // Validation per group
    const groupQuestions = allQuestions.filter((q) =>
        q.group === activeGroup && (q.when ? q.when(ctx) : true)
    );
    const missingRequired = groupQuestions.some(
        (q) => q.required && !(answers[q.key] && answers[q.key].trim().length > 0)
    );

    function handleBack() {
        if (activeGroup === "PROCEDURE") {
            setActiveGroup("CORE");
        } else {
            router.back();
        }
    }

    function handleContinue() {
        if (activeGroup === "CORE") {
            setActiveGroup("PROCEDURE");
        } else {
            router.push(nextHref);
        }
    }

    const stepLabel = activeGroup === "CORE" ? "Part A: Core facts" : "Part B: Procedure";

    return (
        <main className="p-6 max-w-2xl">
            <header className="mb-6">
                <h1 className="text-xl font-semibold">Case details</h1>
                <p className="mt-1 text-sm text-zinc-500">{stepLabel}</p>
                <p className="mt-1 text-xs text-zinc-400">
                    One step at a time. Keep it factual. You can edit later.
                </p>
            </header>

            {/* Suggestions card */}
            {hasSuggestions && activeGroup === "CORE" && (
                <section className="mb-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-sm font-medium">Suggested values</p>
                    <p className="mt-1 text-xs text-zinc-500">
                        These values were prepared from your uploaded documents.
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                        {suggestions.issuer && (
                            <li>
                                <span className="text-zinc-500">Issuer:</span> {suggestions.issuer}
                                {suggestions.issuerProv === "OCR" && (
                                    <span className="ml-2 inline-flex items-center rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-medium text-amber-700 border border-amber-200">
                                        OCR extracted text (unverified)
                                    </span>
                                )}
                            </li>
                        )}
                        {suggestions.reference && (
                            <li>
                                <span className="text-zinc-500">Reference:</span> {suggestions.reference}
                                {suggestions.referenceProv === "OCR" && (
                                    <span className="ml-2 inline-flex items-center rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-medium text-amber-700 border border-amber-200">
                                        OCR extracted text (unverified)
                                    </span>
                                )}
                            </li>
                        )}
                        {suggestions.date && (
                            <li>
                                <span className="text-zinc-500">Date:</span> {suggestions.date}
                                {suggestions.dateProv === "OCR" && (
                                    <span className="ml-2 inline-flex items-center rounded-sm bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide font-medium text-amber-700 border border-amber-200">
                                        OCR extracted text (unverified)
                                    </span>
                                )}
                            </li>
                        )}
                    </ul>
                    <button
                        onClick={handleApplySuggestions}
                        className="mt-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-white"
                    >
                        Apply suggestions
                    </button>
                </section>
            )}

            <div className="space-y-5">
                {visibleQuestions.map((q) => (
                    <div key={q.id} className="rounded-xl border border-zinc-200 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <label htmlFor={q.key} className="block text-sm font-medium">
                                    {q.label}
                                    {q.required ? <span className="text-zinc-400"> (required)</span> : null}
                                </label>
                                {q.help ? <p className="mt-1 text-xs text-zinc-500">{q.help}</p> : null}
                            </div>
                        </div>

                        <div className="mt-3">
                            {q.type === "text" ? (
                                <input
                                    id={q.key}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                    value={answers[q.key] || ""}
                                    onChange={(e) => setValue(q, e.target.value)}
                                    placeholder="Type here…"
                                />
                            ) : null}

                            {q.type === "date" ? (
                                <input
                                    id={q.key}
                                    type="date"
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                    value={answers[q.key] || ""}
                                    onChange={(e) => setValue(q, e.target.value)}
                                />
                            ) : null}

                            {q.type === "yesno" ? (
                                <div className="flex gap-2" role="group" aria-label={q.label}>
                                    {[
                                        { v: "YES", label: "Yes" },
                                        { v: "NO", label: "No" },
                                        { v: "NOT_SURE", label: "Not sure" },
                                    ].map((opt) => (
                                        <button
                                            key={opt.v}
                                            type="button"
                                            onClick={() => setValue(q, opt.v)}
                                            aria-pressed={(answers[q.key] || "") === opt.v}
                                            className={[
                                                "rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900",
                                                (answers[q.key] || "") === opt.v
                                                    ? "border-zinc-900 bg-zinc-50 font-medium"
                                                    : "border-zinc-200 hover:bg-zinc-50",
                                            ].join(" ")}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            ) : null}

                            {q.type === "select" ? (
                                <select
                                    id={q.key}
                                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
                                    value={answers[q.key] || ""}
                                    onChange={(e) => setValue(q, e.target.value)}
                                >
                                    <option value="">Select…</option>
                                    {q.options?.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            ) : null}
                        </div>
                    </div>
                ))}
            </div>

            <footer className="mt-8 flex items-center justify-between">
                <button
                    type="button"
                    className="text-sm text-zinc-600"
                    onClick={handleBack}
                >
                    Back
                </button>

                <button
                    type="button"
                    disabled={missingRequired}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-40"
                    onClick={handleContinue}
                >
                    Continue
                </button>
            </footer>
        </main>
    );
}
