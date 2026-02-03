"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useCase } from "../../_context/CaseContext";
import { EntitlementGate } from "../../_context/EntitlementGate";
import CasePacketPanel from "@/components/case/CasePacketPanel";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CaseHeader from "@/components/case/CaseHeader";
import { useCaseHeaderFacts } from "@/lib/case/useCaseHeaderFacts";

import CaseTimeline from "@/components/case/CaseTimeline";
import TimelineFactsPanel from "@/components/case/TimelineFactsPanel";
import DerivedDatesPanel from "@/components/case/DerivedDatesPanel";
import IntegrityPanel from "@/components/case/IntegrityPanel";
import CaseStageHistoryPanel from "@/components/case/CaseStageHistoryPanel";
import EvidenceChecklist from "@/components/case/EvidenceChecklist";
import AssessmentQuestionnaire from "@/components/case/AssessmentQuestionnaire";
import AssessmentReadinessPanel from "@/components/case/AssessmentReadinessPanel";
import { QUESTION_SET_VERSION } from "@/lib/assessment/questions";
import AssessmentOverviewPanel from "@/components/case/AssessmentOverviewPanel";
import ProceduralRoutePanel from "@/components/case/ProceduralRoutePanel";
import IssuerGuidancePanel from "@/components/case/IssuerGuidancePanel";
import EscalationPosturePanel from "@/components/case/EscalationPosturePanel";
import GuidanceDock from "@/components/app/GuidanceDock";
import EmptyState from "@/components/ui/EmptyState";

import { getCaseEvents, type CaseEvent } from "../../_context/CaseEvents";

import { getDisputeTypeLabel } from "@/lib/case/disputeType";
import { PageSection } from "@/components/ui/PageSection";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";

type DocMeta = {
    name: string;
    type: string;
    size: number;
    category: string;
};

function getUniqueCategories(docs: DocMeta[]): string[] {
    return [...new Set(docs.map((d) => d.category))];
}

function getVal(caseId: string, key: string): string | null {
    const v = localStorage.getItem(`re_case_${caseId}_${key}`);
    if (!v || v === "NOT_SURE") return null;
    return v;
}

