"use client";

import { useEffect, useMemo, useState } from "react";
import { tokens } from "@/components/ui/tokens";
import { buildQuestions, Ctx, Question, DisputeType, QUESTION_SET_VERSION } from "@/lib/assessment/questions";
import { CaseStorage } from "@/lib/case/CaseStorage";
import { VerticalId } from "@/lib/verticals/verticals";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import { HelpCircle } from "lucide-react";

function keyFor(caseId: string, key: string) {
    return `re_case_${caseId}_${key}`;
}

export default function AssessmentQuestionnaire({ caseId, onAnswerChange }: { caseId: string, onAnswerChange?: () => void }) {
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [disputeType, setDisputeType] = useState<DisputeType | string | undefined>(undefined);
    const [verticalId, setVerticalId] = useState<VerticalId | undefined>(undefined);
    const [isLoaded, setIsLoaded] = useState(false);
    const [isStale, setIsStale] = useState(false);

    useEffect(() => {
        // Load initial state
        const dt = localStorage.getItem(`re_case_${caseId}_dispute_type`) || undefined;
        setDisputeType(dt);

        const vid = CaseStorage.getVerticalId(caseId);
        setVerticalId(vid);

        // Version check
        const storedVersion = localStorage.getItem(`re_case_${caseId}_question_set_version`);
        if (storedVersion && storedVersion !== QUESTION_SET_VERSION) {
            setIsStale(true);
        }
        localStorage.setItem(`re_case_${caseId}_question_set_version`, QUESTION_SET_VERSION);

        const loaded: Record<string, string> = {};
        // We preload all potential keys to be safe, or just rely on what we request.
        // We'll trust buildQuestions to give us the keys we care about.
        // But we can't call buildQuestions without context. Paradox?
        // No, we can build with empty answers first to get keys? 
        // Or just load potentially commonly known keys.
        // Better: iterate known questions from a static build if possible, or just load on demand?
        // Actually, we can just load ALL keys that match our pattern if we want, but explicit is better.
        // Let's build with the DisputeType we found.
        const ctx: Ctx = { disputeType: dt, answers: {}, verticalId: vid };
        const potentialQs = buildQuestions(ctx);

        for (const q of potentialQs) {
            const v = localStorage.getItem(keyFor(caseId, q.key));
            if (v) loaded[q.key] = v;
        }
        setAnswers(loaded);
        setIsLoaded(true);
    }, [caseId]);

    const evidenceStatus = typeof window !== "undefined"
        ? localStorage.getItem(`re_case_${caseId}_evidence_status`)
        : null;

    const ctx: Ctx = useMemo(() => ({ disputeType, evidenceStatus, answers, verticalId }), [disputeType, evidenceStatus, answers, verticalId]);
    const questions = useMemo(() => {
        return buildQuestions(ctx).filter(q => !q.when || q.when(ctx));
    }, [ctx]);

    function handleChange(q: Question, value: string) {
        setAnswers(prev => ({ ...prev, [q.key]: value }));
        localStorage.setItem(keyFor(caseId, q.key), value);

        // Special case: if we just answered dispute_type_guess, we might want to update our local disputeType state
        if (q.key === "dispute_type_guess" && value !== "NOT_SURE") {
            // Also update the authoritative dispute type?
            // User might want to confirm this. But "Classification set" implies setting it.
            // For now, let's keep it in answers. But to trigger the re-render of questions, we might need to update disputeType state?
            // If the questionnaire is "Dynamic", changing an answer might change the set.
            // Our logic uses keys like `dispute_type_guess`? No, `buildQuestions` checks `ctx.disputeType`.
            // If we want the questionnaire to switch sets DYNAMICALLY, we need to bind `ctx.disputeType` to the answer of `dispute_type_guess` if actual is missing.
            if (!disputeType) {
                // Temporary override for visual feedback? 
                // Updating actual storage for dispute_type is a side effect.
                // Let's just update the local state for this session to reveal the questions.
                setDisputeType(value);
                localStorage.setItem(`re_case_${caseId}_dispute_type`, value);
                // Reload page? No, reactive.
            }
        }
        onAnswerChange?.();
    }

    if (!isLoaded) return <div className="animate-pulse h-48 bg-zinc-50 rounded-xl" />;

    if (questions.length === 0) {
        return (
            <div className="space-y-4">
                <div className="px-4 pt-2">
                    <p className="text-[10px] text-zinc-400 font-mono">AssessmentQuestionnaire: rendered (empty)</p>
                </div>
                <div className="p-4 text-zinc-500 text-xs">
                    No assessment questions are available for the current case state.
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="px-4 pt-2 pb-4">
                <p className="text-[10px] text-zinc-400 font-mono">AssessmentQuestionnaire: rendered</p>
            </div>

            {process.env.NODE_ENV !== "production" && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-muted-foreground">Dev: mounted check</p>
                </div>
            )}

            {isStale && process.env.NODE_ENV !== "production" && (
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 mb-4 mx-4 rounded-md">
                    <p className="text-xs text-amber-700">
                        Question set updated.
                    </p>
                </div>
            )}
            <div className="divide-y divide-zinc-100 border-t border-zinc-100">
                {questions.map(q => (
                    <div key={q.id} className="p-4 hover:bg-zinc-50/50 transition-colors">
                        <div className="space-y-3">
                            <div>
                                <label className={`block ${tokens.textLabel} mb-1.5`}>
                                    {q.label}
                                    {q.required && <span className="text-zinc-400 font-normal ml-1">(required)</span>}
                                </label>
                                {q.help && (
                                    <p className="mt-1 text-xs text-zinc-500 flex items-start gap-1">
                                        <HelpCircle className="w-3 h-3 mt-0.5" />
                                        {q.help}
                                    </p>
                                )}
                            </div>

                            <div className="max-w-xl">
                                {q.type === "text" && (
                                    <input
                                        type="text"
                                        value={answers[q.key] || ""}
                                        onChange={e => handleChange(q, e.target.value)}
                                        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                                        placeholder="Type here..."
                                    />
                                )}

                                {q.type === "date" && (
                                    <input
                                        type="date"
                                        value={answers[q.key] || ""}
                                        onChange={e => handleChange(q, e.target.value)}
                                        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
                                    />
                                )}

                                {q.type === "select" && (
                                    <select
                                        value={answers[q.key] || ""}
                                        onChange={e => handleChange(q, e.target.value)}
                                        className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none bg-white"
                                    >
                                        <option value="">Select...</option>
                                        {q.options?.map(opt => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                {q.type === "yesno" && (
                                    <div className="flex gap-2">
                                        {[
                                            { v: "YES", label: "Yes" },
                                            { v: "NO", label: "No" },
                                            { v: "NOT_SURE", label: "Not sure" }
                                        ].map(opt => (
                                            <button
                                                key={opt.v}
                                                onClick={() => handleChange(q, opt.v)}
                                                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${answers[q.key] === opt.v
                                                    ? "bg-zinc-900 text-white border-zinc-900"
                                                    : "bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300"
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
