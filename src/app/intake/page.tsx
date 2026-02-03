"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { ArrowLeft, ArrowRight, Upload, ScanText } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import GuidanceDock from "@/components/app/GuidanceDock";
import { upsertCaseRegistryItem, readCaseRegistry } from "@/lib/case/registry";
import { PageSection } from "@/components/ui/PageSection";
import { extractCaseFields } from "@/lib/extraction/extractCaseFields";
import type { ExtractedFacts } from "@/lib/extraction/extractFactsFromText";
import { extractTextFromPdf } from "@/lib/extraction/pdf/extractTextFromPdf";
import { initPaymentsSlice } from "@/lib/integrations/payments/initPaymentsSlice";

type StepId =
    | "start"
    | "upload"
    | "issuer"
    | "noticeType"
    | "dates"
    | "vehicle"
    | "summary";

type FileRef = {
    name: string;
    size: number;
    type: string;
    text?: string;
    meta?: {
        pageCount?: number;
        textAvailable?: boolean;
    };
};

type IntakeState = {
    files: File[];
    fileRefs: FileRef[]; // Serializable storage for persistence
    issuer: "council" | "private" | "not_sure" | null;
    noticeType: "pcn" | "ntk" | "pc" | "not_sure" | null;
    eventDate: string;
    issueDate: string;
    reg: string;
    reference?: string; // Add reference to state to hold PCN number
};

const initialState: IntakeState = {
    files: [],
    fileRefs: [],
    issuer: null,
    noticeType: null,
    eventDate: "",
    issueDate: "",
    reg: "",
};

function Shell({
    title,
    subtitle,
    children,
    onBack,
    backDisabled,
    onNext,
    nextDisabled,
    nextLabel = "Continue",
}: {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    onBack?: () => void;
    backDisabled?: boolean;
    onNext?: () => void;
    nextDisabled?: boolean;
    nextLabel?: string;
}) {
    return (
        <main className="min-h-screen bg-white text-zinc-900">
            <div className="mx-auto max-w-5xl px-6 py-10">
                <div className="flex flex-col lg:flex-row lg:gap-8">
                    {/* Main wizard content */}
                    <div className="flex-1 max-w-2xl">
                        <PageSection
                            title={title}
                            description={subtitle}
                            className="max-w-2xl"
                        >
                            <div className="min-h-[300px]">
                                {children}
                            </div>
                        </PageSection>

                        <div className="mt-8 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={onBack}
                                disabled={backDisabled}
                                className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back
                            </button>

                            <button
                                type="button"
                                onClick={onNext}
                                disabled={nextDisabled}
                                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                {nextLabel}
                                <ArrowRight className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-8 text-xs leading-relaxed text-zinc-500">
                            We will guide you through a few structured questions. You can upload
                            documents now or skip and continue. You remain in control and can
                            review/edit before proceeding.
                        </p>
                    </div>

                    {/* Guidance Dock - desktop only, sticky */}
                    <div className="hidden lg:block w-64 flex-shrink-0 mt-16">
                        <div className="sticky top-6">
                            <GuidanceDock
                                whatThisPageDoes={[
                                    "Records case facts and documents",
                                    "Saves issuer identifiers and reference numbers",
                                ]}
                                whatToPrepare={[
                                    "Parking charge notice (PCN)",
                                    "Vehicle registration number",
                                    "Event and issue dates",
                                ]}
                            />
                        </div>
                    </div>
                </div>

                {/* Mobile dock - below content */}
                <div className="lg:hidden mt-8">
                    <GuidanceDock
                        whatThisPageDoes={[
                            "Records case facts and documents",
                            "Saves issuer identifiers and reference numbers",
                        ]}
                        whatToPrepare={[
                            "Parking charge notice (PCN)",
                            "Vehicle registration number",
                            "Event and issue dates",
                        ]}
                    />
                </div>
            </div>
        </main>
    );
}

