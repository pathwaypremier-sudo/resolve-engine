"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCase } from "../../_context/CaseContext";
import { useEntitlement } from "../../_context/EntitlementContext";
import { addCaseEvent, getCaseEvents, type CaseEvent } from "../../_context/CaseEvents";
import { getCaseEmail } from "../../_context/CaseEmail";
import PremiumBoundaryPanel from "@/components/case/PremiumBoundaryPanel";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CaseHeader from "@/components/case/CaseHeader";
import { useCaseHeaderFacts } from "@/lib/case/useCaseHeaderFacts";
import { deriveDeliverableReadiness } from "@/lib/assessment/deriveAssessmentReadinessFacts";
import SubmissionInstructionsPanel from "@/components/case/SubmissionInstructionsPanel";
import DeliverReadinessPanel from "@/components/case/DeliverReadinessPanel";
import IssuerContactPanel from "@/components/case/IssuerContactPanel";
import RecordResponsePanel from "@/components/case/RecordResponsePanel";
import ResponseRecordCheck from "@/components/case/ResponseRecordCheck";
import ResponseFormatPanel from "@/components/case/ResponseFormatPanel";
import RecordSubmissionPanel from "@/components/case/RecordSubmissionPanel";
import EmptyState from "@/components/ui/EmptyState";
import {
    buildAppealLetter,
    getAppealLetterInputFromStorage,
} from "@/lib/letters/buildAppealLetter";
import GuidanceDock from "@/components/app/GuidanceDock";
import { PageSection } from "@/components/ui/PageSection";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import {
    makePaymentCheckoutCreatedEvent,
    makePaymentCheckoutUpdatedEvent,
    makeEntitlementGrantedEvent,
    processPaymentEvent
} from "@/lib/integrations/payments/paymentsEvents";
import { getPaymentProvider } from "@/lib/integrations/payments/getPaymentProvider";
import { reconcileEntitlement } from "@/lib/integrations/payments/reconcileEntitlement";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { PaymentsCaseSlice } from "@/lib/integrations/payments/paymentsContract";


// UI Components and logic
type DocMeta = {
    name: string;
    type: string;
    size: number;
    category: string;
};


export default function DeliverPage() {
    const { id: caseId } = useCase();
    const { tier, capabilities } = useEntitlement();
    const headerFacts = useCaseHeaderFacts(caseId);

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
                        { label: "Deliverables" },
                    ]}
                />
                <EmptyState
                    title="Intake not submitted"
                    body="Deliverables are generated from your case facts and documents. Submit intake to continue."
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
                    { label: "Deliverables" },
                ]}
            />
            <CaseHeader
                caseId={caseId}
                title="Deliverables"
                subtitle="Actions based on entitlement"
                {...headerFacts}
            />

            <div className="flex flex-col lg:flex-row lg:gap-8">
                {/* Main content */}
                <div className="flex-1 min-w-0">
                    <PageSection>
                        <DeliverReadinessPanel caseId={caseId} />

                        {/* Deliverable Mapping - Only show if ready check passes? 
                            The panel above shows "Not ready". 
                            We hide the builders to prevent confusion/errors.
                        */}
                        <SafeDeliverables caseId={caseId} tier={tier} capabilities={capabilities} />
                    </PageSection>
                </div>

                {/* Guidance Dock - desktop only */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <div className="sticky top-6">
                        <GuidanceDock
                            whatThisPageDoes={[
                                "Produces deliverables based on current case entries",
                                "Supports recording submission and responses",
                            ]}
                            whatHappensNext={[
                                "You download the appeal letter",
                                "You follow the submission instructions",
                            ]}
                        />
                    </div>
                </aside>
            </div>

            {/* Mobile dock */}
            <div className="lg:hidden">
                <GuidanceDock
                    whatThisPageDoes={[
                        "Produces deliverables based on current case entries",
                        "Supports recording submission and responses",
                    ]}
                    whatHappensNext={[
                        "You download the appeal letter",
                        "You follow the submission instructions",
                    ]}
                />
            </div>

            {/* DEV ONLY TOOLS */}
            {process.env.NODE_ENV !== "production" && (
                <DevTools caseId={caseId} />
            )}
        </main>
    );
}

