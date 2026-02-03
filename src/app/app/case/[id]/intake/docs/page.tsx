"use client";

import { useState, useRef, ChangeEvent, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCase } from "../../../_context/CaseContext";
import { buildCasePacket } from "@/lib/casePacket/buildCasePacket";
import { extractCaseFields } from "@/lib/extraction/extractCaseFields";
import { getDocUsage, type DocUsageItem } from "@/lib/case/docUsage";
import { formatEventTime } from "@/lib/case/events";
import { ChevronDown, ChevronRight, ScanText } from "lucide-react";
import { runOcrOnSource } from "@/lib/ocr/ocrEngine";
import { extractTextFromPdf } from "@/lib/extraction/pdf/extractTextFromPdf";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { uploadFileAction } from "@/app/actions/storage";

type DocCategory =
    | "Notice / PCN"
    | "Photos"
    | "Correspondence"
    | "Evidence"
    | "Payment proof"
    | "Other";

type DocMeta = {
    id: string;
    name: string;
    type: string;
    size: number;
    category: DocCategory;
    ocrText?: string;
    ocrProvenance?: {
        engine: string;
        timestamp: string;
    };
    storage?: {
        uri: string;
        checksumSha256: string;
        sizeBytes: number;
        storedAtIso: string;
    };
};

const CATEGORIES: DocCategory[] = [
    "Notice / PCN",
    "Photos",
    "Correspondence",
    "Evidence",
    "Payment proof",
    "Other",
];

function generateId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function IntakeDocsPage() {
    return (
        <Suspense fallback={<div className="h-48 animate-pulse bg-zinc-50 rounded-xl" />}>
            <IntakeDocsPageContent />
        </Suspense>
    );
}

