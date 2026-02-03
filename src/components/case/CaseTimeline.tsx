"use client";

import { useState, useEffect, useMemo } from "react";
import { Clock, ChevronDown, Copy, Check, Download, Shield, Eye, EyeOff } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import {
    readCaseEvents,
    formatEventLabel,
    formatEventMeta,
    formatEventTime,
    formatTimelineText,
    getEventCategory,
    type CaseEvent,
    type EventCategory,
    appendCaseEvent,
    getEffectiveEvents,
} from "@/lib/case/events";

import { redactCaseEmail, redactStringWithReference } from "@/lib/redaction/redact";
import { redactTimelineText } from "@/lib/case/exportPack";
import { useShareSafe } from "@/lib/ui/shareSafe";
import CorrectEventPanel from "./CorrectEventPanel";
import Link from "next/link";

interface CaseTimelineProps {
    caseId: string;
    mode?: "compact" | "full";
    showFullCollapsible?: boolean;
}

export default function CaseTimeline({
    caseId,
    mode = "compact",
    showFullCollapsible = true,
}: CaseTimelineProps) {
    const [events, setEvents] = useState<CaseEvent[]>([]);
    const [isFullOpen, setIsFullOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const { isRedacted, setIsRedacted } = useShareSafe();
    const [downloaded, setDownloaded] = useState(false);
    const [filter, setFilter] = useState<EventCategory>("ALL");
    const [includeAudit, setIncludeAudit] = useState(false); // PATCH10

    // Correction state
    const [correctingEventAt, setCorrectingEventAt] = useState<string | null>(null);

    useEffect(() => {
        const load = () => {
            const all = readCaseEvents(caseId);
            // Sort by date desc
            const sorted = all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
            // PATCH10: Use effective events (corrections applied) for display
            const effective = getEffectiveEvents(sorted);
            setEvents(effective);
        };
        load();

        const handleFocus = () => load();
        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [caseId]);

    // Sort by timestamp descending (newest first)
    const sortedEvents = useMemo(() => {
        return [...events].sort(
            (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
        );
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (filter === "ALL") return sortedEvents;
        return sortedEvents.filter((e) => getEventCategory(e.type) === filter);
    }, [sortedEvents, filter]);

    const displayEvents = mode === "compact" ? filteredEvents.slice(0, 5) : filteredEvents;

    function handleCorrectionSave(event: CaseEvent, correctedFields: Record<string, any>, reason: string) {
        const correctionEvent: CaseEvent = {
            type: "EVENT_CORRECTED",
            at: new Date().toISOString(),
            meta: {
                target_at: event.at,
                target_type: event.type,
                corrected_fields: correctedFields,
                reason
            }
        };

        appendCaseEvent(caseId, correctionEvent);
        setCorrectingEventAt(null);

        // Refresh events
        const all = readCaseEvents(caseId);
        const sorted = all.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        const effective = getEffectiveEvents(sorted);
        setEvents(effective);
    }

    function handleCopyTimeline() {
        if (!events.length) return;
        const text = formatTimelineText(filteredEvents);
        const finalContent = isRedacted ? redactTimelineText(text, events) : text;

        navigator.clipboard.writeText(finalContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleDownloadTimeline() {
        // PATCH10: Export ALL events regardless of filter, to preserve audit trail context
        // Default: Use effective events (corrections applied)
        const effectiveText = formatTimelineText(getEffectiveEvents(sortedEvents));

        let finalText = effectiveText;

        if (includeAudit) {
            const rawText = formatTimelineText(sortedEvents);
            finalText = `${effectiveText}\n\n----------------------------------------\nRAW AUDIT TRAIL (IMMUTABLE HISTORY)\n----------------------------------------\n${rawText}`;
        }

        const finalContent = isRedacted ? redactTimelineText(finalText, events) : finalText;

        const blob = new Blob([finalContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);

        const shortId = caseId.slice(0, 8);
        const safeSuffix = isRedacted ? "-REDACTED" : "";
        const auditSuffix = includeAudit ? "-AUDIT" : "";
        const filename = `resolve-engine-case-${shortId}-timeline${auditSuffix}${safeSuffix}.txt`;

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

    if (events.length === 0) {
        return (
            <Reveal>
                <Panel variant="subtle">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Clock className="h-4 w-4" />
                        <span>No events recorded yet</span>
                    </div>
                </Panel>
            </Reveal>
        );
    }

    return (
        <Reveal>
            <Panel variant="subtle" className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-zinc-400" />
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                            Timeline
                        </p>
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as EventCategory)}
                            className="ml-2 text-xs border border-zinc-200 rounded px-1.5 py-0.5 bg-white text-zinc-600 focus:border-zinc-400 focus:outline-none"
                        >
                            <option value="ALL">All</option>
                            <option value="INTAKE">Intake</option>
                            <option value="ENTITLEMENT">Entitlement</option>
                            <option value="OUTPUTS">Outputs</option>
                            <option value="SUBMISSIONS">Submissions</option>
                            <option value="RESPONSES">Responses</option>
                            <option value="SYSTEM">System</option>
                        </select>
                        <span className="text-[10px] text-zinc-400 ml-1">
                            {filteredEvents.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setIsRedacted(!isRedacted)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 ${isRedacted
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                                }`}
                            aria-pressed={isRedacted}
                            title="Share-safe view: Redact PII (reference, emails) for sharing"
                        >
                            {isRedacted ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>

                        <button
                            type="button"
                            onClick={handleCopyTimeline}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
                        >
                            {copied ? (
                                <>
                                    <Check className="h-3 w-3 text-green-500" />
                                    <span>Copied</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-3 w-3" />
                                    <span>Copy</span>
                                </>
                            )}
                        </button>

                        <label className="flex items-center gap-1.5 cursor-pointer mr-2">
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
                            onClick={handleDownloadTimeline}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
                        >
                            {downloaded ? (
                                <>
                                    <Check className="h-3 w-3 text-green-500" />
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

                {/* Events list */}
                <ul className="space-y-2">
                    {displayEvents.map((event, idx) => (
                        <li
                            key={`${event.at}-${idx}`}
                            className="flex items-start gap-3 text-sm"
                        >
                            <span className="h-2 w-2 mt-1.5 rounded-full bg-zinc-300 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-zinc-900">{formatEventLabel(event)}</p>
                                <p className="text-xs text-zinc-400">
                                    {formatEventTime(event.at)}
                                    {formatEventMeta(event) && (
                                        <span className="ml-2 text-zinc-500">
                                            {formatEventMeta(event)}
                                        </span>
                                    )}
                                </p>

                                {/* Linked Doc Jump */}
                                {(typeof (event as any).effective_meta?.linked_doc_id === 'string' || typeof event.meta?.linked_doc_id === 'string') && (
                                    <Link
                                        href={`/app/case/${caseId}/intake/docs?doc=${(event as any).effective_meta?.linked_doc_id || event.meta?.linked_doc_id}`}
                                        className="block mt-1 text-[10px] text-zinc-400 hover:text-zinc-600 hover:underline transition-colors"
                                    >
                                        View linked document →
                                    </Link>
                                )}

                                {/* Corrected Indicator */}
                                {(event as any).effective_meta && (
                                    <div className="mt-1 flex items-center gap-1.5">
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                                            Corrected
                                        </span>
                                        {/* Optional: could scroll to correction event, but for now just a tag is fine */}
                                    </div>
                                )}

                                {/* Correction UI: Only show if NOT a correction event itself */}
                                {(event.type === "RESPONSE_RECEIVED" || event.type === "APPEAL_SUBMITTED") && (
                                    <div className="mt-1">
                                        {correctingEventAt === event.at ? (
                                            <CorrectEventPanel
                                                event={event}
                                                onSave={(fields, reason) => handleCorrectionSave(event, fields, reason)}
                                                onCancel={() => setCorrectingEventAt(null)}
                                            />
                                        ) : (
                                            <button
                                                onClick={() => setCorrectingEventAt(event.at)}
                                                className="text-[10px] text-blue-600 hover:text-blue-800 underline decoration-blue-200 hover:decoration-blue-400 underline-offset-2 transition-colors"
                                            >
                                                Correct this event
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>

                {/* Show more indicator for compact mode */}
                {mode === "compact" && filteredEvents.length > 5 && (
                    <p className="text-xs text-zinc-400 no-print">
                        + {filteredEvents.length - 5} more events
                    </p>
                )}

                {/* Full timeline collapsible */}
                {showFullCollapsible && mode === "compact" && filteredEvents.length > 5 && (
                    <div className="border-t border-zinc-100 pt-3">
                        <button
                            type="button"
                            onClick={() => setIsFullOpen(!isFullOpen)}
                            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700"
                            aria-expanded={isFullOpen}
                        >
                            <ChevronDown
                                className={`h-3 w-3 transition-transform ${isFullOpen ? "rotate-180" : ""
                                    }`}
                            />
                            <span>{isFullOpen ? "Hide full timeline" : "View full timeline"}</span>
                        </button>

                        <ul className={`mt-3 space-y-2 ${isFullOpen ? "" : "hidden"} print-show`}>
                            {filteredEvents.slice(5).map((event, idx) => (
                                <li
                                    key={`full-${event.at}-${idx}`}
                                    className="flex items-start gap-3 text-sm"
                                >
                                    <span className="h-2 w-2 mt-1.5 rounded-full bg-zinc-200 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-zinc-700">{formatEventLabel(event)}</p>
                                        <p className="text-xs text-zinc-400">
                                            {formatEventTime(event.at)}
                                            {formatEventMeta(event) && (
                                                <span className="ml-2 text-zinc-500">
                                                    {formatEventMeta(event)}
                                                </span>
                                            )}
                                        </p>

                                        {/* Correction UI for extended list */}
                                        {(event.type === "RESPONSE_RECEIVED" || event.type === "APPEAL_SUBMITTED") && (
                                            <div className="mt-1">
                                                {correctingEventAt === event.at ? (
                                                    <CorrectEventPanel
                                                        event={event}
                                                        onSave={(fields, reason) => handleCorrectionSave(event, fields, reason)}
                                                        onCancel={() => setCorrectingEventAt(null)}
                                                    />
                                                ) : (
                                                    <button
                                                        onClick={() => setCorrectingEventAt(event.at)}
                                                        className="text-[10px] text-blue-600 hover:text-blue-800 underline decoration-blue-200 hover:decoration-blue-400 underline-offset-2 transition-colors"
                                                    >
                                                        Correct this event
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Procedural footer */}
                <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-100">
                    Maintain a dated timeline. Keep copies of all correspondence.
                </p>
            </Panel>
        </Reveal >
    );
}