function DeliverableMapping({ tier }: { tier: string }) {
    const isManaged = tier === "MANAGED" || tier === "ANNUAL_ACCESS" || tier === "PREMIUM";
    const isAppealBuilder = tier === "APPEAL_BUILDER" || isManaged;

    const available = [];
    const locked = [];

    // 1. Appeal Builder Scope
    if (isAppealBuilder) {
        available.push("Appeal letter draft for this case");
        available.push("Submission instructions");
    } else {
        locked.push("Appeal letter draft for this case");
        locked.push("Submission instructions");
    }

    // 2. Managed Scope
    if (isManaged) {
        available.push("Submission tracking (pre-court)");
        available.push("Response tracking (pre-court)");
        available.push("Handling rejections (pre-court)");
        available.push("Dedicated case email");
    } else {
        locked.push("Submission tracking (pre-court)");
        locked.push("Response tracking (pre-court)");
        locked.push("Handling rejections (pre-court)");
        locked.push("Dedicated case email");
    }

    return (
        <Panel>
            <PanelHeader
                title="Deliverables for this case"
                subtitle="Based on current case entries"
            />

            <PanelBody>
                {available.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Available now</p>
                        <ul className="space-y-2">
                            {available.map(item => (
                                <li key={item} className="flex items-center justify-between text-sm">
                                    <span className="text-zinc-700">{item}</span>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/40 px-2.5 py-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                                        <span className="text-xs text-zinc-600">Available</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {locked.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Requires Managed</p>
                        <ul className="space-y-2">
                            {locked.map(item => (
                                <li key={item} className="flex items-center justify-between text-sm text-zinc-400">
                                    <span>{item}</span>
                                    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/60 bg-zinc-50/40 px-2.5 py-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400/70" />
                                        <span className="text-xs text-zinc-500">Locked</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </PanelBody>
        </Panel>
    );
}

function NoEntitlement({ caseId }: { caseId: string }) {
    return (
        <>
            <header>
                <h1 className="text-xl font-semibold">Deliverables</h1>
                <p className="mt-1 text-sm text-zinc-500">Case ID: {caseId}</p>
            </header>

            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">No deliverables yet</p>
                <p className="mt-2 text-sm text-zinc-600">
                    Choose a service tier to unlock deliverables for this case.
                </p>
                <Link
                    href={`/app/case/${caseId}/checkout`}
                    className="mt-3 inline-flex items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                    Choose service tier
                </Link>
            </section>
        </>
    );
}



function getVal(caseId: string, key: string): string | null {
    const v = localStorage.getItem(`re_case_${caseId}_${key}`);
    if (!v || v === "NOT_SURE") return null;
    return v;
}



function AppealBuilder({ caseId, capabilities }: { caseId: string; capabilities: string[] }) {
    const [issuer, setIssuer] = useState<string | null>(null);
    const [reference, setReference] = useState<string | null>(null);
    const [noticeDate, setNoticeDate] = useState<string | null>(null);
    const [eventDate, setEventDate] = useState<string | null>(null);
    const [summary, setSummary] = useState<string | null>(null);
    const [desiredOutcome, setDesiredOutcome] = useState<string | null>(null);
    const [docs, setDocs] = useState<DocMeta[]>([]);
    const [intakeSubmitted, setIntakeSubmitted] = useState<boolean>(false);
    const [finalLetter, setFinalLetter] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    useEffect(() => {
        setIssuer(getVal(caseId, "issuer"));
        setReference(getVal(caseId, "reference"));
        setNoticeDate(getVal(caseId, "notice_date"));
        setEventDate(getVal(caseId, "event_date"));
        setSummary(getVal(caseId, "summary"));
        setDesiredOutcome(getVal(caseId, "desired_outcome"));
        setIntakeSubmitted(localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1");
        setFinalLetter(localStorage.getItem(`re_case_${caseId}_final_letter`));

        const docsJson = localStorage.getItem(`re_case_${caseId}_docs`);
        if (docsJson) {
            try {
                setDocs(JSON.parse(docsJson));
            } catch {
                setDocs([]);
            }
        }
    }, [caseId]);

    const categories = [...new Set(docs.map((d) => d.category))];
    const todayStr = new Date().toLocaleDateString();

    const canGenerate = intakeSubmitted && capabilities.includes("GENERATE_APPEAL");

    function handleGenerate() {
        const input = getAppealLetterInputFromStorage(caseId);
        const letter = buildAppealLetter(input);
        localStorage.setItem(`re_case_${caseId}_final_letter`, letter);
        setFinalLetter(letter);
        addCaseEvent(caseId, {
            type: "DELIVERABLE_GENERATED",
            at: new Date().toISOString(),
            meta: { kind: "APPEAL_LETTER" },
        });
    }

    function handleCopy() {
        if (finalLetter) {
            navigator.clipboard.writeText(finalLetter);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <>
            <header>
                <h1 className="text-xl font-semibold">Appeal deliverable</h1>
                <p className="mt-1 text-sm text-zinc-500">Appeal Builder tier</p>
            </header>

            {/* Final letter (if generated) */}
            {finalLetter && (
                <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
                    <p className="text-sm font-medium">Final letter (generated)</p>
                    <pre className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 whitespace-pre-wrap font-mono overflow-x-auto">
                        {finalLetter}
                    </pre>
                    <button
                        onClick={handleCopy}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                        {copied ? "Copied!" : "Copy letter"}
                    </button>
                </section>
            )}

            {/* Draft appeal letter preview */}
            {!finalLetter && (
                <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-4">
                    <p className="text-sm font-medium">Draft appeal letter (preview)</p>

                    {/* A) Header block */}
                    <div className="rounded-lg bg-zinc-50 p-3 text-sm space-y-1">
                        <p>
                            <span className="text-zinc-500">Issuer:</span>{" "}
                            <span className="text-zinc-900">{issuer || "Not provided"}</span>
                        </p>
                        <p>
                            <span className="text-zinc-500">Reference:</span>{" "}
                            <span className="text-zinc-900">{reference || "Not provided"}</span>
                        </p>
                        <p>
                            <span className="text-zinc-500">Date:</span>{" "}
                            <span className="text-zinc-900">{todayStr}</span>
                        </p>
                    </div>

                    {/* B) Subject */}
                    <div className="text-sm">
                        <p className="font-medium text-zinc-700">
                            Re: Appeal / Complaint regarding parking notice
                        </p>
                    </div>

                    {/* C) Facts */}
                    <div className="text-sm text-zinc-600 space-y-1">
                        <p className="text-zinc-500 text-xs uppercase tracking-wide">Facts</p>
                        {eventDate && <p>Parking event date: {eventDate}</p>}
                        {noticeDate && <p>Notice issued date: {noticeDate}</p>}
                        {summary && <p>{summary}</p>}
                        {!eventDate && !noticeDate && !summary && (
                            <p className="text-zinc-400">No facts entered yet.</p>
                        )}
                    </div>

                    {/* D) Remedy requested */}
                    <div className="text-sm text-zinc-600 space-y-1">
                        <p className="text-zinc-500 text-xs uppercase tracking-wide">Remedy requested</p>
                        <p>{desiredOutcome || "Review and fair resolution"}</p>
                    </div>

                    {/* E) Evidence attached */}
                    <div className="text-sm text-zinc-600 space-y-1">
                        <p className="text-zinc-500 text-xs uppercase tracking-wide">Evidence attached</p>
                        {docs.length > 0 ? (
                            <p>Attached evidence includes: {categories.join(", ")}</p>
                        ) : (
                            <p className="text-zinc-400">No evidence uploaded yet.</p>
                        )}
                    </div>

                    {/* F) Closing */}
                    <div className="text-sm text-zinc-600 border-t border-zinc-100 pt-3">
                        <p>Please confirm receipt and respond within a reasonable timeframe.</p>
                    </div>
                </section>
            )}

            {/* Preview note */}
            {!finalLetter && (
                <p className="text-xs text-zinc-400">
                    This is a draft preview. Final wording will be generated when enabled.
                </p>
            )}

            {/* What's included */}
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">What's included</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        This is a one-time deliverable
                    </li>
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        We do not submit on your behalf
                    </li>
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        Submission instructions are included
                    </li>
                </ul>
            </section>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                <button
                    disabled={!canGenerate || !!finalLetter}
                    onClick={handleGenerate}
                    className={[
                        "rounded-lg px-4 py-2 text-sm font-medium",
                        canGenerate && !finalLetter
                            ? "bg-zinc-900 text-white hover:bg-zinc-800"
                            : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
                    ].join(" ")}
                >
                    {finalLetter ? "Letter generated" : "Generate final letter"}
                </button>
                <Link
                    href={`/app/case/${caseId}/intake/review`}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm hover:bg-zinc-50"
                >
                    Edit intake
                </Link>
            </div>

            {/* Submission instructions */}
            <SubmissionInstructionsPanel caseId={caseId} />
            <div className="mt-4">
                <RecordSubmissionPanel caseId={caseId} />
            </div>
        </>
    );
}

function Managed({ caseId, capabilities }: { caseId: string; capabilities: string[] }) {
    const [events, setEvents] = useState<CaseEvent[]>([]);

    useEffect(() => {
        setEvents(getCaseEvents(caseId));
    }, [caseId]);

    const caseEmail = getCaseEmail(caseId);

    const hasEvent = (type: string) => events.some((e) => e.type === type);
    const hasCapability = (cap: string) => capabilities.includes(cap);

    const appealSubmitted = hasEvent("APPEAL_SUBMITTED");
    const responseReceived = hasEvent("RESPONSE_RECEIVED");
    const rejectedPreCourt = hasEvent("APPEAL_REJECTED_PRE_COURT");

    // Find response outcome if present
    const responseEvent = events.find((e) => e.type === "RESPONSE_RECEIVED");
    const responseOutcome = responseEvent?.meta?.outcome as string | undefined;

    function handleAppealSubmitted() {
        addCaseEvent(caseId, { type: "APPEAL_SUBMITTED", at: new Date().toISOString() });
        setEvents(getCaseEvents(caseId));
    }

    function handleResponseAccepted() {
        addCaseEvent(caseId, { type: "RESPONSE_RECEIVED", at: new Date().toISOString(), meta: { outcome: "ACCEPTED" } });
        setEvents(getCaseEvents(caseId));
    }

    function handleResponseRejected() {
        addCaseEvent(caseId, { type: "RESPONSE_RECEIVED", at: new Date().toISOString(), meta: { outcome: "REJECTED" } });
        addCaseEvent(caseId, { type: "APPEAL_REJECTED_PRE_COURT", at: new Date().toISOString() });
        setEvents(getCaseEvents(caseId));
    }

    return (
        <>
            <header>
                <h1 className="text-xl font-semibold">Managed case</h1>
                <p className="mt-1 text-sm text-zinc-500">Managed tier</p>
            </header>

            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">Case status</p>
                <p className="mt-2 text-sm text-zinc-600">
                    We are handling submissions and responses for this case.
                </p>
            </section>

            {/* Case contact */}
            {caseEmail && (
                <section className="rounded-xl border border-zinc-200 bg-white p-4">
                    <p className="text-sm font-medium">Case contact</p>
                    <p className="mt-1 text-sm font-mono text-zinc-900">{caseEmail}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                        Use this address for all correspondence for this case.
                    </p>
                </section>
            )}

            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">Progress</p>
                <ul className="mt-2 space-y-2 text-sm text-zinc-600">
                    <li className="flex items-center gap-2">
                        <span className={[
                            "h-4 w-4 rounded border flex items-center justify-center text-xs",
                            appealSubmitted ? "border-green-500 bg-green-50 text-green-600" : "border-zinc-300"
                        ].join(" ")}>
                            {appealSubmitted && "✓"}
                        </span>
                        Appeal submitted
                        {appealSubmitted && <span className="text-xs text-zinc-400">(complete)</span>}
                    </li>
                    <li className="flex items-center gap-2">
                        <span className={[
                            "h-4 w-4 rounded border flex items-center justify-center text-xs",
                            responseReceived ? "border-green-500 bg-green-50 text-green-600" : appealSubmitted ? "border-amber-400 bg-amber-50" : "border-zinc-300"
                        ].join(" ")}>
                            {responseReceived && "✓"}
                        </span>
                        Awaiting response
                        {appealSubmitted && !responseReceived && <span className="text-xs text-amber-500">(in progress)</span>}
                        {responseReceived && <span className="text-xs text-zinc-400">(complete: {responseOutcome})</span>}
                    </li>
                    <li className="flex items-center gap-2">
                        <span className={[
                            "h-4 w-4 rounded border flex items-center justify-center text-xs",
                            rejectedPreCourt ? "border-green-500 bg-green-50 text-green-600" : "border-zinc-300"
                        ].join(" ")}>
                            {rejectedPreCourt && "✓"}
                        </span>
                        Handling rejections (pre-court only)
                        {responseOutcome === "ACCEPTED" && <span className="text-xs text-green-500">(not needed)</span>}
                        {rejectedPreCourt && <span className="text-xs text-zinc-400">(complete)</span>}
                    </li>
                </ul>
                <p className="mt-3 text-xs text-zinc-400">
                    This service stops before court or bailiff action.
                </p>
            </section>

            {/* Managed Workflow Actions (Checklist + Logging) */}
            <div className="space-y-4">
                <SubmissionInstructionsPanel caseId={caseId} />
                <RecordSubmissionPanel caseId={caseId} />
                {(hasCapability("TRACK_RESPONSES") || hasCapability("SUBMIT_ON_BEHALF")) && (
                    <>
                        <ResponseRecordCheck />
                        <RecordResponsePanel caseId={caseId} />
                        <ResponseFormatPanel caseId={caseId} />
                    </>
                )}
            </div>

            {/* Operator actions (Legacy/Backup) */}
            <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 mt-6">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                    Legacy controls (will be removed)
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    {/* Mark Appeal Submitted removed in favor of RecordSubmissionPanel */}
                    <button
                        disabled={!appealSubmitted || responseReceived}
                        onClick={handleResponseAccepted}
                        className={[
                            "rounded-lg px-3 py-1.5 text-xs font-medium",
                            !appealSubmitted || responseReceived
                                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                        ].join(" ")}
                    >
                        Response: accepted
                    </button>
                    <button
                        disabled={!appealSubmitted || responseReceived}
                        onClick={handleResponseRejected}
                        className={[
                            "rounded-lg px-3 py-1.5 text-xs font-medium",
                            !appealSubmitted || responseReceived
                                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                                : "bg-amber-600 text-white hover:bg-amber-700"
                        ].join(" ")}
                    >
                        Response: rejected
                    </button>
                </div>
            </section>

            {/* Premium boundary - court/bailiff/CCJ escalation */}
            <PremiumBoundaryPanel
                caseId={caseId}
                contextLabel="Court / bailiff escalation"
                hasPremiumCapability={capabilities.includes("HANDLE_COURT_BAILIFFS_CCJ")}
            />
        </>
    );
}

function SafeDeliverables({ caseId, tier, capabilities }: { caseId: string, tier: string, capabilities: string[] }) {
    const [isBlocking, setIsBlocking] = useState(true);

    useEffect(() => {
        const r = deriveDeliverableReadiness(caseId);
        setIsBlocking(r.isBlocking);
    }, [caseId]);

    if (isBlocking) return null;

    return (
        <>
            <DeliverableMapping tier={tier} />
            {tier === "NONE" && <NoEntitlement caseId={caseId} />}
            {tier === "APPEAL_BUILDER" && <AppealBuilder caseId={caseId} capabilities={capabilities} />}
            {(tier === "MANAGED" || tier === "ANNUAL_ACCESS") && <Managed caseId={caseId} capabilities={capabilities} />}
            {tier === "PREMIUM" && <Premium />}
        </>
    );
}

function Premium() {
    return (
        <>
            <header>
                <h1 className="text-xl font-semibold">Premium handling</h1>
                <p className="mt-1 text-sm text-zinc-500">Premium tier</p>
            </header>

            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">Case status</p>
                <p className="mt-2 text-sm text-zinc-600">
                    This case qualifies for premium handling.
                </p>
            </section>

            <section className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">Premium scope</p>
                <ul className="mt-2 space-y-1 text-sm text-zinc-600">
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        Court claims
                    </li>
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        Bailiff / enforcement escalation
                    </li>
                    <li className="flex gap-2">
                        <span className="text-zinc-400">•</span>
                        CCJ risk mitigation
                    </li>
                </ul>
                <p className="mt-3 text-xs text-zinc-400">
                    Human review is prioritised for premium cases.
                </p>
            </section>
        </>
    );
}

function DevTools({ caseId }: { caseId: string }) {
    async function handleSimulatePayment() {
        const provider = getPaymentProvider();

        // 1. Create (Proposed)
        const { checkoutId } = await provider.createCheckout({
            amountPence: 500,
            currency: "GBP",
            purpose: "FINAL_EXPORT_PACK",
            caseId
        });

        // 1b. Log Creation Event
        const created = makePaymentCheckoutCreatedEvent({
            provider: provider.providerName as any, // Cast for loose string contract match
            amountPence: 500,
            currency: "GBP",
            purpose: "FINAL_EXPORT_PACK",
            checkoutId
        });
        processPaymentEvent(caseId, created);

        // 2. Updated (Paid)
        const updated = makePaymentCheckoutUpdatedEvent({
            checkoutId,
            status: "PAID"
        });
        processPaymentEvent(caseId, updated);

        // 3. Entitlement Granted (with Reconciliation Guard)
        const storageKey = `re_case_${caseId}_payments`;
        const casePayments = persistence.getJSON<PaymentsCaseSlice>(storageKey) || undefined;

        const { decision } = reconcileEntitlement({
            casePayments,
            entitlementKey: "FINAL_EXPORT_PACK",
            provider: provider.providerName as any,
            checkoutId,
            checkoutStatus: "PAID"
        });

        if (decision === "GRANT") {
            const granted = makeEntitlementGrantedEvent({
                entitlementKey: "FINAL_EXPORT_PACK",
                scope: "case",
                caseId,
                provider: provider.providerName as any,
                evidence: {
                    checkoutId,
                    note: "dev stub simulation"
                }
            });
            processPaymentEvent(caseId, granted);
        } else {
            console.log(`[DevTools] Simulation skip: ${decision}`);
        }

        // Force refresh? The context usually polls or valid is reactive enough?
        // events context uses SWR or simple polling. LocalStorage updates are immediate.
        // We can just reload to see effect if needed, but usually reactive.
        window.location.reload();
    }

    return (
        <div className="mt-10 border-t-2 border-dashed border-red-200 bg-red-50 p-4 rounded-xl">
            <h3 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2">Dev Tools (Not in Prod)</h3>
            <div className="flex items-center justify-between">
                <p className="text-sm text-red-700">Creates stub payment events and grants an entitlement for this case.</p>
                <button
                    onClick={handleSimulatePayment}
                    className="rounded-lg bg-red-100 border border-red-200 px-3 py-2 text-xs font-medium text-red-800 hover:bg-red-200 transition-colors"
                >
                    Simulate payment (dev only)
                </button>
            </div>
        </div>
    );
}