function IntakeDocsPageContent() {
    const router = useRouter();
    const { id: caseId } = useCase();

    const uploadRef = useRef<HTMLInputElement>(null);
    const captureRef = useRef<HTMLInputElement>(null);

    const [docs, setDocs] = useState<DocMeta[]>([]);
    const [extractionMessage, setExtractionMessage] = useState<string | null>(null);
    const [ocrMessage, setOcrMessage] = useState<string | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [ocrProgress, setOcrProgress] = useState<Record<string, number>>({});

    // Ephemeral file storage for current session OCR
    const [filesMap, setFilesMap] = useState<Record<string, File>>({});
    // Native text cache to determine if OCR is needed
    const [nativeTextMap, setNativeTextMap] = useState<Record<string, string>>({});

    // Usage state
    const [usageMap, setUsageMap] = useState<Record<string, DocUsageItem[]>>({});
    const [expandedUsage, setExpandedUsage] = useState<Record<string, boolean>>({});

    const searchParams = useSearchParams();
    const highlightDocId = searchParams.get("doc");
    const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);

    useEffect(() => {
        // Load docs
        const json = localStorage.getItem(`re_case_${caseId}_docs`);
        if (json) {
            try {
                const loaded = JSON.parse(json);
                if (Array.isArray(loaded)) setDocs(loaded);
            } catch {
                // Ignore
            }
        }

        // Load usage
        const meta = JSON.parse(localStorage.getItem(`re_case_${caseId}_docs`) || "[]");
        const usages: Record<string, DocUsageItem[]> = {};
        if (Array.isArray(meta)) {
            meta.forEach((d: any) => {
                if (d.id) {
                    usages[d.id] = getDocUsage(caseId, d.id);
                }
            });
        }
        setUsageMap(usages);
    }, [caseId]);

    // Handle jump to doc
    useEffect(() => {
        if (highlightDocId && docs.length > 0) {
            const el = document.getElementById(highlightDocId);
            if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                setActiveHighlightId(highlightDocId);
                const timer = setTimeout(() => setActiveHighlightId(null), 3000);
                return () => clearTimeout(timer);
            }
        }
    }, [highlightDocId, docs]);

    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files) return;


        // Upload and create docs
        // "Replace memory behavior with storage call"
        const newDocsPromises = Array.from(files).map(async (file) => {
            const id = generateId();

            // Storage
            const formData = new FormData();
            formData.append("caseId", caseId);
            formData.append("docId", id);
            formData.append("file", file);

            let storage = undefined;
            try {
                storage = await uploadFileAction(formData);
            } catch (e) {
                console.error(`Failed to store ${file.name}`, e);
                // We permit continuing without storage logic per "fail open" posture, but export will lack URI
            }

            return {
                id,
                name: file.name,
                type: file.type,
                size: file.size,
                category: "Notice / PCN" as DocCategory,
                storage
            };
        });

        const newDocs = await Promise.all(newDocsPromises);

        setDocs((prev) => [...prev, ...newDocs]);

        // Store files in memory map for OCR (keep existing behavior)
        const newFilesMap: Record<string, File> = {};
        newDocs.forEach((d, i) => {
            newFilesMap[d.id] = Array.from(files)[i];
        });
        setFilesMap(prev => ({ ...prev, ...newFilesMap }));

        // Attempt native PDF extraction
        newDocs.forEach(async (doc, i) => {
            const file = Array.from(files)[i];
            if (doc.type === "application/pdf") {
                const result = await extractTextFromPdf(file);
                if (result.textAvailable) {
                    setNativeTextMap(prev => ({ ...prev, [doc.id]: result.text }));
                }
            }
        });

        // Reset inputs to allow re-selecting same files
        if (uploadRef.current) uploadRef.current.value = "";
        if (captureRef.current) captureRef.current.value = "";
    }

    function updateCategory(index: number, category: DocCategory) {
        setDocs((prev) =>
            prev.map((doc, i) => (i === index ? { ...doc, category } : doc))
        );
    }

    function removeDoc(index: number) {
        setDocs((prev) => prev.filter((_, i) => i !== index));
    }

    async function handleExtractFields() {
        const noticeDoc = docs.find((d) => d.category === "Notice / PCN");
        if (!noticeDoc) {
            setExtractionMessage("Add the notice first to extract key fields.");
            return;
        }

        setIsExtracting(true);
        setExtractionMessage(null);

        try {
            // Save docs to localStorage first so buildCasePacket can read them
            localStorage.setItem(`re_case_${caseId}_docs`, JSON.stringify(docs));

            // Build packet and call extraction adapter
            const packet = buildCasePacket(caseId);
            const result = await extractCaseFields(packet);

            // Write suggest_* keys
            localStorage.setItem(
                `re_case_${caseId}_suggest_issuer`,
                result.extracted.issuer ?? ""
            );
            if (result.detected?.issuerName?.sourceType) {
                localStorage.setItem(
                    `re_case_${caseId}_suggest_issuer_provenance`,
                    result.detected.issuerName.sourceType
                );
            }

            localStorage.setItem(
                `re_case_${caseId}_suggest_reference`,
                result.extracted.reference ?? ""
            );
            if (result.detected?.pcnRef?.sourceType) {
                localStorage.setItem(
                    `re_case_${caseId}_suggest_reference_provenance`,
                    result.detected.pcnRef.sourceType
                );
            }

            localStorage.setItem(
                `re_case_${caseId}_suggest_date`,
                result.extracted.notice_date ?? ""
            );
            if (result.detected?.issueDate?.sourceType) {
                localStorage.setItem(
                    `re_case_${caseId}_suggest_date_provenance`,
                    result.detected.issueDate.sourceType
                );
            }

            setExtractionMessage("Updated. Review suggestions on the Case Details step.");
        } catch {
            setExtractionMessage("Extraction failed. Try again.");
        } finally {
            setIsExtracting(false);
        }
    }

    async function handleRunOcr(index: number) {
        const doc = docs[index];
        if (!doc) return;
        if (ocrProgress[doc.id] !== undefined) return; // Prevent concurrent runs
        setOcrMessage(null);

        const file = filesMap[doc.id];
        if (!file && doc.type.startsWith("image/")) {
            setOcrMessage("File not available in memory. Please re-upload to run OCR.");
            return;
        }

        // Initialize progress
        setOcrProgress(prev => ({ ...prev, [doc.id]: 0 }));

        // Run OCR
        const result = await runOcrOnSource({
            type: doc.type === "application/pdf" ? "PDF_PAGES" : "IMAGE",
            files: file ? [file] : undefined,
            onProgress: (p) => setOcrProgress(prev => ({ ...prev, [doc.id]: Math.round(p * 100) }))
        });

        // Clear progress
        setOcrProgress(prev => {
            const next = { ...prev };
            delete next[doc.id];
            return next;
        });

        // Strict compliance: check if engine actually returned text
        if (!result.text || result.text.length === 0) {
            // If explicit warning provided, show it
            if (result.warnings && result.warnings.length > 0) {
                setOcrMessage(result.warnings[0]);
            } else {
                setOcrMessage("OCR engine produced no text.");
            }
            return;
        }

        setDocs(prev => prev.map((d, i) => {
            if (i !== index) return d;
            return {
                ...d,
                ocrText: result.text,
                ocrProvenance: {
                    engine: result.engine,
                    timestamp: new Date().toISOString()
                }
            };
        }));
    }

    function handleContinue() {
        localStorage.setItem(`re_case_${caseId}_docs`, JSON.stringify(docs));
        router.push(`/app/case/${caseId}/intake/review`);
    }

    function handleSkip() {
        localStorage.setItem(`re_case_${caseId}_docs`, JSON.stringify([]));
        router.push(`/app/case/${caseId}/intake/review`);
    }

    return (
        <main className="space-y-6">
            <header>
                <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 2 of 2 — Add documents (optional)</p>
                    <p className="text-sm text-zinc-600 mt-1">This step stores copies for my case file. It does not affect the extracted details.</p>
                </div>
                <h1 className="text-xl font-semibold">Upload documents</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Add the notice and any supporting evidence.
                </p>
            </header>

            <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">
                            Capture photo
                        </label>
                        <input
                            ref={captureRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            onChange={handleFileChange}
                            className="block text-sm text-zinc-600 file:mr-2 file:rounded-lg file:border file:border-zinc-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-500 mb-1">
                            Upload files
                        </label>
                        <input
                            ref={uploadRef}
                            type="file"
                            accept=".pdf,image/*"
                            multiple
                            onChange={handleFileChange}
                            className="block text-sm text-zinc-600 file:mr-2 file:rounded-lg file:border file:border-zinc-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-zinc-50"
                        />
                    </div>
                </div>

                {docs.length > 0 && (
                    <div className="rounded-xl border border-zinc-200 bg-white divide-y divide-zinc-100">
                        {docs.map((doc, index) => (
                            <div
                                key={doc.id}
                                id={doc.id}
                                className={`flex flex-col gap-2 p-3 transition-all duration-500 ${activeHighlightId === doc.id ? "bg-amber-50 ring-2 ring-amber-400 rounded-lg" : ""
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-zinc-900">
                                            {doc.name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {(doc.size / 1024).toFixed(1)} KB
                                        </p>
                                    </div>

                                    <select
                                        value={doc.category}
                                        onChange={(e) =>
                                            updateCategory(index, e.target.value as DocCategory)
                                        }
                                        className="rounded-lg border border-zinc-200 px-2 py-1 text-sm bg-white"
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>

                                    <button
                                        onClick={() => removeDoc(index)}
                                        className="text-sm text-zinc-400 hover:text-zinc-600"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 mt-1">
                                    {(doc.type.startsWith("image/") || (doc.type === "application/pdf" && (!nativeTextMap[doc.id] || nativeTextMap[doc.id].length < 50))) ? (
                                        <button
                                            onClick={() => handleRunOcr(index)}
                                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
                                            disabled={!!doc.ocrText || (ocrProgress[doc.id] !== undefined)}
                                        >
                                            {ocrProgress[doc.id] !== undefined ? (
                                                <span>Running OCR... {ocrProgress[doc.id]}%</span>
                                            ) : (
                                                <>
                                                    <ScanText className="w-3 h-3" />
                                                    {doc.ocrText ? "OCR Complete (Unverified)" : "Run OCR"}
                                                </>
                                            )}
                                        </button>
                                    ) : (
                                        doc.type === "application/pdf" && (
                                            <span className="text-xs text-zinc-400">Native text available</span>
                                        )
                                    )}
                                </div>

                                {/* Usage Section */}
                                {
                                    usageMap[doc.id] && usageMap[doc.id].length > 0 && (
                                        <div className="ml-0.5 border-t border-zinc-50 pt-2 mt-1">
                                            <div className="flex items-start gap-2">
                                                <button
                                                    onClick={() =>
                                                        setExpandedUsage((prev) => ({
                                                            ...prev,
                                                            [doc.id]: !prev[doc.id],
                                                        }))
                                                    }
                                                    className="mt-0.5 text-zinc-400 hover:text-zinc-600"
                                                >
                                                    {expandedUsage[doc.id] ? (
                                                        <ChevronDown className="h-3 w-3" />
                                                    ) : (
                                                        <ChevronRight className="h-3 w-3" />
                                                    )}
                                                </button>
                                                <div className="flex-1">
                                                    {expandedUsage[doc.id] ? (
                                                        <ul className="space-y-1">
                                                            {usageMap[doc.id].slice(0, 3).map((u, i) => (
                                                                <li key={i} className="text-xs text-zinc-600">
                                                                    <span className="font-medium">
                                                                        {u.label}
                                                                    </span>{" "}
                                                                    <span className="text-zinc-400">
                                                                        — {formatEventTime(u.at)}
                                                                    </span>
                                                                    {u.summary && (
                                                                        <p className="text-zinc-500 truncate">
                                                                            {u.summary}
                                                                        </p>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs text-zinc-500">
                                                            <span className="font-medium text-zinc-600">
                                                                Used in:
                                                            </span>{" "}
                                                            {usageMap[doc.id][0].label}{" "}
                                                            <span className="text-zinc-400">
                                                                ({usageMap[doc.id].length} event
                                                                {usageMap[doc.id].length > 1 ? "s" : ""})
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Extraction stub */}
            <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium">Assisted extraction</p>
                <p className="mt-1 text-xs text-zinc-500">
                    Prepare suggested field values from the uploaded notice.
                </p>
                {(() => {
                    const noticeDoc = docs.find(d => d.category === "Notice / PCN");
                    const hasNotice = !!noticeDoc;
                    const noticeHasText = noticeDoc && (
                        (nativeTextMap[noticeDoc.id]?.length ?? 0) > 50 ||
                        !!noticeDoc.ocrText
                    );

                    let extractLabel = "Extract fields (preview)";
                    let extractDisabled = isExtracting;
                    let extractReason: string | null = null;

                    if (!hasNotice) {
                        extractDisabled = true;
                        extractReason = "Add a Notice document first.";
                    } else if (!noticeHasText) {
                        extractDisabled = true;
                        extractReason = "No readable text available. Run OCR if needed.";
                    } else if (isExtracting) {
                        extractLabel = "Extracting…";
                    }

                    return (
                        <>
                            <button
                                onClick={handleExtractFields}
                                disabled={extractDisabled}
                                className={[
                                    "mt-3 rounded-lg border border-zinc-200 px-3 py-2 text-sm",
                                    extractDisabled ? "bg-zinc-100 text-zinc-400 cursor-not-allowed" : "hover:bg-white"
                                ].join(" ")}
                            >
                                {extractLabel}
                            </button>
                            {extractReason && !extractionMessage && (
                                <p className="mt-2 text-xs text-zinc-500">{extractReason}</p>
                            )}
                        </>
                    );
                })()}
                {extractionMessage && (
                    <p className="mt-2 text-sm text-zinc-600">{extractionMessage}</p>
                )}
                {ocrMessage && (
                    <p className="mt-2 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 inline-block">
                        {ocrMessage}
                    </p>
                )}
            </section>

            <p className="text-xs text-zinc-500">
                You can add more documents later.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                    onClick={handleContinue}
                    className="rounded-lg border border-zinc-200 bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                >
                    Continue
                </button>
                <button
                    onClick={handleSkip}
                    className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                    Skip for now
                </button>
            </div>
        </main >
    );
}