export default function AssessmentPage() {
    const { id: caseId } = useCase();
    const headerFacts = useCaseHeaderFacts(caseId);

    const [disputeType, setDisputeType] = useState<string>("");
    const [issuer, setIssuer] = useState<string>("");
    const [reference, setReference] = useState<string>("");
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
    const [events, setEvents] = useState<CaseEvent[]>([]);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        setDisputeType(localStorage.getItem(`re_case_${caseId}_dispute_type`) || "");
        setIssuer(localStorage.getItem(`re_case_${caseId}_issuer`) || "");
        setReference(localStorage.getItem(`re_case_${caseId}_reference`) || "");
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

        setEvents(getCaseEvents(caseId));
    }, [caseId]);

    const hasValidDate = noticeDate !== null;
    const categories = getUniqueCategories(docs);
    const hasNotice = categories.includes("Notice / PCN");
    const hasPhotos = categories.includes("Photos");

    // Derived state - safe for client component
    const intakeSubmitted = typeof window !== "undefined"
        ? localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1"
        : false;

    if (!intakeSubmitted) {
        return (
            <main className="space-y-6">
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/app" },
                        { label: `Case ${caseId.slice(0, 8)}`, href: `/app/case/${caseId}` },
                        { label: "Assessment" },
                    ]}
                />
                <EmptyState
                    title="Intake not submitted"
                    body="Assessment derives from your case facts and documents. Submit intake to continue."
                    primaryAction={{
                        label: "Edit intake",
                        href: `/intake?case=${caseId}`,
                    }}
                />
            </main>
        );
    }

    return (
        <main className="space-y-6">
            <Breadcrumbs
                items={[
                    { label: "Dashboard", href: "/app" },
                    { label: `Case ${caseId.slice(0, 8)}`, href: `/app/case/${caseId}` },
                    { label: "Assessment" },
                ]}
            />
            <CaseHeader
                caseId={caseId}
                title="Assessment"
                subtitle="Procedural route and evidence checklist"
                {...headerFacts}
            />

            <div className="flex flex-col lg:flex-row lg:gap-8">
                {/* Main content */}
                <div className="flex-1 min-w-0">
                    <PageSection>
                        <AssessmentOverviewPanel />

                        <Panel>
                            <PanelHeader title="Assessment questions" />
                            <div className="px-5 pb-2 -mt-2">
                                <p className="text-xs text-zinc-400">Question set: {QUESTION_SET_VERSION}</p>
                            </div>
                            <PanelBody>
                                <AssessmentQuestionnaire caseId={caseId} onAnswerChange={() => setRevision(n => n + 1)} />
                            </PanelBody>
                        </Panel>

                        <AssessmentReadinessPanel caseId={caseId} revision={revision} />

                        <InputsCoverage
                            disputeType={disputeType}
                            issuer={issuer}
                            reference={reference}
                            docsCount={docs.length}
                            events={events}
                        />

                        <ProceduralRoutePanel caseId={caseId} />
                        <IssuerGuidancePanel caseId={caseId} />
                        <IntegrityPanel caseId={caseId} />
                        <CaseStageHistoryPanel caseId={caseId} />
                        <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-zinc-100" />}>
                            <EvidenceChecklist caseId={caseId} />
                        </Suspense>
                        <EscalationPosturePanel caseId={caseId} />

                        {/* A) Case summary */}
                        <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
                            <p className="text-sm font-medium">Case summary</p>
                            <div className="grid gap-3 sm:grid-cols-2 text-sm">
                                <div>
                                    <span className="text-zinc-500">Dispute type:</span>{" "}
                                    <span className="text-zinc-900">{getDisputeTypeLabel(disputeType)}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Issuer:</span>{" "}
                                    <span className="text-zinc-900">{issuer || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Reference:</span>{" "}
                                    <span className="text-zinc-900">{reference || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Notice date:</span>{" "}
                                    <span className="text-zinc-900">{noticeDate || "—"}</span>
                                </div>
                                {eventDate && (
                                    <div>
                                        <span className="text-zinc-500">Event date:</span>{" "}
                                        <span className="text-zinc-900">{eventDate}</span>
                                    </div>
                                )}
                                {desiredOutcome && (
                                    <div>
                                        <span className="text-zinc-500">Desired outcome:</span>{" "}
                                        <span className="text-zinc-900">{desiredOutcome}</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-sm">
                                <span className="text-zinc-500">Documents:</span>{" "}
                                <span className="text-zinc-900">
                                    {docs.length} file{docs.length !== 1 ? "s" : ""}
                                    {docs.length > 0 && (
                                        <span className="text-zinc-400">
                                            {" "}({categories.join(", ")})
                                        </span>
                                    )}
                                </span>
                            </div>
                        </section>





                        {/* D) Escalation posture */}
                        <section className="rounded-xl border border-zinc-200 bg-white p-4">
                            <p className="text-sm font-medium">Escalation posture</p>
                            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                                <li className="flex gap-2">
                                    <span className="text-zinc-400">•</span>
                                    Keep everything in writing and maintain a clear timeline.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-zinc-400">•</span>
                                    Use issuer + reference header on every message.
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-zinc-400">•</span>
                                    Set a clear response deadline (often 7 days) and state the next step if unresolved.
                                </li>
                            </ul>
                        </section>

                        {/* E) Urgency / deadlines */}
                        <section className="rounded-xl border border-zinc-200 bg-white p-4">
                            <p className="text-sm font-medium">Urgency</p>
                            <p className="mt-2 text-sm text-zinc-600">
                                {hasValidDate
                                    ? "Time sensitivity detected — we will confirm deadlines once notice type is verified."
                                    : "Deadline unknown — upload the notice or enter the date to assess urgency."}
                            </p>
                        </section>

                        {/* Next step panel */}
                        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                            <p className="text-sm font-medium">Next step</p>
                            <p className="mt-1 text-sm text-zinc-600">
                                Choose a service tier to unlock deliverables.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-3">
                                <Link
                                    href={`/app/case/${caseId}/checkout`}
                                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                                >
                                    Choose service tier
                                </Link>
                                <Link
                                    href={`/app/case/${caseId}/deliver`}
                                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                                >
                                    Go to deliverables
                                </Link>
                            </div>
                        </section>

                        {/* Gated paid output */}
                        <EntitlementGate requires="GENERATE_APPEAL">
                            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                                <p className="text-sm font-medium">Appeal draft output</p>
                                <p className="mt-2 text-sm text-zinc-600">
                                    Appeal draft will appear here once entitled.
                                </p>
                                <p className="mt-1 text-xs text-zinc-400">
                                    This is deliverable-only for Appeal Builder.
                                </p>
                            </section>
                        </EntitlementGate>

                        {/* Case timeline (audit-grade) */}
                        <CaseTimeline caseId={caseId} mode="compact" showFullCollapsible />

                        {/* Timeline facts (display-only) */}
                        <TimelineFactsPanel caseId={caseId} />

                        {/* Derived dates (reference only) */}
                        <DerivedDatesPanel caseId={caseId} />

                        {/* Evidence checklist (gap-aware) */}
                        <EvidenceChecklist caseId={caseId} />

                        {/* Case packet export (backend-ready seam) */}
                        <CasePacketPanel caseId={caseId} />
                    </PageSection>
                </div>

                {/* Guidance Dock - desktop only */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <div className="sticky top-6">
                        <GuidanceDock
                            whatThisPageDoes={[
                                "Derives position from entered facts and events",
                                "Highlights missing inputs (factual)",
                            ]}
                            whatToPrepare={[
                                "Evidence documents",
                                "Clarifications on missing facts",
                            ]}
                        />
                    </div>
                </aside>
            </div>

            {/* Mobile dock */}
            <div className="lg:hidden mt-6">
                <GuidanceDock
                    whatThisPageDoes={[
                        "Derives position from entered facts and events",
                        "Highlights missing inputs (factual)",
                    ]}
                    whatToPrepare={[
                        "Evidence documents",
                        "Clarifications on missing facts",
                    ]}
                />
            </div>
        </main>
    );
}

function InputsCoverage({
    disputeType,
    issuer,
    reference,
    docsCount,
    events,
}: {
    disputeType: string;
    issuer: string;
    reference: string;
    docsCount: number;
    events: CaseEvent[];
}) {
    const hasDispute = !!disputeType && disputeType !== "not_sure";
    const hasIssuer = !!issuer && issuer !== "not_sure";
    const hasReference = !!reference;
    const hasDocs = docsCount > 0;
    const hasSubmission = events.some(e => e.type === "APPEAL_SUBMITTED");
    const hasResponse = events.some(e => e.type === "RESPONSE_RECEIVED");

    const Row = ({ label, present, missingLabel = "Missing" }: { label: string, present: boolean, missingLabel?: string }) => (
        <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-600">{label}</span>
            {present ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/40 px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                    <span className="text-xs text-zinc-600">Present</span>
                </div>
            ) : (
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/60 bg-zinc-50/40 px-2.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400/70" />
                    <span className="text-xs text-zinc-600">{missingLabel}</span>
                </div>
            )}
        </div>
    );

    return (
        <Panel>
            <PanelHeader
                title="Inputs coverage"
                subtitle="Based on current case entries"
            />
            <PanelBody className="pt-1">
                <Row label="Dispute type" present={hasDispute} />
                <Row label="Issuer name" present={hasIssuer} />
                <Row label="Issuer reference" present={hasReference} />
                <Row label="Evidence documents" present={hasDocs} missingLabel="0 docs" />
                <Row label="Submission recorded" present={hasSubmission} missingLabel="No" />
                <Row label="Response recorded" present={hasResponse} missingLabel="No" />
            </PanelBody>
        </Panel>
    );
}
