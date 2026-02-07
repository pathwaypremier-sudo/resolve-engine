"use client";

import { useState, useEffect } from "react";
import { Copy, Check, FileText, Send, Inbox, Briefcase, Clock, Shield, Download, Eye, EyeOff } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { useCase } from "@/app/app/case/_context/CaseContext";
import { useEntitlement } from "@/app/app/case/_context/EntitlementContext";
import { readCaseEvents, type CaseEvent, getEffectiveEvents, appendCaseEvent } from "@/lib/case/events";
import { buildEvidenceChecklist } from "@/lib/case/evidenceChecklist";
import { formatCaseSummary, redactCaseSummary } from "@/lib/case/caseSummaryText";
import { buildCasePacket } from "@/lib/casePacket/buildCasePacket";
import { redactCasePacket } from "@/lib/casePacket/redactCasePacket";
import { formatTimelineText } from "@/lib/case/events";
import { redactTimelineText } from "@/lib/case/exportPack";
import { buildHandoffNoteText } from "@/lib/case/handoffNoteText";
import { buildCaseCoverSheet } from "@/lib/case/coverSheet";
import { useShareSafe } from "@/lib/ui/shareSafe";
import { buildCaseExportPack } from "@/lib/case/exportPack/buildCaseExportPack";
import { downloadExportPack } from "@/lib/case/exportPack/downloadExportPack";
import { uploadFileAction } from "@/app/actions/storage";
import { createEmailOutbox } from "@/app/actions/emailOutbox";
import { Mail } from "lucide-react";

interface CaseFileIndexProps {
    caseId: string;
}

