"use client";

import { useState, useEffect } from "react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { AlertTriangle, Copy, Check, RotateCcw, Download } from "lucide-react";
import { validateCaseStorage, type StorageWarning } from "@/lib/storage/validateCaseStorage";
import { appendCaseEvent } from "@/lib/case/events";
import { useShareSafe } from "@/lib/ui/shareSafe";
import { buildIntegrityExportText } from "@/lib/storage/integrityExportText";

interface IntegrityPanelProps {
    caseId: string;
}

export default function IntegrityPanel({ caseId }: IntegrityPanelProps) {
    const [msgs, setMsgs] = useState<StorageWarning[]>([]);
    const [stats, setStats] = useState<{ keys_present: number; keys_expected: number } | null>(null);
    const [copied, setCopied] = useState("");

    // PATCH10: Share-Safe
    const { isRedacted } = useShareSafe();

    function revalidate() {
        if (typeof window === "undefined") return;
        const result = validateCaseStorage(caseId);
        setMsgs(result.warnings);
        setStats(result.stats);
    }

    useEffect(() => {
        revalidate();
    }, [caseId]);

    function handleCopyReport() {
        const text = buildIntegrityExportText(caseId, isRedacted);
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied("Report Copied");
        setTimeout(() => setCopied(""), 2000);
    }

    function handleDownloadReport() {
        const text = buildIntegrityExportText(caseId, isRedacted);
        if (!text) return;

        const shortId = caseId.slice(0, 8);
        const suffix = isRedacted ? "-[REDACTED]" : "";
        const filename = `resolve-engine-case-${shortId}-integrity${suffix}.txt`;

        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleReset(key: string) {
        if (!confirm("This clears the malformed block from this device.\nIt does not delete your documents or timeline.\n\nContinue?")) {
            return;
        }

        localStorage.removeItem(key);

        appendCaseEvent(caseId, {
            type: "STORAGE_BLOCK_RESET",
            at: new Date().toISOString(),
            meta: {
                key,
                previous_state: "MALFORMED",
                action: "REMOVE_ITEM"
            }
        });

        // Trigger re-render / re-validate
        revalidate();

        // Optional: Force reload if deep state is stuck
        window.location.reload();
    }

    if (msgs.length === 0) {
        return null;
    }

    return (
        <Reveal>
            <Panel variant="warning" className="space-y-3">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-amber-900">
                                Data integrity warnings
                            </h3>
                            {stats && (
                                <span className="text-[10px] text-amber-700/70 font-mono">
                                    KEYS: {stats.keys_present}/{stats.keys_expected}
                                </span>
                            )}
                        </div>

                        <p className="text-sm text-amber-800">
                            These are checks on your local case file. They do not stop progress.
                        </p>

                        <ul className="list-disc list-inside text-sm text-amber-800 space-y-1 bg-amber-50/50 p-2 rounded border border-amber-200/50">
                            {msgs.map((w, i) => (
                                <li key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <span className="font-mono text-xs">{w.key}: <span className="font-sans text-sm">{w.message}</span></span>
                                    {w.can_reset && (
                                        <button
                                            onClick={() => handleReset(w.key)}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[10px] font-medium border border-amber-200 flex-shrink-0"
                                            title="Clear this data block"
                                        >
                                            <RotateCcw className="h-3 w-3" />
                                            Reset
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <div className="pt-2 flex flex-wrap gap-3">
                            {/* Copy Report */}
                            <button
                                onClick={handleCopyReport}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 hover:text-amber-700 hover:underline"
                            >
                                {copied === "Report Copied" ? (
                                    <>
                                        <Check className="h-3 w-3" />
                                        <span aria-live="polite">{copied}</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy report</span>
                                    </>
                                )}
                            </button>

                            {/* Download Report */}
                            <button
                                onClick={handleDownloadReport}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 hover:text-amber-700 hover:underline"
                            >
                                <Download className="h-3 w-3" />
                                <span>Download report (.txt)</span>
                            </button>

                            {/* Record Snapshot */}
                            <button
                                onClick={() => {
                                    const res = validateCaseStorage(caseId);
                                    appendCaseEvent(caseId, {
                                        type: "INTEGRITY_SNAPSHOT",
                                        at: new Date().toISOString(),
                                        meta: {
                                            warnings: res.warnings.map(w => ({ key: w.key, message: w.message })),
                                            stats: res.stats,
                                            generated_at_iso: new Date().toISOString()
                                        }
                                    });
                                    setCopied("Recorded");
                                    setTimeout(() => setCopied(""), 2000);
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 hover:text-amber-700 hover:underline"
                            >
                                <span>Record snapshot</span>
                            </button>
                        </div>
                    </div>
                </div>
            </Panel>
        </Reveal>
    );
}
