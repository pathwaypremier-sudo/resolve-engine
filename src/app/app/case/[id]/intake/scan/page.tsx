"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Upload, ArrowRight, Loader2, FileText, ScanText, AlertCircle } from "lucide-react";
import { useCase } from "../../../_context/CaseContext";
import { extractTextFromPdf } from "@/lib/extraction/pdf/extractTextFromPdf";
import { runOcrOnSource } from "@/lib/ocr/ocrEngine";
import { extractCaseFields } from "@/lib/extraction/extractCaseFields";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { appendCaseEvent } from "@/lib/case/events";
import { PageSection } from "@/components/ui/PageSection";
import type { ExtractedFacts } from "@/lib/extraction/extractFactsFromText";
import { uploadFileAction } from "@/app/actions/storage";

function keyFor(caseId: string, key: string) {
    return `re_case_${caseId}_${key}`;
}

type ExtractedField = {
    key: string;
    label: string;
    value: string;
    confidence: "high" | "med" | "low";
    provenance: "NATIVE" | "OCR";
};

type SourceText = {
    text: string;
    provenance: "NATIVE" | "OCR";
    fingerprint: string;
};

export default function ScanIntakePage() {
    const router = useRouter();
    const { id: caseId } = useCase();

    const [isReading, setIsReading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [status, setStatus] = useState<string>("");

    const [sourceText, setSourceText] = useState<SourceText | null>(null);
    const lastFingerprintRef = useRef<string | null>(null);

    const [fields, setFields] = useState<ExtractedField[]>([]);
    const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    // Derived busy state
    const isBusy = isReading || isExtracting;

    // Reactive Auto-Extraction
    useEffect(() => {
        if (!sourceText) {
            lastFingerprintRef.current = null;
            return;
        }

        const { text, provenance, fingerprint } = sourceText;

        // Guard: Skip if same fingerprint (already processed)
        if (fingerprint === lastFingerprintRef.current) return;

        lastFingerprintRef.current = fingerprint;

        async function runExtraction() {
            setIsExtracting(true);
            setStatus("Preparing suggested fields...");
            setError(null);

            try {
                // Stub packet
                const packet = { id: caseId, intake: null, docs: { items: [] } };
                const extraction = await extractCaseFields(packet, [{ text }]);
                const facts = extraction.detected || {};

                const newFields: ExtractedField[] = [];
                if (facts.vrn) newFields.push({ key: "vehicle_reg", label: "Vehicle Reg", value: facts.vrn.value, confidence: facts.vrn.confidence, provenance });
                if (facts.pcnRef) newFields.push({ key: "reference", label: "PCN Reference", value: facts.pcnRef.value, confidence: facts.pcnRef.confidence, provenance });
                if (facts.eventDate) newFields.push({ key: "notice_date", label: "Event Date", value: facts.eventDate.value, confidence: facts.eventDate.confidence, provenance });

                // Issuer mapping
                if (facts.issuerName) {
                    const val = facts.issuerName.value.toLowerCase();
                    let issuerVal = "";
                    if (val.includes("council") || val.includes("borough") || val.includes("city")) issuerVal = "COUNCIL";
                    else if (val.includes("ltd") || val.includes("limited")) issuerVal = "PRIVATE";

                    if (issuerVal) {
                        newFields.push({ key: "issuer", label: "Issuer Type", value: issuerVal, confidence: facts.issuerName.confidence, provenance });
                    }
                }

                setFields(newFields);
                if (newFields.length === 0) {
                    setError("We extracted text but couldn't identify specific case details. You can proceed manually.");
                }

            } catch (e: any) {
                console.error(e);
                setError("Unable to prepare suggested fields.");
            } finally {
                setIsExtracting(false);
                setStatus("");
            }
        }

        runExtraction();
    }, [sourceText, caseId]);


    async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.length) return;
        const file = e.target.files[0];

        setIsReading(true);
        setError(null);
        setStatus("Analyzing document...");

        // Reset state for new file
        setFields([]);
        setConfirmed(new Set());
        setSourceText(null);

        try {
            // 0. Storage (Fire and forget-ish, but needed for export)
            const docId = `doc_scan_${Date.now()}`; // Generate ID
            const formData = new FormData();
            formData.append("caseId", caseId);
            formData.append("docId", docId);
            formData.append("file", file);

            // Start storage in background or await? 
            // "Replace... behaviour" implies core flow. Let's await to ensure it's saved.
            // But don't block UI too long? 5s timeout?
            // Local file system is fast.
            // We'll await it to get the metadata.

            setStatus("Saving document...");
            let storageMeta = null;
            try {
                storageMeta = await uploadFileAction(formData);

                // Add to persistence docs list so it appears in export/next step
                const existingDocs = JSON.parse(persistence.get(`re_case_${caseId}_docs`) || "[]");
                existingDocs.push({
                    id: docId,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    category: "Notice / PCN", // Assume scan is the notice
                    storage: storageMeta
                });
                persistence.set(`re_case_${caseId}_docs`, JSON.stringify(existingDocs));

            } catch (storageErr) {
                console.error("Storage failed", storageErr);
                // We continue with OCR even if storage fails, per "Failure posture"
            }

            let text = "";
            let provenance: "NATIVE" | "OCR" = "NATIVE";

            // 1. Text Extraction
            if (file.type === "application/pdf") {
                setStatus("Checking for text layer...");
                const pdfResult = await extractTextFromPdf(file);

                if (pdfResult.textAvailable && pdfResult.text.length > 50) {
                    text = pdfResult.text;
                } else {
                    provenance = "OCR";
                    setStatus("Running OCR on PDF pages...");
                    const ocrResult = await runOcrOnSource({ type: "PDF_PAGES", files: [file] });
                    text = ocrResult.text;
                }
            } else if (file.type.startsWith("image/")) {
                provenance = "OCR";
                setStatus("Running OCR on image...");
                const ocrResult = await runOcrOnSource({ type: "IMAGE", files: [file] });
                text = ocrResult.text;
            } else if (file.type === "text/plain") {
                text = await file.text();
            }

            if (!text || text.trim().length === 0) {
                throw new Error("No text could be extracted from this document.");
            }

            // Generate fingerprint
            const excerpt = text.slice(0, 100) + text.slice(-100);
            const fingerprint = `${text.length}:${excerpt}`;

            // Set source -> triggers effect
            setSourceText({ text, provenance, fingerprint });

        } catch (err: any) {
            console.error(err);
            setError(err.message || "Failed to process document");
            setSourceText(null);
        } finally {
            setIsReading(false);
            if (!sourceText) {
                setStatus(""); // Clear status only if failed or empty, else effect takes over "Preparing..."
            }
        }
    }

    function toggleConfirm(key: string) {
        setConfirmed(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }

    function handleApply() {
        const facts: Record<string, string> = {};

        // Persist confirmed
        fields.forEach(f => {
            if (confirmed.has(f.key)) {
                persistence.set(keyFor(caseId, f.key), f.value);
                facts[f.key] = f.value;
            }
        });


        // Log audit event (FACTUAL, including confirmed values for export)
        appendCaseEvent(caseId, {
            type: "SCAN_APPLY_CONFIRMED_FIELDS",
            at: new Date().toISOString(),
            meta: {
                appliedFields: Array.from(confirmed),
                sourceType: sourceText?.provenance || "UNKNOWN",
                ocrStatus: sourceText?.provenance === "OCR" ? "unverified" : undefined,
                facts: facts,
                provenance: "OCR_UNVERIFIED"
            }
        });

        // Always navigate to details next
        router.push(`/app/case/${caseId}/intake/details`);
    }

    function handleManual() {
        router.push(`/app/case/${caseId}/intake/details`);
    }

    return (
        <main className="max-w-2xl mx-auto p-6 min-h-screen pb-20">
            <button
                onClick={() => router.back()}
                className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900"
            >
                <ArrowLeft className="w-4 h-4" />
                Back
            </button>

            <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Step 1 of 2 — Scan a notice (optional)</p>
                <p className="text-sm text-zinc-600 mt-1">This step extracts details from your notice. You can skip it and enter details manually.</p>
            </div>

            <PageSection
                title="Scan a notice"
                description="Upload a photo or PDF of your penalty notice. We'll attempt to extract key details for you to review."
            >
                <div className="mt-6">
                    <label className="block w-full rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-8 text-center hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer group">
                        <div className="flex flex-col items-center">
                            <div className="h-10 w-10 rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                {isBusy ? <Loader2 className="w-5 h-5 text-zinc-900 animate-spin" /> : <Upload className="w-5 h-5 text-zinc-900" />}
                            </div>
                            <p className="mt-4 text-sm font-medium text-zinc-900">
                                {isBusy ? status : "Click to upload notice"}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                                PDF, JPG, or PNG
                            </p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*,application/pdf"
                            onChange={handleFile}
                            disabled={isBusy}
                        />
                    </label>
                </div>

                {error && (
                    <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {fields.length > 0 && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-medium text-zinc-900">Review detected details</h3>
                            <span className="text-xs text-zinc-500">Select to confirm</span>
                        </div>

                        <div className="space-y-3">
                            {fields.map((f) => (
                                <div
                                    key={f.key}
                                    onClick={() => toggleConfirm(f.key)}
                                    className={`relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer select-none ${confirmed.has(f.key)
                                        ? "border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500"
                                        : "border-zinc-200 bg-white hover:border-zinc-300"
                                        }`}
                                >
                                    <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${confirmed.has(f.key)
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "border-zinc-300 bg-white"
                                        }`}>
                                        {confirmed.has(f.key) && <Check className="h-3.5 w-3.5 text-white" />}
                                    </div>

                                    <div className="flex-1">
                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{f.label}</p>
                                        <p className="font-medium text-zinc-900 mt-0.5">{f.value}</p>

                                        {f.provenance === "OCR" && (
                                            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                                                <ScanText className="w-3 h-3" />
                                                OCR UNVERIFIED
                                            </div>
                                        )}
                                        {f.provenance === "NATIVE" && (
                                            <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-zinc-600 bg-zinc-100 px-1.5 py-0.5 rounded">
                                                <FileText className="w-3 h-3" />
                                                FROM PDF TEXT
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex flex-col gap-3">
                            <button
                                onClick={handleApply}
                                disabled={confirmed.size === 0}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {confirmed.size > 0 ? `Confirm ${confirmed.size} details & continue` : "Select details above to confirm"}
                                <ArrowRight className="w-4 h-4" />
                            </button>

                            <button
                                onClick={handleManual}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                            >
                                Skip & enter manually
                            </button>
                        </div>
                    </div>
                )}
            </PageSection>
        </main>
    );
}