export default function CaseFileIndex({ caseId }: CaseFileIndexProps) {
    const { status } = useCase();
    const { tier, capabilities } = useEntitlement();
    const [copied, setCopied] = useState(false);
    const [downloaded, setDownloaded] = useState(false);
    const [handoffCopied, setHandoffCopied] = useState(false);
    const [handoffDownloaded, setHandoffDownloaded] = useState(false);
    const { isRedacted, setIsRedacted } = useShareSafe();
    const [includeAudit, setIncludeAudit] = useState(false); // PATCH10 default OFF
    const [coverSheetDownloaded, setCoverSheetDownloaded] = useState(false);
    const [draftCreated, setDraftCreated] = useState(false);
    const [isCreatingDraft, setIsCreatingDraft] = useState(false);

    // Data state
    const [counts, setCounts] = useState({
        docs: 0,
        submissions: 0,
        responses: 0,
        outputs: 0,
    });
    const [evidenceStatus, setEvidenceStatus] = useState({
        present: 0,
        missing: 0,
        optional: 0,
    });
    const [lastActivity, setLastActivity] = useState<string | null>(null);
    const [identifiers, setIdentifiers] = useState({ issuer: "", reference: "" });

    useEffect(() => {
        // 1. Read Events
        const events = readCaseEvents(caseId);

        // Counts
        const submissions = events.filter((e) => e.type === "APPEAL_SUBMITTED" || e.type === "APPEAL_SUBMITTED_LEGACY").length;
        const responses = events.filter((e) => e.type === "RESPONSE_RECEIVED" || e.type === "APPEAL_REJECTED_PRE_COURT").length;
        const outputs = events.filter((e) => e.type === "DELIVERABLE_GENERATED").length;

        // Last activity
        const sorted = [...events].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        const last = sorted.length > 0 ? sorted[0].at : null;

        // 2. Read Docs
        let docCount = 0;
        try {
            const docRaw = localStorage.getItem(`re_case_${caseId}_docs`);
            if (docRaw) {
                const parsed = JSON.parse(docRaw);
                if (Array.isArray(parsed)) docCount = parsed.length;
            }
        } catch { /* ignore */ }

        // 3. Evidence Checklist
        const checklist = buildEvidenceChecklist(caseId);
        const present = checklist.items.filter((i) => i.status === "PRESENT").length;
        const missing = checklist.items.filter((i) => i.status === "MISSING").length;
        const optional = checklist.items.filter((i) => i.status === "OPTIONAL").length;

        // 4. Identifiers (for copy summary)
        const issuer = localStorage.getItem(`re_case_${caseId}_issuer`) || "";
        const ref = localStorage.getItem(`re_case_${caseId}_reference`) || "";

        setCounts({ docs: docCount, submissions, responses, outputs });
        setEvidenceStatus({ present, missing, optional });
        setLastActivity(last);
        setIdentifiers({ issuer, reference: ref });

    }, [caseId]);

    const getSummaryData = () => ({
        caseId,
        status,
        tier,
        identifiers,
        counts,
        evidence: evidenceStatus,
        lastActivity
    });

    const handleCopy = () => {
        const data = getSummaryData();
        const text = formatCaseSummary(data);
        const finalContent = isRedacted ? redactCaseSummary(text, data) : text;

        navigator.clipboard.writeText(finalContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const data = getSummaryData();
        const text = formatCaseSummary(data);
        const finalContent = isRedacted ? redactCaseSummary(text, data) : text;

        const blob = new Blob([finalContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED" : "";
        const filename = `resolve-engine-case-${shortId}-summary${safeSuffix}.txt`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
    };



    // PATCH10: Snapshot logic
    const [snapshotFeedback, setSnapshotFeedback] = useState("");
    const entitlement = useEntitlement(); // Get entitlement object directly
    const disputeType = localStorage.getItem(`re_case_${caseId}_dispute_type`) || "Credit Card"; // Read dispute type

    function handleRecordSnapshot() {
        const snapshotEvent: CaseEvent = {
            type: "STAGE_SNAPSHOT",
            at: new Date().toISOString(),
            meta: {
                dispute_type: disputeType,
                status: status,
                tier: entitlement?.tier || "NONE",
                caps: capabilities,
                counts: counts,
                evidence: {
                    present: evidenceStatus.present,
                    missing: evidenceStatus.missing
                }
            }
        };

        appendCaseEvent(caseId, snapshotEvent);
        setSnapshotFeedback("Recorded");
        setTimeout(() => setSnapshotFeedback(""), 2000);
    }

    function handleDownloadJSONPack() {
        const pack = buildCaseExportPack(caseId, { shareSafe: isRedacted });
        downloadExportPack(pack);
    }

    function handleExportPack() {
        // Sequential downloads: Packet (JSON), Timeline (.txt), Summary (.txt)
        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED" : "";

        // 1. Packet JSON
        const packet = buildCasePacket(caseId);
        let packetData: any = packet;
        if (isRedacted) {
            packetData = redactCasePacket(packet);
        }
        const packetBlob = new Blob([JSON.stringify(packetData, null, 2)], { type: "application/json" });
        const packetUrl = URL.createObjectURL(packetBlob);
        const packetName = `resolve-engine-case-${shortId}-packet-v${packet.packet_version}${safeSuffix}.json`;

        triggerDownload(packetUrl, packetName);

        // 2. Timeline TXT (Wait 500ms)
        setTimeout(() => {
            const allEvents = readCaseEvents(caseId);
            const sortedEvents = allEvents.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

            // PATCH10: Effective Default + Optional Audit
            const effectiveText = formatTimelineText(getEffectiveEvents(sortedEvents));
            let finalText = effectiveText;

            if (includeAudit) {
                const rawText = formatTimelineText(sortedEvents);
                finalText = `${effectiveText}\n\n----------------------------------------\nRAW AUDIT TRAIL (IMMUTABLE HISTORY)\n----------------------------------------\n${rawText}`;
            }

            const finalTimeline = isRedacted ? redactTimelineText(finalText, allEvents) : finalText;

            const timelineBlob = new Blob([finalTimeline], { type: "text/plain" });
            const timelineUrl = URL.createObjectURL(timelineBlob);

            const auditSuffix = includeAudit ? "-AUDIT" : "";
            const timelineName = `resolve-engine-case-${shortId}-timeline${auditSuffix}${safeSuffix}.txt`;

            triggerDownload(timelineUrl, timelineName);
        }, 500);

        // 3. Summary TXT (Wait 1000ms)
        setTimeout(() => {
            const data = getSummaryData();
            const summaryText = formatCaseSummary(data);
            const finalSummary = isRedacted ? redactCaseSummary(summaryText, data) : summaryText;

            const summaryBlob = new Blob([finalSummary], { type: "text/plain" });
            const summaryUrl = URL.createObjectURL(summaryBlob);
            const summaryName = `resolve-engine-case-${shortId}-summary${safeSuffix}.txt`;

            triggerDownload(summaryUrl, summaryName);

            setDownloaded(true);
            setTimeout(() => setDownloaded(false), 2000);
        }, 1000);
    }

    function handleCopyHandoff() {
        const text = buildHandoffNoteText(caseId, isRedacted);
        navigator.clipboard.writeText(text);
        setHandoffCopied(true);
        setTimeout(() => setHandoffCopied(false), 2000);
    }

    function handleDownloadHandoff() {
        const text = buildHandoffNoteText(caseId, isRedacted);
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED" : "";
        const filename = `resolve-engine-case-${shortId}-handoff${safeSuffix}.txt`;

        triggerDownload(url, filename);
        setHandoffDownloaded(true);
        setTimeout(() => setHandoffDownloaded(false), 2000);
    }

    function triggerDownload(url: string, filename: string) {
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleDownloadCoverSheet() {
        const text = buildCaseCoverSheet(caseId, { shareSafe: isRedacted });
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED" : "";
        const filename = `resolve-engine-case-${shortId}-cover-sheet${safeSuffix}.txt`;

        triggerDownload(url, filename);
        setCoverSheetDownloaded(true);
        setTimeout(() => setCoverSheetDownloaded(false), 2000);
    }

    async function handleCreateDraft() {
        if (isCreatingDraft) return;
        setIsCreatingDraft(true);

        try {
            // 1. Generate Export Pack
            const pack = buildCaseExportPack(caseId, { shareSafe: isRedacted });
            const packJson = JSON.stringify(pack, null, 2);

            // 2. Upload to Storage
            const shortId = caseId.slice(0, 8);
            const dateStr = new Date().toISOString().split("T")[0];
            const safeSuffix = isRedacted ? "-REDACTED" : "";
            const filename = `resolve_export_pack_${shortId}_${dateStr}${safeSuffix}.json`;
            const docId = `export_${Date.now()}`;

            const blob = new Blob([packJson], { type: "application/json" });
            const file = new File([blob], filename, { type: "application/json" });

            const formData = new FormData();
            formData.append("caseId", caseId);
            formData.append("docId", docId);
            formData.append("file", file);

            const uploadResult = await uploadFileAction(formData);

            // Handle upload blocked (maintenance mode or uploads disabled)
            if (!uploadResult.ok) {
                console.error('Upload blocked:', uploadResult.error);
                alert(uploadResult.error); // Show user-friendly message
                return;
            }

            // 3. Create Email Draft
            const bodyText = `Attached is my complaint pack for your review. It contains a timeline, copies, and relevant case details as recorded.`;

            await createEmailOutbox(caseId, {
                subject: `Complaint pack — Case ${shortId}`,
                bodyText: bodyText, // Factual template
                attachments: [{
                    name: filename,
                    uri: uploadResult.uri,
                    checksumSha256: uploadResult.checksumSha256,
                    mime: "application/json",
                    sizeBytes: uploadResult.sizeBytes
                }]
            });

            // 4. Confirmation
            setDraftCreated(true);

            // Optional: User didn't ask to clear the feedback, but 'Email draft created in case record' 
            // is implied by the button state transform users usually expect.
            // Prompt says: "Show a small factual confirmation UI: Email draft created in case record."
            // I'll show it via the button label or a separate text?
            // "Show a ... confirmation UI" often means a toast or text below.
            // I updated the button to say "Draft created". 
            // I'll also add the feedback text next to it or replace the button temporarily?
            // I'll stick to the button state + maybe a toast if I had one. 
            // Code block above changes button to "Draft created".

        } catch (err) {
            console.error(err);
        } finally {
            setIsCreatingDraft(false);
        }
    }

    // Format capability highlights (max 3)
    const capHighlights = capabilities
        .slice(0, 3)
        .map(c => c.replace(/_/g, " ").toLowerCase())
        .map(c => c.charAt(0).toUpperCase() + c.slice(1))
        .join(", ");

    return (
        <Reveal>
            <Panel variant="subtle" className="space-y-4">
                {/* A) Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900">Case file index</h3>
                        <div className="flex items-center gap-2">
                            <p className="text-xs text-zinc-500">Operational snapshot (read-only)</p>
                            <button
                                type="button"
                                onClick={handleRecordSnapshot}
                                className="text-[10px] text-zinc-400 hover:text-zinc-600 underline"
                                title="Log a point-in-time snapshot to the timeline"
                            >
                                {snapshotFeedback || "Record snapshot"}
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeAudit}
                                onChange={(e) => setIncludeAudit(e.target.checked)}
                                className="h-3 w-3 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            />
                            <span className="text-xs text-zinc-500 select-none">Include raw audit trail</span>
                        </label>

                        <button
                            type="button"
                            disabled={isCreatingDraft || draftCreated}
                            onClick={handleCreateDraft}
                            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-medium transition-colors shadow-sm ${draftCreated
                                ? "bg-green-50 border-green-200 text-green-700"
                                : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                                }`}
                        >
                            {draftCreated ? (
                                <>
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Draft created</span>
                                </>
                            ) : (
                                <>
                                    <Mail className="h-3.5 w-3.5" />
                                    <span>{isCreatingDraft ? "Creating..." : "Create email draft (optional)"}</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadJSONPack}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 rounded text-xs font-medium hover:bg-zinc-50 transition-colors shadow-sm"
                        >
                            <Briefcase className="h-3.5 w-3.5" />
                            <span>Download export pack</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportPack}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-zinc-50 rounded text-xs font-medium hover:bg-zinc-800 transition-colors shadow-sm"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Export files</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsRedacted(!isRedacted)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${isRedacted
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                }`}
                            aria-pressed={isRedacted}
                            title="Redact identifiers from Export/Copy"
                        >
                            {isRedacted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>

                        <button
                            type="button"
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                            aria-label={copied ? "Copied summary to clipboard" : "Copy summary to clipboard"}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3 w-3 text-green-600" />
                                    <span>Copied</span>
                                    <span className="sr-only" aria-live="polite">Copied summary successfully</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy summary</span>
                                </>
                            )}
                        </button>

                        {/* Handoff Note Buttons */}
                        <button
                            type="button"
                            onClick={handleCopyHandoff}
                            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                            aria-label={handoffCopied ? "Copied handoff note" : "Copy handoff note"}
                        >
                            {handoffCopied ? (
                                <>
                                    <Check className="h-3 w-3 text-green-600" />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <FileText className="h-3 w-3" />
                                    <span>Copy handoff</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadHandoff}
                            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                            aria-label={handoffDownloaded ? "Downloaded handoff note" : "Download handoff note"}
                        >
                            {handoffDownloaded ? (
                                <>
                                    <Check className="h-3 w-3 text-green-600" />
                                    <span>Downloaded</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-3 w-3" />
                                    <span>Download handoff</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleDownloadCoverSheet}
                            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                            aria-label={coverSheetDownloaded ? "Downloaded cover sheet" : "Download cover sheet"}
                        >
                            {coverSheetDownloaded ? (
                                <>
                                    <Check className="h-3 w-3 text-green-600" />
                                    <span>Downloaded</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-3 w-3" />
                                    <span>Cover sheet</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleDownload}
                            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded px-2 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
                            aria-label={downloaded ? "Downloaded summary" : "Download summary text"}
                        >
                            {downloaded ? (
                                <>
                                    <Check className="h-3 w-3 text-green-600" />
                                    <span>Saved</span>
                                </>
                            ) : (
                                <>
                                    <Download className="h-3 w-3" />
                                    <span>Download .txt</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="flex justify-end px-1 -mt-2">
                    <p className="text-[10px] text-zinc-400">
                        Export pack includes: case cover sheet, data packet, timeline, event log, and provenance index (including OCR provenance where recorded).
                    </p>
                </div>

                {/* B) Summary Grid */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    {/* Column 1 */}
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs font-medium text-zinc-500">Status</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className={
                                    status === "PREMIUM_ACTIVE" ? "text-amber-600 font-medium" :
                                        status === "ENTITLED" ? "text-blue-600 font-medium" :
                                            status === "ASSESSMENT_READY" ? "text-green-600 font-medium" :
                                                "text-zinc-700 font-medium"
                                }>
                                    {status.replace(/_/g, " ")}
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-zinc-500">Tier & Capabilities</p>
                            <p className="text-zinc-900 font-medium mt-0.5">{tier}</p>
                            <p className="text-xs text-zinc-400 truncate" title={capHighlights}>
                                {capHighlights || "No capabilities"}
                            </p>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-zinc-500">Last activity</p>
                            <div className="flex items-center gap-1.5 mt-0.5 text-zinc-700">
                                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                                <span>
                                    {lastActivity
                                        ? new Date(lastActivity).toLocaleDateString(undefined, {
                                            year: 'numeric', month: 'short', day: 'numeric'
                                        })
                                        : "None"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            <div>
                                <p className="text-xs font-medium text-zinc-500">Documents</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <FileText className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="font-medium text-zinc-900">{counts.docs}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-zinc-500">Evidence</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Shield className="h-3.5 w-3.5 text-zinc-400" />
                                    <div className="text-xs">
                                        <span className="text-green-600 font-medium">{evidenceStatus.present}</span>
                                        <span className="text-zinc-300 mx-1">/</span>
                                        <span className={evidenceStatus.missing > 0 ? "text-red-500 font-medium" : "text-zinc-400"}>
                                            {evidenceStatus.missing}
                                        </span>
                                        <span className="text-zinc-300 mx-1">/</span>
                                        <span className="text-zinc-400">{evidenceStatus.optional}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div>
                                <p className="text-xs font-medium text-zinc-500">Submissions</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Send className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="font-medium text-zinc-900">{counts.submissions}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-medium text-zinc-500">Responses</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <Inbox className="h-3.5 w-3.5 text-zinc-400" />
                                    <span className="font-medium text-zinc-900">{counts.responses}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-medium text-zinc-500">Outputs generated</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                                <span className="font-medium text-zinc-900">{counts.outputs}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* C) Safety line */}
                <div className="pt-3 border-t border-zinc-100">
                    <p className="text-xs text-zinc-400">
                        This is a snapshot of your case file and timeline.
                    </p>
                </div>
            </Panel>
        </Reveal>
    );
}
