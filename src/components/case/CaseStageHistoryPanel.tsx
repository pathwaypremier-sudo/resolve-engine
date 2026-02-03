"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Copy, Check, Download, History } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { buildStageHistoryText, getSnapshotEvents, formatSnapshotForUI } from "@/lib/case/stageHistoryText";
import { type CaseEvent } from "@/lib/case/events";
import { useShareSafe } from "@/lib/ui/shareSafe";
import { makeId } from "@/lib/ui/ids";

interface CaseStageHistoryPanelProps {
    caseId: string;
}

export default function CaseStageHistoryPanel({ caseId }: CaseStageHistoryPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [snapshots, setSnapshots] = useState<CaseEvent[]>([]);
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const { isRedacted } = useShareSafe();

    const contentId = makeId(caseId, "stage-history-content");

    useEffect(() => {
        if (isOpen) {
            setSnapshots(getSnapshotEvents(caseId));
        }
    }, [isOpen, caseId]);

    function handleCopy() {
        const text = buildStageHistoryText(caseId, isRedacted);
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleDownload() {
        const text = buildStageHistoryText(caseId, isRedacted);
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED" : "";
        const filename = `resolve-engine-case-${shortId}-stage-history${safeSuffix}.txt`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
    }

    return (
        <Reveal>
            <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 transition-colors"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                            <History className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900">Case stage history</h3>
                            <p className="text-xs text-zinc-500">System snapshots over time (read-only)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {snapshots.length > 0 && !isOpen && (
                            <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-full">
                                {snapshots.length}
                            </span>
                        )}
                        <ChevronDown
                            className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                    </div>
                </button>

                {isOpen && (
                    <div id={contentId} className="border-t border-zinc-100 p-4 space-y-4">
                        {/* Summary + Actions */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">
                                {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} recorded
                            </span>
                            {snapshots.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleCopy}
                                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 py-1 transition-colors"
                                    >
                                        {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                        {copied ? "Copied" : "Copy history"}
                                    </button>
                                    <button
                                        onClick={handleDownload}
                                        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-700 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 py-1 transition-colors"
                                    >
                                        {downloaded ? <Check className="h-3 w-3 text-green-600" /> : <Download className="h-3 w-3" />}
                                        {downloaded ? "Downloaded" : "Download (.txt)"}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Snapshot List */}
                        {snapshots.length === 0 ? (
                            <div className="text-center py-6 text-sm text-zinc-400">
                                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>No snapshots recorded yet.</p>
                                <p className="text-xs mt-1">Use "Record snapshot" in Case File Index to capture state.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {snapshots.map((event, i) => {
                                    const { label, summary, time } = formatSnapshotForUI(event);
                                    return (
                                        <div
                                            key={i}
                                            className="p-2 bg-zinc-50 rounded border border-zinc-100 text-xs"
                                        >
                                            <div className="flex items-center justify-between mb-0.5">
                                                <span className="font-medium text-zinc-700">{label}</span>
                                                <span className="text-zinc-400 font-mono text-[10px]">{time}</span>
                                            </div>
                                            <p className="text-zinc-500">{summary}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Reveal>
    );
}
