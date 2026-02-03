"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCase } from "../../../_context/CaseContext";
import { addCaseEvent } from "../../../_context/CaseEvents";
import { ReferenceOnlyDisclaimer } from "@/components/ui/ReferenceOnlyDisclaimer";

type DocMeta = {
    name: string;
    type: string;
    size: number;
    category: string;
};

function getVal(caseId: string, key: string): string | null {
    const v = localStorage.getItem(`re_case_${caseId}_${key}`);
    if (!v || v === "NOT_SURE") return null;
    return v;
}

function getCategoryCounts(docs: DocMeta[]): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const doc of docs) {
        counts[doc.category] = (counts[doc.category] || 0) + 1;
    }
    return counts;
}

export default function IntakeReviewPage() {
    const router = useRouter();
    const { id: caseId } = useCase();

    const [issuer, setIssuer] = useState<string | null>(null);
    const [reference, setReference] = useState<string | null>(null);
    const [noticeDate, setNoticeDate] = useState<string | null>(null);
    const [eventDate, setEventDate] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [desiredOutcome, setDesiredOutcome] = useState<string | null>(null);
    const [alreadyContacted, setAlreadyContacted] = useState<string | null>(null);
    const [councilStage, setCouncilStage] = useState<string | null>(null);
    const [councilAppealed, setCouncilAppealed] = useState<string | null>(null);
    const [privateNoticeType, setPrivateNoticeType] = useState<string | null>(null);
    const [privateAppealed, setPrivateAppealed] = useState<string | null>(null);
    const [docs, setDocs] = useState<DocMeta[]>([]);

    useEffect(() => {
        setIssuer(getVal(caseId, "issuer"));
        setReference(getVal(caseId, "reference"));
        setNoticeDate(getVal(caseId, "notice_date"));
        setEventDate(getVal(caseId, "event_date"));
        setSummary(getVal(caseId, "summary"));
        setDesiredOutcome(getVal(caseId, "desired_outcome"));
        setAlreadyContacted(getVal(caseId, "already_contacted"));
        setCouncilStage(getVal(caseId, "council_stage"));
        setCouncilAppealed(getVal(caseId, "council_appealed"));
        setPrivateNoticeType(getVal(caseId, "private_notice_type"));
        setPrivateAppealed(getVal(caseId, "private_appealed"));

        const docsJson = localStorage.getItem(`re_case_${caseId}_docs`);
        if (docsJson) {
            try {
                setDocs(JSON.parse(docsJson));
            } catch {
                setDocs([]);
            }
        }
    }, [caseId]);

    function handleSubmit() {
        localStorage.setItem(`re_case_${caseId}_intake_submitted`, "1");
        addCaseEvent(caseId, { type: "INTAKE_SUBMITTED", at: new Date().toISOString() });
        router.push(`/app/case/${caseId}/assessment`);
    }

    // Build timeline bullets
    const timelineBullets: string[] = [];
    if (eventDate) timelineBullets.push(`Parking event date: ${eventDate}`);
    if (noticeDate) timelineBullets.push(`Notice issued date: ${noticeDate}`);
    if (summary) timelineBullets.push(`Summary: ${summary}`);
    if (councilStage) timelineBullets.push(`Council stage: ${councilStage}`);
    if (privateNoticeType) timelineBullets.push(`Notice type: ${privateNoticeType}`);
    if (alreadyContacted === "YES") timelineBullets.push("Contact already made: Yes");
    if (alreadyContacted === "NO") timelineBullets.push("Contact already made: No");

    const categoryCounts = getCategoryCounts(docs);
    const categoryStr = Object.entries(categoryCounts)
        .map(([cat, count]) => `${cat}: ${count}`)
        .join(", ");
    if (docs.length > 0) {
        timelineBullets.push(`Documents uploaded: ${docs.length} (${categoryStr})`);
    }

    return (
        <main className="space-y-6">
            <header>
                <h1 className="text-xl font-semibold">Review your intake</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Step 4 of 5 — Confirm the details before proceeding.
                </p>
            </header>

            {/* Case summary */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
                <p className="text-sm font-medium">Case summary</p>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <div>
                        <span className="text-zinc-500">Issuer:</span>{" "}
                        <span className="text-zinc-900">{issuer || "—"}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500">Reference:</span>{" "}
                        <span className="text-zinc-900">{reference || "—"}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500">Desired outcome:</span>{" "}
                        <span className="text-zinc-900">{desiredOutcome || "—"}</span>
                    </div>
                    <div>
                        <span className="text-zinc-500">Documents:</span>{" "}
                        <span className="text-zinc-900">{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
                    </div>
                </div>
            </section>

            {/* Timeline (draft) */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">Timeline (draft)</p>
                {timelineBullets.length === 0 ? (
                    <p className="mt-2 text-sm text-zinc-500">No timeline entries yet.</p>
                ) : (
                    <ul className="mt-2 space-y-1">
                        {timelineBullets.map((bullet, i) => (
                            <li key={i} className="flex gap-2 text-sm text-zinc-700">
                                <span className="text-zinc-400">•</span>
                                {bullet}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Correspondence header */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">Correspondence header</p>
                <div className="mt-2 space-y-1 text-sm">
                    <p>
                        <span className="text-zinc-500">Issuer:</span>{" "}
                        <span className="text-zinc-900">{issuer || "—"}</span>
                    </p>
                    <p>
                        <span className="text-zinc-500">Reference:</span>{" "}
                        <span className="text-zinc-900">{reference || "Not provided"}</span>
                    </p>
                </div>
                <p className="mt-3 text-xs text-zinc-400">
                    Use this header at the top of every email/letter to keep the paper trail clean.
                </p>
            </section>

            {/* Response deadline */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">Response deadline</p>
                <p className="mt-2 text-sm text-zinc-700">
                    Suggested response deadline: 7 days from the date you send your complaint.
                </p>
                <div className="pt-2">
                    <ReferenceOnlyDisclaimer />
                </div>
            </section>

            {/* Edit links */}
            <div className="flex flex-wrap gap-3">
                <Link
                    href={`/app/case/${caseId}/intake/details`}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                >
                    Edit details
                </Link>
                <Link
                    href={`/app/case/${caseId}/intake/docs`}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                >
                    Edit documents
                </Link>
            </div>

            {/* Submit */}
            <button
                onClick={handleSubmit}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
                Submit intake
            </button>
        </main>
    );
}