function IntakeWizard() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const caseId = searchParams.get("case");
    const [isPreparing, setIsPreparing] = useState(true);

    const [step, setStep] = useState<StepId>("start");
    const [data, setData] = useState<IntakeState>(initialState);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractionResult, setExtractionResult] = useState<ExtractedFacts | undefined>(undefined);

    // 1. Ensure Case ID exists
    useEffect(() => {
        if (!caseId) {
            const newId = crypto.randomUUID();
            upsertCaseRegistryItem({
                id: newId,
                createdAt: new Date().toISOString(),
                lastActivityAt: new Date().toISOString(),
                disputeType: null,
                title: `Case ${newId.slice(0, 8)}`,
            });
            // Initialize payments slice
            localStorage.setItem(`re_case_${newId}_payments`, JSON.stringify(initPaymentsSlice()));

            router.replace(`/intake?case=${newId}`);
        } else {
            setIsPreparing(false);

            // Restore state if available
            const saved = localStorage.getItem(`re_case_${caseId}_intake_data`);
            if (saved) {
                try {
                    const parsedData = JSON.parse(saved);
                    // Ensure 'files' is always an empty array on load, as File objects cannot be serialized
                    // and we rely on fileRefs for persistent data.
                    setData((prev) => ({ ...prev, ...parsedData, files: [] }));
                } catch (e) { console.error(e); }
            }
        }
    }, [caseId, router]);

    // 2. Persist State
    useEffect(() => {
        if (!caseId || isPreparing) return;
        localStorage.setItem(`re_case_${caseId}_intake_data`, JSON.stringify(data));

        // Update registry if we have classification
        if (data.issuer || data.noticeType) {
            const disputeType = data.issuer === "council" ? "COUNCIL_PCN" :
                data.issuer === "private" ? "PRIVATE_PARKING" : null;

            if (disputeType) {
                upsertCaseRegistryItem({
                    id: caseId,
                    createdAt: new Date().toISOString(), // This dates field usage needs care, ideally we read first
                    lastActivityAt: new Date().toISOString(),
                    disputeType,
                    title: `Case ${caseId.slice(0, 8)}`,
                });
            }
        }
    }, [data, caseId, isPreparing]);

    // Steps array - must be declared before any early returns to satisfy Rules of Hooks
    const steps: StepId[] = useMemo(
        () => [
            "start",
            "upload",
            "issuer",
            "noticeType",
            "dates",
            "vehicle",
            "summary",
        ],
        []
    );

    // Early return for loading state - AFTER all hooks are declared
    if (isPreparing) {
        return (
            <main className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-sm text-zinc-500">Preparing your case…</p>
            </main>
        );
    }

    const idx = steps.indexOf(step);
    const canBack = idx > 0;

    function back() {
        if (!canBack) return;
        setStep(steps[idx - 1]);
    }

    function next() {
        // On summary completion: persist intake flag and redirect to assessment
        if (step === "summary" && caseId) {
            localStorage.setItem(`re_case_${caseId}_intake_submitted`, "1");
            router.replace(`/assessment?case=${caseId}`);
            return;
        }
        setStep(steps[Math.min(idx + 1, steps.length - 1)]);
    }

    const progress = Math.max(0, Math.min(1, idx / (steps.length - 2)));

    const nextDisabled =
        (step === "issuer" && !data.issuer) ||
        (step === "noticeType" && !data.noticeType) ||
        (step === "dates" && (!data.eventDate || !data.issueDate)) ||
        (step === "vehicle" && data.reg.trim().length < 5);

    const getTitle = () => {
        if (step === "start") return "Check Your Parking Ticket";
        if (step === "summary") return "Review before you proceed";
        return "A few details first";
    };

    const getSubtitle = () => {
        if (step === "start")
            return "A structured intake that stays calm under pressure. One step at a time.";
        if (step === "upload")
            return "You can upload a document now if you have it to hand. This is optional.";
        if (step === "issuer")
            return 'Who issued the notice? Choose "Not sure" if you are unsure.';
        if (step === "noticeType")
            return 'What type of notice is it? If unsure, choose "Not sure".';
        if (step === "dates")
            return "Dates matter. Use the dates printed on the notice where possible.";
        if (step === "vehicle")
            return "Record the Vehicle Registration Mark (VRM) as shown on the notice.";
        if (step === "summary")
            return "Confirm the key details you have provided. You can edit anything.";

        return undefined;
    };

    const getNextLabel = () => {
        if (step === "summary") return "Continue to assessment";
        return "Continue";
    };

    return (
        <Shell
            title={getTitle()}
            subtitle={getSubtitle()}
            onBack={back}
            backDisabled={!canBack}
            onNext={next}
            nextDisabled={nextDisabled}
            nextLabel={getNextLabel()}
        >
            {/* Progress bar */}
            <div className="mb-6">
                <div className="h-1.5 w-full rounded-full bg-zinc-100">
                    <div
                        className="h-1.5 rounded-full bg-zinc-900 transition-all"
                        style={{ width: `${Math.round(progress * 100)}%` }}
                    />
                </div>
            </div>

            {step === "start" && (
                <div className="space-y-4">
                    <p className="text-sm leading-relaxed text-zinc-600">
                        Start with what you have. If you are not sure about something,
                        select &quot;Not sure&quot;. You can upload documents now or later.
                    </p>

                    <button
                        onClick={() => router.push(`/app/case/${caseId}/intake/scan`)}
                        className="w-full rounded-xl border border-zinc-200 bg-white p-4 text-left hover:bg-zinc-50 transition-colors group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-900 text-white flex items-center justify-center">
                                <ScanText className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-zinc-900 group-hover:text-zinc-700">Scan a notice to get started</p>
                                <p className="text-sm text-zinc-500">Upload a photo to auto-detect details (Optional)</p>
                            </div>
                        </div>
                    </button>

                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-zinc-100" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-white px-2 text-xs font-medium text-zinc-400">OR ENTER MANUALLY</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                        <p className="font-medium text-zinc-900">What happens next</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                            <li>We collect key facts in a structured way</li>
                            <li>You review/edit before proceeding</li>
                            <li>
                                Then you choose Appeal Builder, Managed, Premium, or Annual
                                Access
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {step === "upload" && (
                <div className="space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                            Upload documents (optional)
                        </span>
                        <div className="mt-3 rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6">
                            <div className="flex items-center gap-3 text-zinc-700">
                                <Upload className="h-5 w-5" />
                                <p className="text-sm">
                                    Drag and drop files here, or click to select (photos, PDF, txt).
                                </p>
                            </div>
                            <input
                                className="mt-4 block w-full text-sm text-zinc-700 file:mr-4 file:rounded-lg file:border-0 file:bg-zinc-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
                                type="file"
                                multiple
                                accept="image/*,application/pdf,text/plain"
                                onChange={async (e) => {
                                    if (caseId) {
                                        localStorage.setItem(`re_case_${caseId}_evidence_status`, "PROVIDED");
                                    }
                                    const rawFiles = Array.from(e.target.files ?? []);

                                    const processedRefs: FileRef[] = await Promise.all(rawFiles.map(async (f) => {
                                        let text: string | undefined;
                                        let meta: FileRef["meta"] = {};

                                        if (f.type === "text/plain" || f.name.endsWith(".txt")) {
                                            text = await f.text();
                                            meta = { textAvailable: true };
                                        } else if (f.type === "application/pdf") {
                                            const result = await extractTextFromPdf(f);
                                            text = result.text;
                                            meta = {
                                                pageCount: result.pageCount,
                                                textAvailable: result.textAvailable
                                            };
                                        }

                                        return {
                                            name: f.name,
                                            size: f.size,
                                            type: f.type,
                                            text,
                                            meta
                                        };
                                    }));

                                    // We keep actual Files in state for this session (for eventual upload/preview if we had it)
                                    // But we rely on fileRefs for persistence and text extraction
                                    setData((d) => ({
                                        ...d,
                                        files: rawFiles,
                                        fileRefs: processedRefs
                                    }));
                                }}
                            />
                        </div>
                    </label>

                    {/* Explicit "No Documents" Option */}
                    <div className="mt-4 flex items-start gap-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                        <input
                            id="no-docs-check"
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            onChange={(e) => {
                                if (!caseId) return;
                                if (e.target.checked) {
                                    localStorage.setItem(`re_case_${caseId}_evidence_status`, "NONE_DECLARED");
                                } else {
                                    const current = localStorage.getItem(`re_case_${caseId}_evidence_status`);
                                    if (current === "NONE_DECLARED") {
                                        localStorage.removeItem(`re_case_${caseId}_evidence_status`);
                                    }
                                }
                            }}
                        />
                        <div>
                            <label htmlFor="no-docs-check" className="block text-sm font-medium text-zinc-900">
                                I am not recording any supporting documents at this time
                            </label>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                If you discover documents later, you can add them.
                            </p>
                        </div>
                    </div>

                    {(data.files.length > 0 || data.fileRefs.length > 0) && (
                        <div className="text-sm text-zinc-600">
                            <p className="font-medium text-zinc-900">Attached evidence (Provided)</p>
                            <ul className="mt-2 list-disc pl-5">
                                {(data.files.length > 0 ? data.files : data.fileRefs).map((f) => (
                                    <li key={f.name}>{f.name}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {step === "issuer" && (
                <div className="grid gap-3">
                    {[
                        { v: "council", t: "Council / Local Authority" },
                        { v: "private", t: "Private parking company" },
                        { v: "not_sure", t: "Not sure" },
                    ].map((o) => (
                        <button
                            key={o.v}
                            type="button"
                            onClick={() =>
                                setData((d) => ({
                                    ...d,
                                    issuer: o.v as IntakeState["issuer"],
                                }))
                            }
                            className={[
                                "rounded-2xl border px-5 py-4 text-left text-sm transition",
                                data.issuer === o.v
                                    ? "border-zinc-900 bg-zinc-50"
                                    : "border-zinc-200 bg-white hover:bg-zinc-50",
                            ].join(" ")}
                        >
                            <span className="font-medium text-zinc-900">{o.t}</span>
                        </button>
                    ))}

                </div>
            )}

            {step === "noticeType" && (
                <div className="grid gap-3">
                    {[
                        { v: "pcn", t: "Penalty Charge Notice (PCN) / council ticket" },
                        { v: "ntk", t: "Notice to Keeper (NTK) / postal notice" },
                        { v: "pc", t: "Private Parking Charge Notice" },
                        { v: "not_sure", t: "Not sure" },
                    ].map((o) => (
                        <button
                            key={o.v}
                            type="button"
                            onClick={() =>
                                setData((d) => ({
                                    ...d,
                                    noticeType: o.v as IntakeState["noticeType"],
                                }))
                            }
                            className={[
                                "rounded-2xl border px-5 py-4 text-left text-sm transition",
                                data.noticeType === o.v
                                    ? "border-zinc-900 bg-zinc-50"
                                    : "border-zinc-200 bg-white hover:bg-zinc-50",
                            ].join(" ")}
                        >
                            <span className="font-medium text-zinc-900">{o.t}</span>
                        </button>
                    ))}
                </div>
            )}

            {step === "dates" && (
                <div className="grid gap-5 md:grid-cols-2">
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                            Event date
                        </span>
                        <input
                            type="date"
                            value={data.eventDate}
                            onChange={(e) =>
                                setData((d) => ({ ...d, eventDate: e.target.value }))
                            }
                            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        />
                    </label>

                    <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                            Issue date (on the notice)
                        </span>
                        <input
                            type="date"
                            value={data.issueDate}
                            onChange={(e) =>
                                setData((d) => ({ ...d, issueDate: e.target.value }))
                            }
                            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        />
                    </label>
                </div>
            )}

            {step === "vehicle" && (
                <div className="space-y-4">
                    <label className="block">
                        <span className="text-sm font-medium text-zinc-900">
                            Vehicle Registration Mark (VRM)
                        </span>
                        <input
                            value={data.reg}
                            onChange={(e) =>
                                setData((d) => ({ ...d, reg: e.target.value.toUpperCase() }))
                            }
                            placeholder="e.g., AB12 CDE"
                            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-300"
                        />
                    </label>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
                        <p className="font-medium text-zinc-900">Tip</p>
                        <p className="mt-1">
                            Enter the registration exactly as printed on the notice.
                        </p>
                    </div>
                </div>
            )}

            {step === "summary" && (
                <div className="space-y-4 text-sm">
                    {/* Detection Panel */}
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                        {!extractionResult ? (
                            <div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-medium text-zinc-900">Document scan</p>
                                        <p className="text-xs text-zinc-600 mt-0.5">
                                            Extracted details are unverified until you confirm.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            // Prepare context from persisted fileRefs
                                            const context = data.fileRefs
                                                .filter(r => !!r.text)
                                                .map(r => ({ text: r.text! })); // Ensure type safety

                                            // Packet stub for detection
                                            const packet = { id: caseId, intake: null, docs: { items: [] } };

                                            setIsExtracting(true);
                                            try {
                                                const res = await extractCaseFields(packet, context);
                                                setExtractionResult(res.detected);
                                            } finally {
                                                setIsExtracting(false);
                                            }
                                        }}
                                        disabled={isExtracting}
                                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                                    >
                                        {isExtracting ? "Scanning for details..." : "Check documents"}
                                    </button>
                                </div>

                                {/* Warnings for files with no text */}
                                <div className="mt-3 space-y-1">
                                    {data.fileRefs.filter(f => f.type === "application/pdf" && f.meta?.textAvailable === false).map(f => (
                                        <p key={f.name} className="text-[10px] text-zinc-500">
                                            No selectable text detected in {f.name}. Extraction is not available for this file.
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-medium text-zinc-900">Detected facts (Review)</p>
                                    <button
                                        onClick={() => setExtractionResult(undefined)}
                                        className="text-xs text-zinc-500 hover:text-zinc-900"
                                    >
                                        Clear
                                    </button>
                                </div>

                                {(!extractionResult || Object.keys(extractionResult).length === 0) ? (
                                    <p className="text-xs text-zinc-500 italic">No extractable facts found in text documents.</p>
                                ) : (
                                    <div className="space-y-2">
                                        <DetectionRow
                                            label="PCN Reference"
                                            field={extractionResult.pcnRef}
                                            current={data.reference}
                                            onApply={() => setData(d => ({ ...d, reference: extractionResult?.pcnRef?.value || d.reference }))}
                                        />
                                        <DetectionRow
                                            label="Vehicle Registration (VRM)"
                                            field={extractionResult.vrn}
                                            current={data.reg}
                                            onApply={() => setData(d => ({ ...d, reg: extractionResult?.vrn?.value || d.reg }))}
                                        />
                                        <DetectionRow
                                            label="Issue Date"
                                            field={extractionResult.issueDate}
                                            current={data.issueDate}
                                            onApply={() => setData(d => ({ ...d, issueDate: extractionResult?.issueDate?.value || d.issueDate }))}
                                        />
                                        <DetectionRow
                                            label="Event Date"
                                            field={extractionResult.eventDate}
                                            current={data.eventDate}
                                            onApply={() => setData(d => ({ ...d, eventDate: extractionResult?.eventDate?.value || d.eventDate }))}
                                        />
                                        <DetectionRow
                                            label="Amount Due"
                                            field={extractionResult.amountDue}
                                            current={undefined}
                                            onApply={() => { }}
                                            readOnly
                                        />
                                        <DetectionRow
                                            label="Issuer Hint"
                                            field={extractionResult.issuerName}
                                            current={data.issuer === "council" && extractionResult.issuerName?.value.toLowerCase().includes("council") ? extractionResult.issuerName.value : undefined}
                                            onApply={() => {
                                                const val = extractionResult?.issuerName?.value.toLowerCase() || "";
                                                if (val.includes("council") || val.includes("borough") || val.includes("city")) {
                                                    setData(d => ({ ...d, issuer: "council" }));
                                                } else if (val.includes("ltd") || val.includes("limited")) {
                                                    setData(d => ({ ...d, issuer: "private" }));
                                                }
                                            }}
                                            readOnly={!extractionResult.issuerName?.value.match(/(council|borough|city|ltd|limited)/i)}
                                        />
                                        <DetectionRow
                                            label="Notice Type Hint"
                                            field={extractionResult.noticeType}
                                            current={undefined}
                                            onApply={() => {
                                                const val = extractionResult?.noticeType?.value.toLowerCase() || "";
                                                if (val.includes("penalty charge")) setData(d => ({ ...d, noticeType: "pcn" }));
                                                else if (val.includes("parking charge")) setData(d => ({ ...d, noticeType: "pc" }));
                                                else if (val.includes("keeper") || val.includes("owner")) setData(d => ({ ...d, noticeType: "ntk" }));
                                            }}
                                            readOnly={!extractionResult.noticeType}
                                        />
                                        <DetectionRow
                                            label="Location (as stated on notice)"
                                            field={extractionResult.location}
                                            current={undefined}
                                            onApply={() => { }}
                                            readOnly
                                        />
                                        <DetectionRow
                                            label="Contravention"
                                            field={extractionResult.contraventionCode}
                                            current={undefined}
                                            onApply={() => { }}
                                            readOnly
                                        />
                                        <DetectionRow
                                            label="Discount (if paid early)"
                                            field={extractionResult.discountAmount}
                                            current={undefined}
                                            onApply={() => { }}
                                            readOnly
                                        />
                                    </div>
                                )}
                                <p className="text-[10px] text-zinc-400 mt-2 border-t border-zinc-200 pt-2">
                                    Detected from uploaded documents where text is available. Review before applying.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-white p-4">
                        <p className="font-medium text-zinc-900">Your inputs</p>
                        <dl className="mt-3 grid gap-2">
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600">Issuer</dt>
                                <dd className="text-zinc-900">
                                    {data.issuer === "council" ? "Council" :
                                        data.issuer === "private" ? "Private Parking" :
                                            (data.issuer as string) === "consumer" ? "Not Sure" :
                                                data.issuer === "not_sure" ? "Not Sure" : "-"}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600">Notice type</dt>
                                <dd className="text-zinc-900">
                                    {data.noticeType === "pcn" ? "PCN" :
                                        data.noticeType === "ntk" ? "NTK" :
                                            data.noticeType === "pc" ? "Parking Charge" : "-"}
                                </dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600">PCN/Reference</dt>
                                <dd className="text-zinc-900">{data.reference || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600">Event date</dt>
                                <dd className="text-zinc-900">{data.eventDate || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600">Issue date</dt>
                                <dd className="text-zinc-900">{data.issueDate || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600">Vehicle reg</dt>
                                <dd className="text-zinc-900">{data.reg || "-"}</dd>
                            </div>
                            <div className="flex justify-between gap-4">
                                <dt className="text-zinc-600">Evidence status</dt>
                                <dd className="text-zinc-900">
                                    {(data.files.length || data.fileRefs.length) ? "Provided" :
                                        localStorage.getItem(`re_case_${caseId}_evidence_status`) === "NONE_DECLARED" ? "None declared" : "Unknown"}
                                </dd>
                            </div>
                        </dl>
                    </div>

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-700">
                        <p className="font-medium text-zinc-900">Next</p>
                        <p className="mt-1">
                            This is the point where Resolve Engine would run the free
                            assessment and route you to the correct path.
                        </p>
                    </div>
                </div>
            )}
        </Shell>
    );
}

// Helper specific to this page
function DetectionRow({ label, field, current, onApply, readOnly }: {
    label: string,
    field?: { value: string, confidence: "high" | "med" | "low", evidence?: string },
    current?: string,
    onApply: () => void,
    readOnly?: boolean
}) {
    const [confirm, setConfirm] = useState(false);

    if (!field) return null;

    // Check if matches current input (normalized check would be better but exact for now)
    const isMatch = current && current.toLowerCase() === field.value.toLowerCase();
    const hasConflict = !!current && !isMatch;

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-zinc-100 shadow-sm">
            <div className="flex flex-col">
                <span className="text-xs text-zinc-500">{label}</span>
                <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-900">{field.value}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${field.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                        field.confidence === "med" ? "bg-amber-100 text-amber-700" :
                            "bg-zinc-100 text-zinc-600"
                        }`}>
                        {field.confidence.toUpperCase()}
                    </span>
                </div>
            </div>

            {!readOnly && (
                <div className="flex items-center">
                    {isMatch ? (
                        <span className="text-xs text-emerald-600 flex items-center gap-1">
                            ✓ Applied
                        </span>
                    ) : (
                        confirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-red-500 font-medium">Overwrite?</span>
                                <button
                                    onClick={() => { onApply(); setConfirm(false); }}
                                    className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition"
                                >
                                    Confirm
                                </button>
                                <button
                                    onClick={() => setConfirm(false)}
                                    className="text-xs text-zinc-400 hover:text-zinc-600"
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => {
                                    if (hasConflict) setConfirm(true);
                                    else onApply();
                                }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition"
                            >
                                {hasConflict ? "Replace" : "Apply"}
                            </button>
                        )
                    )}
                </div>
            )}
            {field.evidence && (
                <div className="text-[10px] text-zinc-400 italic border-t border-zinc-50 pt-1 mt-1">
                    Detected in: &ldquo;{field.evidence.trim()}&rdquo;
                </div>
            )}
        </div>
    );
}

export default function IntakePage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-sm text-zinc-500">Loading intake...</p>
            </main>
        }>
            <IntakeWizard />
        </Suspense>
    );
}
