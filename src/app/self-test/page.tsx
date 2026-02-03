"use client";

import { useState, useEffect } from "react";
import { extractTextFromPdf } from "@/lib/extraction/pdf/extractTextFromPdf";

type TestResult = {
    id: string;
    label: string;
    status: "PENDING" | "RUNNING" | "PASS" | "FAIL";
    details?: string;
};

export default function SelfTestPage() {
    const [isAllowed, setIsAllowed] = useState(false);
    const [results, setResults] = useState<TestResult[]>([
        { id: "T1", label: "Worker Availability Check", status: "PENDING" },
        { id: "T2", label: "PDF Text Extraction (Native)", status: "PENDING" },
        { id: "T3", label: "OCR Engine Smoke Test (Worker Load)", status: "PENDING" },
    ]);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        // Gating Logic
        const isDev = process.env.NODE_ENV !== "production";
        const isSelfTest = process.env.NEXT_PUBLIC_SELF_TEST === "1";

        if (isDev || isSelfTest) {
            setIsAllowed(true);
        }
    }, []);

    if (!isAllowed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-50">
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-zinc-900">Access Restricted</h1>
                    <p className="mt-2 text-sm text-zinc-500">This route is not available in the current environment.</p>
                </div>
            </div>
        );
    }

    const updateResult = (id: string, update: Partial<TestResult>) => {
        setResults(prev => prev.map(r => r.id === id ? { ...r, ...update } : r));
    };

    async function runTests() {
        if (isRunning) return;
        setIsRunning(true);

        // Reset
        setResults(prev => prev.map(r => ({ ...r, status: "PENDING", details: undefined })));

        // T1: Worker Availability
        updateResult("T1", { status: "RUNNING" });
        try {
            const res = await fetch("/pdf.worker.min.mjs");
            if (res.ok) {
                updateResult("T1", { status: "PASS", details: `HTTP ${res.status} OK` });
            } else {
                updateResult("T1", { status: "FAIL", details: `HTTP ${res.status}` });
            }
        } catch (e: any) {
            updateResult("T1", { status: "FAIL", details: e.message });
        }

        // T2: PDF Text Extraction
        updateResult("T2", { status: "RUNNING" });
        try {
            const res = await fetch("/fixtures/text-layer.pdf");
            if (!res.ok) throw new Error(`Failed to fetch fixture: ${res.status}`);

            const blob = await res.blob();
            const file = new File([blob], "text-layer.pdf", { type: "application/pdf" });

            const result = await extractTextFromPdf(file);
            if (result.text && result.text.includes("Hello World")) {
                updateResult("T2", { status: "PASS", details: `Extracted ${result.text.length} chars. Found "Hello World".` });
            } else {
                updateResult("T2", { status: "FAIL", details: `Extracted ${result.text ? result.text.length : 0} chars. "Hello World" missing.` });
            }
        } catch (e: any) {
            updateResult("T2", { status: "FAIL", details: e.message });
        }

        // T3: OCR Engine Smoke Test
        updateResult("T3", { status: "RUNNING" });
        try {
            // Dynamic import to verify chunk loading
            const { runOcrOnSource } = await import("@/lib/ocr/ocrEngine");

            // Minimal 1x1 GIF
            const base64Gif = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
            const byteCharacters = atob(base64Gif);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const file = new File([byteArray], "pixel.gif", { type: "image/gif" });

            // Run OCR (expected to result in empty string or garbage, but not crash)
            const result = await runOcrOnSource({ type: "IMAGE", files: [file] });

            if (typeof result.text === "string") {
                updateResult("T3", { status: "PASS", details: "Engine initialized and returned result." });
            } else {
                updateResult("T3", { status: "FAIL", details: "Unexpected return type." });
            }

        } catch (e: any) {
            updateResult("T3", { status: "FAIL", details: e.message });
        }

        setIsRunning(false);
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-6">
            <h1 className="text-2xl font-bold text-zinc-900">Runtime Self-Test</h1>
            <p className="mt-2 text-zinc-600">Verifying core Evidence processing pipeline availability.</p>

            <div className="mt-8 bg-white rounded-lg border border-zinc-200 divide-y divide-zinc-100">
                {results.map(test => (
                    <div key={test.id} className="p-4 flex items-start justify-between">
                        <div>
                            <h3 className="font-medium text-zinc-900">{test.label}</h3>
                            {test.details && (
                                <p className="mt-1 text-sm text-zinc-500 font-mono">{test.details}</p>
                            )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                            {test.status === "PENDING" && <span className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">Pending</span>}
                            {test.status === "RUNNING" && <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 animate-pulse">Running...</span>}
                            {test.status === "PASS" && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">PASS</span>}
                            {test.status === "FAIL" && <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/10">FAIL</span>}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-8">
                <button
                    onClick={runTests}
                    disabled={isRunning}
                    className="rounded-md bg-zinc-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isRunning ? "Running tests..." : "Run tests"}
                </button>
            </div>
        </div>
    );
}
