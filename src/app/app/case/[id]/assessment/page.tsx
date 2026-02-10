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
import { loadAssessmentInput, logAssessmentInputSummary } from "@/lib/assessment/loadAssessmentInput";
import type { AssessmentInput } from "@/lib/assessment/AssessmentInput";
import { runAssessment } from "@/lib/assessment/runAssessment";
import type { AssessmentResult } from "@/lib/assessment/AssessmentResult";
import { mapMissingInfoToQuestions } from "@/lib/assessment/mapMissingInfoToQuestions";
import { getNotebookLMPromptTemplate } from "@/lib/notebooklm/getNotebookLMPromptTemplate";
import { flags } from "@/lib/flags/flags";
import { Copy, Download, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { saveAssessmentResultAction, loadAssessmentResultAction } from "./actions";
import { getOrCreateStubIdentity } from "@/lib/integrations/auth/stubAuth";
import NotebookLMIntegrationPanel from "@/components/case/NotebookLMIntegrationPanel";

type DocMeta = {
    name: string;
    type: string;
    size: number;
    category: string;
};


export default function AssessmentPage() {
    const { id: caseId } = useCase();
    const headerFacts = useCaseHeaderFacts(caseId);

    const [events, setEvents] = useState<CaseEvent[]>([]);
    const [revision, setRevision] = useState(0);

    const [input, setInput] = useState<AssessmentInput | null>(null);
    const [result, setResult] = useState<AssessmentResult | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isDownloading, setIsDownloading] = useState(false);
    const [showPackInstructions, setShowPackInstructions] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    async function handleDownloadPack() {
        if (!input) return;
        setIsDownloading(true);
        try {
            const response = await fetch("/api/notebooklm/pack", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(input)
            });

            if (!response.ok) throw new Error("Generation failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `resolve-case-${caseId.slice(0, 8)}-notebooklm-pack.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            setShowPackInstructions(true);
        } catch (err) {
            console.error("Pack download failed:", err);
            alert("Failed to generate pack. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    }

    const copyPrompt = () => {
        navigator.clipboard.writeText(getNotebookLMPromptTemplate(input, result));
        alert("Prompt copied to clipboard!");
    };

    // Load and run assessment engine on mount
    useEffect(() => {
        let mounted = true;
        async function runEngine() {
            try {
                // 0. Try to load existing result from DB first
                const existingResult = await loadAssessmentResultAction(caseId);

                // 1. Load canonical input (local)
                const assessmentInput = await loadAssessmentInput(caseId);
                logAssessmentInputSummary(assessmentInput);

                // If DB result exists and is fresher than local inputs, we might want to use it?
                // But local inputs are the source of truth for the wizard.
                // For now, let's always run the engine to get the freshest result, then save it.
                // UNLESS the user requirement says "fallback to existing logic if not" implying we should prefer DB?
                // "When loading assessment, read from DB if present (fallback to existing logic if not)"

                if (existingResult) {
                    if (mounted) {
                        setInput(assessmentInput);
                        setResult(existingResult);
                        setIsLoading(false);
                    }
                    console.log("[AssessmentPage] Loaded result from DB");
                } else {
                    // 2. Run assessment engine
                    const assessmentResult = await runAssessment(assessmentInput);

                    // 3. Persist result ONLY if authenticated
                    const isAuthed = document.cookie.split("; ").some(c => c.trim().startsWith("re_authed=1"));
                    setIsAuthenticated(isAuthed);

                    if (isAuthed) {
                        // We need an identity for the user.
                        // Since we are client-side, we can get it from the persistence adapter wrapper or stubAuth directly
                        const identity = getOrCreateStubIdentity();

                        // Fire and forget save (or await if critical)
                        saveAssessmentResultAction(caseId, assessmentResult, identity.actorId)
                            .then(ok => console.log(ok ? "[AssessmentPage] Saved result to DB" : "[AssessmentPage] Failed to save result"));
                    } else {
                        console.log("[AssessmentPage] Unauthenticated - skipping DB save");
                    }

                    if (mounted) {
                        setInput(assessmentInput);
                        setResult(assessmentResult);
                        setIsLoading(false);
                    }
                }
            } catch (err) {
                console.error("Engine failed:", err);
                if (mounted) setIsLoading(false);
            }
        }
        runEngine();
        return () => { mounted = false; };
    }, [caseId]);


    // TODO: Handle !intakeSubmitted case properly again if needed, or rely on Engine verdict "UNCERTAIN"
    const intakeSubmitted = typeof window !== "undefined"
        ? localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1"
        : false;

    const hasValidDate = !!input?.facts.issueDate.value;

    if (!result) return <div className="p-8 text-center text-zinc-500">Loading assessment result...</div>;

    // Fallback if result says payload is missing but verdict isn't definitive (rare edge case)
    if (result.verdict === "UNCERTAIN" && !intakeSubmitted) {
        // Could render EmptyState here, but for now let's just show the analysis
    }

    const missingInfoActions = mapMissingInfoToQuestions(caseId, result.missingInfo);

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

            {/* Missing Info Alert Panel */}
            {missingInfoActions.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-4">
                        <div className="mt-1 flex-shrink-0 bg-amber-100 p-1.5 rounded-full">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-amber-900">Missing Information Detected</h3>
                            <p className="mt-1 text-sm text-amber-800">
                                The engine needs the following information to provide a complete assessment.
                                Please update these fields to continue.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {missingInfoActions.map(action => (
                                    <Link
                                        key={action.field}
                                        href={action.url}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-700 shadow-sm border border-amber-200 hover:bg-amber-50"
                                    >
                                        <span>Fix {action.label}</span>
                                        <span aria-hidden="true">→</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

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

                        {/* Improved Inputs Coverage based on Engine Result */}
                        <InputsCoverage
                            disputeType={input?.facts.disputeType.value || ""}
                            issuer={input?.facts.issuer.value || ""}
                            reference={input?.facts.reference.value || ""}
                            docsCount={input?.evidence.docs.length || 0}
                            events={events}
                        />

                        {/* Engine Verdict Display (Temporary) */}
                        <Panel>
                            {/* ... (keep verdict panel content as is, it uses result which is fine) ... */}
                            <PanelHeader title="Assessment Engine Result" />
                            <PanelBody>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Verdict:</span>
                                        <span className={`px-2 py-1 rounded text-sm ${result.verdict === "APPEAL_POSSIBLE" ? "bg-emerald-100 text-emerald-800" :
                                            result.verdict === "UNCERTAIN" ? "bg-amber-100 text-amber-800" :
                                                "bg-zinc-100 text-zinc-800"
                                            }`}>{result.verdict}</span>
                                    </div>

                                    <div>
                                        <p className="font-medium text-sm mb-2">Checks Performed:</p>
                                        <div className="space-y-2">
                                            {result.checks.map(check => (
                                                <div key={check.id} className="flex items-start gap-2 text-sm border p-2 rounded">
                                                    <div className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 ${check.passed ? "bg-emerald-500" : "bg-red-500"}`} />
                                                    <div>
                                                        <p className="font-medium">{check.label}</p>
                                                        <p className="text-zinc-600 text-xs">{check.rationale}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </PanelBody>
                        </Panel>


                        {/* Gated Feature: NotebookLM Integration Panel - Using new component approach */}
                        {flags.notebookLM.isEnabled() && (
                            <NotebookLMIntegrationPanel
                                input={input}
                                result={result}
                                isDownloading={isDownloading}
                                onDownload={handleDownloadPack}
                            />
                        )}


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
                                    <span className="text-zinc-900">{getDisputeTypeLabel(input?.facts.disputeType.value || "")}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Issuer:</span>{" "}
                                    <span className="text-zinc-900">{input?.facts.issuer.value || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Reference:</span>{" "}
                                    <span className="text-zinc-900">{input?.facts.reference.value || "—"}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-500">Notice date:</span>{" "}
                                    <span className="text-zinc-900">{input?.facts.issueDate.value || "—"}</span>
                                </div>
                                {input?.facts.eventDate.value && (
                                    <div>
                                        <span className="text-zinc-500">Event date:</span>{" "}
                                        <span className="text-zinc-900">{input.facts.eventDate.value}</span>
                                    </div>
                                )}
                                {input?.facts.contraventionType.value && (
                                    <div>
                                        <span className="text-zinc-500">Contravention:</span>{" "}
                                        <span className="text-zinc-900">{input.facts.contraventionType.value}</span>
                                    </div>
                                )}
                            </div>
                            <div className="text-sm">
                                <span className="text-zinc-500">Documents:</span>{" "}
                                <span className="text-zinc-900">
                                    {input?.evidence.docs.length || 0} file{(input?.evidence.docs.length || 0) !== 1 ? "s" : ""}
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
                                    href={isAuthenticated ? `/app/case/${caseId}/checkout` : `/signin?next=${encodeURIComponent(`/app/case/${caseId}/checkout`)}&reason=save`}
                                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                                >
                                    Choose service tier
                                </Link>
                                <Link
                                    href={isAuthenticated ? `/app/case/${caseId}/deliver` : `/signin?next=${encodeURIComponent(`/app/case/${caseId}/deliver`)}&reason=save`}
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
