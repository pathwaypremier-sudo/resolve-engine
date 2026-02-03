"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileJson, ChevronDown, Copy, Check, Download, Shield, Eye, EyeOff, Upload, FileWarning, AlertTriangle, RotateCcw, Lock } from "lucide-react";
import { buildCasePacket, type CasePacket } from "@/lib/casePacket/buildCasePacket";
import { redactCasePacket } from "@/lib/casePacket/redactCasePacket";
import { validateCasePacket } from "@/lib/casePacket/validateCasePacket";
import { diffCasePacket } from "@/lib/casePacket/diffCasePacket";
import { buildRestorePlan, type RestorePlan } from "@/lib/casePacket/restorePlan";
import { assessPacketCompatibility } from "@/lib/casePacket/compatibility";
import { makeId } from "@/lib/ui/ids";
import { useShareSafe } from "@/lib/ui/shareSafe";
import { appendCaseEvent } from "@/lib/case/events";
import { buildCaseSummaryTxt } from "@/lib/case/caseSummary";
import { buildExportManifestTxt } from "@/lib/case/exportManifest";
import { PanelBody } from "@/components/ui/Panel";

interface CasePacketPanelProps {
    caseId: string;
}

export default function CasePacketPanel({ caseId }: CasePacketPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [packet, setPacket] = useState<CasePacket | null>(null);
    const { isRedacted, setIsRedacted } = useShareSafe();
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    // Import Preview State
    const [importOpen, setImportOpen] = useState(false);
    const [importedPacket, setImportedPacket] = useState<CasePacket | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [importWarning, setImportWarning] = useState<string | null>(null);

    const contentId = makeId(caseId, "packet-content");

    useEffect(() => {
        if (isOpen && !packet) {
            setPacket(buildCasePacket(caseId));
        }
    }, [isOpen, caseId, packet]);

    function handleCopy() {
        if (!displayPacket) return;
        navigator.clipboard.writeText(jsonString);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleDownload() {
        if (!displayPacket) return;
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        // Format: resolve-engine-case-{shortId}-packet-v{ver}.json
        const shortId = caseId.slice(0, 8);
        const ver = (displayPacket as any).meta?.version || (displayPacket as any).packet_version || "1.0";
        const safeSuffix = isRedacted ? "-REDACTED" : "";
        const filename = `resolve-engine-case-${shortId}-packet-v${ver}${safeSuffix}.json`;

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

    // Backup current case (Raw, unredacted)
    function handleBackup() {
        if (!packet) return;
        const json = JSON.stringify(packet, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const ver = packet.packet_version || "1.0";
        const filename = `resolve-engine-case-${shortId}-packet-v${ver}.json`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Compute display/export packet based on redaction state
    const displayPacket = packet ? (isRedacted ? redactCasePacket(packet) : packet) : null;
    const jsonString = displayPacket ? JSON.stringify(displayPacket, null, 2) : "";

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            if (!content) return;

            const result = validateCasePacket(content, caseId);
            if (result.valid) {
                setImportedPacket(result.packet);
                setImportWarning(result.warning || null);
                setImportError(null);
            } else {
                setImportedPacket(null);
                setImportWarning(null);
                setImportError(result.error);
            }
        };
        reader.readAsText(file);
    }

    function clearImport() {
        setImportedPacket(null);
        setImportError(null);
        setImportWarning(null);
        setImportOpen(false);
    }

    function handleDownloadSummary() {
        if (!displayPacket) return;
        const txt = buildCaseSummaryTxt(displayPacket, { shareSafe: isRedacted });
        const blob = new Blob([txt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED-SUMMARY" : "-SUMMARY";
        const filename = `case-${shortId}${safeSuffix}.txt`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleDownloadManifest() {
        if (!displayPacket) return;
        const txt = buildExportManifestTxt(displayPacket, { caseId, isRedacted });
        const blob = new Blob([txt], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED-MANIFEST" : "-MANIFEST";
        const filename = `case-${shortId}${safeSuffix}.txt`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Entitlement Check
    const hasEntitlement = packet?.payments?.entitlements?.some(e => e.key === "FINAL_EXPORT_PACK") ?? false;
    const isDev = process.env.NODE_ENV !== "production";

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
                            <FileJson className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900">Export Pack Contents</h3>
                            <p className="text-xs text-zinc-500">Recorded facts, event history, and attachments</p>
                        </div>
                    </div>
                    <ChevronDown
                        className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                </button>

                {isOpen && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        id={contentId}
                        className="border-t border-zinc-100"
                    >
                        <PanelBody className="p-4 border-t border-zinc-100">
                            {/* Toolbar */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <button
                                    onClick={() => setIsRedacted(!isRedacted)}
                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${isRedacted
                                        ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                                        : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                                        }`}
                                >
                                    {isRedacted ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                    {isRedacted ? "Share-Safe (Redacted)" : "Show Full Details"}
                                </button>

                                <button
                                    onClick={() => setImportOpen(!importOpen)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
                                >
                                    <Upload className="h-3.5 w-3.5" />
                                    Import Packet
                                </button>
                            </div>

                            {/* Export Mode Status */}
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between px-1 py-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Export mode:</span>
                                    {isRedacted ? (
                                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-emerald-50/40 px-2.5 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/70" />
                                            <span className="text-xs text-zinc-600">Share-safe (redacted)</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/60 bg-amber-50/40 px-2.5 py-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70" />
                                            <span className="text-xs text-zinc-600">Full</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-zinc-400 text-right max-w-xs">
                                    Contains a snapshot of the case record. Provenance shows where each detail came from.
                                </p>
                            </div>

                            {/* Import Area */}
                            {importOpen && (
                                <div className="mt-4 p-4 border border-slate-200 rounded-md bg-slate-50 relative">
                                    <button
                                        onClick={clearImport}
                                        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                                    >
                                        ×
                                    </button>
                                    {!importedPacket ? (
                                        <>
                                            <h4 className="text-sm font-medium text-slate-800 mb-2">Import Packet (Preview)</h4>
                                            <input
                                                type="file"
                                                accept=".json"
                                                onChange={handleFileChange}
                                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
                                            {importError && (
                                                <p className="mt-2 text-xs text-red-600 flex items-center gap-1">
                                                    <FileWarning className="h-3 w-3" />
                                                    {importError}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-medium text-slate-800">Restore Plan (Preview)</h4>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 px-1 rounded">No Write</span>
                                            </div>

                                            {/* Compatibility Section */}
                                            {(() => {
                                                const compat = assessPacketCompatibility(importedPacket);
                                                const hasIssues = !compat.known_version || compat.missing_blocks.length > 0;
                                                return (
                                                    <div className={`p-2 rounded border text-xs ${hasIssues ? "bg-amber-50 border-amber-200" : "bg-green-50 border-green-200"}`}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="font-semibold text-slate-700">Compatibility</span>
                                                            <span className="font-mono text-[10px] text-slate-500">v{compat.packet_version}</span>
                                                        </div>

                                                        {!compat.known_version && (
                                                            <p className="text-amber-800 mb-1">Unknown version. Some fields may be missing.</p>
                                                        )}

                                                        {compat.missing_blocks.length > 0 ? (
                                                            <div className="text-amber-800">
                                                                <p className="mb-0.5">Missing core blocks:</p>
                                                                <ul className="list-disc list-inside ml-1">
                                                                    {compat.missing_blocks.map((b, i) => <li key={i}>{b}</li>)}
                                                                </ul>
                                                            </div>
                                                        ) : (
                                                            <p className="text-green-800">All core blocks present.</p>
                                                        )}

                                                        {compat.notes.length > 0 && (
                                                            <ul className="list-disc list-inside ml-1 mt-1 text-slate-500">
                                                                {compat.notes.map((n, i) => <li key={i}>{n}</li>)}
                                                            </ul>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {(() => {
                                                const plan = buildRestorePlan(caseId, importedPacket);
                                                return (
                                                    <div className="space-y-2">
                                                        {/* Reasons / Blockers */}
                                                        {!plan.can_apply && (
                                                            <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                                                                <strong>Cannot restore:</strong>
                                                                <ul className="list-disc list-inside mt-1">
                                                                    {plan.reasons.map((r, i) => <li key={i}>{r}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}

                                                        {/* Import Warning (Validation level) */}
                                                        {importWarning && (
                                                            <div className="p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex gap-2">
                                                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                                                <span>{importWarning}</span>
                                                            </div>
                                                        )}

                                                        {/* Writes List */}
                                                        <div className="max-h-48 overflow-y-auto border border-slate-200 rounded bg-white p-2">
                                                            <table className="w-full text-left text-[10px] font-mono">
                                                                <thead>
                                                                    <tr className="border-b border-slate-100 text-slate-400">
                                                                        <th className="pb-1 font-medium">KEY</th>
                                                                        <th className="pb-1 font-medium pl-2">ACTION</th>
                                                                        <th className="pb-1 font-medium pl-2">SUMMARY</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-50">
                                                                    {plan.writes.map((w, i) => (
                                                                        <tr key={i} className="text-slate-600">
                                                                            <td className="py-1 truncate max-w-[120px]" title={w.key}>{w.key}</td>
                                                                            <td className="py-1 pl-2 font-bold text-blue-600">{w.action}</td>
                                                                            <td className="py-1 pl-2 truncate max-w-[150px]" title={w.summary}>{w.summary}</td>
                                                                        </tr>
                                                                    ))}
                                                                    {plan.writes.length === 0 && (
                                                                        <tr>
                                                                            <td colSpan={3} className="py-2 text-center text-slate-400 italic">No keys to restore found in packet.</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>

                                                        <div className="flex items-center justify-between pt-1">
                                                            <button
                                                                onClick={() => {
                                                                    const lines = plan.writes.map(w => `${w.action} ${w.key} (${w.summary})`);
                                                                    navigator.clipboard.writeText(lines.join("\n"));
                                                                }}
                                                                className="text-xs text-slate-500 hover:text-slate-700 underline flex items-center gap-1"
                                                            >
                                                                <Copy className="h-3 w-3" />
                                                                Copy Plan
                                                            </button>
                                                        </div>

                                                        {/* Apply Area */}
                                                        {plan.can_apply && (
                                                            <div className="mt-4 p-3 bg-white border border-slate-200 rounded space-y-3">
                                                                {/* Pre-flight Info */}
                                                                <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-900">
                                                                    <p className="font-semibold mb-2">Pre-flight Check:</p>
                                                                    <p className="mb-1">This will overwrite the following on this device:</p>
                                                                    <ul className="list-disc list-inside space-y-0.5 ml-1 mb-2 text-amber-800">
                                                                        {(() => {
                                                                            const areas = new Set<string>();
                                                                            plan.writes.forEach(w => {
                                                                                if (w.key.includes("dispute_type")) areas.add("Dispute Type");
                                                                                else if (w.key.includes("_tier_")) areas.add("Tier / Entitlements");
                                                                                else if (w.key.includes("_docs")) areas.add("Documents Index");
                                                                                else if (w.key.includes("_events")) areas.add("Event Timeline");
                                                                                else if (w.key.includes("_facts") || w.key.includes("timeline_facts")) areas.add("Timeline Facts");
                                                                                else if (w.key.includes("final_letter")) areas.add("Generated Outputs");
                                                                                else if (w.key.includes("contact_method")) areas.add("Contact Method");
                                                                                else areas.add("Intake Answers");
                                                                            });
                                                                            return Array.from(areas).map(a => <li key={a}>{a}</li>);
                                                                        })()}
                                                                    </ul>
                                                                    <p className="text-[10px] text-amber-700/70">
                                                                        Not affected: Global share-safe toggle, other cases.
                                                                    </p>
                                                                </div>

                                                                {/* Backup Action */}
                                                                <div className="flex items-center justify-between bg-zinc-50 p-2 rounded border border-zinc-100">
                                                                    <span className="text-xs text-zinc-600">Consider before applying:</span>
                                                                    <button
                                                                        onClick={handleBackup}
                                                                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-zinc-200 rounded text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:border-zinc-300 transition-colors"
                                                                    >
                                                                        <Download className="h-3 w-3" />
                                                                        Save a backup copy
                                                                    </button>
                                                                </div>

                                                                <ApplyRestoreControl
                                                                    caseId={caseId}
                                                                    plan={plan}
                                                                    packetVersion={importedPacket.packet_version}
                                                                    importedPacket={importedPacket}
                                                                    onSuccess={() => {
                                                                        // Success handled inside component now
                                                                    }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* JSON preview */}
                            <div className="relative">
                                <pre className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 font-mono overflow-x-auto max-h-80 overflow-y-auto" tabIndex={0}>
                                    {jsonString}
                                </pre>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                                    aria-label={copied ? "Copied JSON to clipboard" : "Copy JSON to clipboard"}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4 text-green-600" />
                                            <span className="text-green-600">Copied</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4 text-zinc-400" />
                                            <span>Copy JSON</span>
                                        </>
                                    )}
                                </button>

                                {hasEntitlement ? (
                                    <button
                                        type="button"
                                        onClick={handleDownload}
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                                        aria-label="Download JSON file"
                                    >
                                        {downloaded ? (
                                            <>
                                                <Check className="h-4 w-4 text-green-600" />
                                                <span className="text-green-600">Downloaded</span>
                                            </>
                                        ) : (
                                            <>
                                                <Download className="h-4 w-4 text-zinc-400" />
                                                <span>Download JSON</span>
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                                            <div className="flex items-start gap-3">
                                                <Lock className="h-5 w-5 text-zinc-400 mt-0.5" />
                                                <div className="text-sm text-zinc-600 space-y-2">
                                                    <p className="font-medium text-zinc-900">Export pack contents</p>
                                                    <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                                                        <li>This export contains a snapshot of the case record, including facts and event history.</li>
                                                        <li>It is only available on supported service tiers.</li>
                                                        {isDev && (
                                                            <li>Development only: A stub entitlement may be applied for testing (simulated).</li>
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="h-4 w-px bg-zinc-200 mx-1 hidden sm:block" />

                                <button
                                    type="button"
                                    onClick={handleDownloadSummary}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                                >
                                    <FileWarning className="h-4 w-4 text-zinc-400" />
                                    <span>Download Summary (.txt)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={handleDownloadManifest}
                                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                                >
                                    <FileWarning className="h-4 w-4 text-zinc-400" />
                                    <span>Download Manifest (.txt)</span>
                                </button>
                            </div>
                        </PanelBody>
                    </motion.div>
                )}
            </div>
        </Reveal>
    );
}

function Reveal({ children }: { children: React.ReactNode }) {
    return <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">{children}</div>;
}

function ApplyRestoreControl({ caseId, plan, packetVersion, importedPacket, onSuccess }: { caseId: string, plan: RestorePlan, packetVersion: string, importedPacket: CasePacket, onSuccess: () => void }) {
    const [step1, setStep1] = useState(false);
    const [step2, setStep2] = useState(false);
    const [typedId, setTypedId] = useState("");
    const [applying, setApplying] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const matchId = caseId.slice(0, 8);
    // Auto-fill typed ID if user clicks a debug button? No, keep it manual.

    // Calculate preview metadata
    const prevDisputeType = importedPacket.case?.dispute_type || "Not sure";
    const prevIssuer = importedPacket.intake?.issuer || "Not provided";
    const prevEvents = importedPacket.events?.count || 0;
    const prevId = importedPacket.case?.id || "Unknown ID";

    const getDisputeLabel = (dt: string | null) => {
        if (dt === "COUNCIL_PCN") return "Council PCN";
        if (dt === "PRIVATE_PARKING") return "Private parking";
        return "Not sure";
    };

    // Safety: If success, lock everything.
    if (success) {
        return (
            <div className="space-y-3 bg-green-50 p-4 rounded border border-green-200 text-center">
                <Check className="h-8 w-8 text-green-600 mx-auto" />
                <div>
                    <p className="text-sm font-bold text-green-800">Restore Applied</p>
                    <p className="text-xs text-green-700 mt-1">Local data has been updated from the packet.</p>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded font-medium text-xs hover:bg-green-700 shadow-sm"
                >
                    <RotateCcw className="h-3 w-3" />
                    Reload now
                </button>
            </div>
        );
    }

    const isReady = step1 && step2 && typedId === matchId;

    async function handleApply() {
        if (!isReady) return;
        setApplying(true);
        setError(null);

        try {
            // 1. Perform Writes
            const writtenKeys: string[] = [];
            for (const write of plan.writes) {
                if (write.action === "SET" && write.value !== undefined) {
                    localStorage.setItem(write.key, write.value);
                    writtenKeys.push(write.key);
                }
            }

            // 2. Audit Event
            appendCaseEvent(caseId, {
                type: "RESTORE_APPLIED",
                at: new Date().toISOString(),
                meta: {
                    applied_at_iso: new Date().toISOString(),
                    keys_written: writtenKeys.length,
                    source_packet_version: packetVersion
                }
            });

            // 3. Success
            await new Promise(r => setTimeout(r, 500));
            setSuccess(true);
            onSuccess(); // Optional side effect

        } catch (e: any) {
            console.error("Restore failed", e);
            setError("Failed to write to storage: " + (e.message || "Unknown error"));
        } finally {
            setApplying(false);
        }
    }

    return (
        <div className="space-y-4 pt-2 border-t border-slate-100">
            {/* Restore Preview */}
            <div className="bg-slate-50 rounded border border-slate-100 p-3 space-y-2">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Restore preview</h5>
                <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                    <dt className="text-slate-500">Case ID</dt>
                    <dd className="font-mono text-slate-700">{prevId.slice(0, 8)}</dd>

                    <dt className="text-slate-500">Dispute type</dt>
                    <dd className="text-slate-700">{getDisputeLabel(prevDisputeType)}</dd>

                    <dt className="text-slate-500">Issuer</dt>
                    <dd className="text-slate-700">{prevIssuer}</dd>

                    <dt className="text-slate-500">Events</dt>
                    <dd className="text-slate-700">{prevEvents} recorded</dd>
                </dl>
            </div>

            <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Confirm Restore</h5>

                <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={step1} onChange={e => setStep1(e.target.checked)} />
                    <span className="text-xs text-slate-600">I understand this will <strong>overwrite</strong> local case data on this device.</span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={step2} onChange={e => setStep2(e.target.checked)} />
                    <span className="text-xs text-slate-600">I confirm the packet belongs to this Case ID.</span>
                </label>

                <div className="pt-1">
                    <p className="text-[10px] text-slate-500 mb-1">Type the first 8 characters of the Case ID to confirm: <span className="font-mono text-slate-700 font-bold">{matchId}</span></p>
                    <input
                        type="text"
                        value={typedId}
                        onChange={e => setTypedId(e.target.value)}
                        placeholder={matchId}
                        className="w-full text-xs font-mono p-1 border border-slate-300 rounded"
                    />
                </div>

                {error && (
                    <p className="text-xs text-red-600 font-medium">{error}</p>
                )}

                <div className="pt-2">
                    <p className="text-xs text-slate-500 mb-2">Restoring will create or overwrite a case on this device.</p>
                    <button
                        disabled={!isReady || applying}
                        onClick={handleApply}
                        className="w-full py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white text-xs font-bold rounded shadow-sm transition-colors flex items-center justify-center gap-2"
                    >
                        {applying ? "Applying..." : "Apply Restore Plan"}
                    </button>
                </div>
            </div>
        </div>
    );
}
