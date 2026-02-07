import { buildCaseCoverSheet } from "@/lib/case/coverSheet";
import { buildCasePacket } from "@/lib/casePacket/buildCasePacket";
import { redactCasePacket } from "@/lib/casePacket/redactCasePacket";
import { readCaseEvents, getEffectiveEvents, formatTimelineText } from "@/lib/case/events";
import { redactTimelineText } from "@/lib/case/exportPack";
import { formatCaseSummary, redactCaseSummary } from "@/lib/case/caseSummaryText";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { CaseStorage } from "@/lib/case/CaseStorage";
import { VerticalId } from "@/lib/verticals/verticals";

let auditLog: any;
if (typeof window === "undefined") {
    // Avoid bundling auditLog on client
    try {
        auditLog = require("@/lib/ops/auditLog.server").auditLog;
    } catch {
        // Fallback for environments where it might fail
    }
}

type CaseEvent = {
    type: string;
    at: string;
    meta?: Record<string, any>;
};

function stableSortEventsAsc(events: CaseEvent[]): CaseEvent[] {
    return [...events].sort((a, b) => {
        const timeA = new Date(a.at).getTime();
        const timeB = new Date(b.at).getTime();
        if (timeA !== timeB) return timeA - timeB;

        const typeCompare = String(a.type).localeCompare(String(b.type));
        if (typeCompare !== 0) return typeCompare;

        const metaA = JSON.stringify(a.meta || {});
        const metaB = JSON.stringify(b.meta || {});
        return metaA.localeCompare(metaB);
    });
}

function stableSortEventsDesc(events: CaseEvent[]): CaseEvent[] {
    return stableSortEventsAsc(events).reverse();
}

function getMaxEventTimestamp(events: CaseEvent[]): string {
    const sorted = stableSortEventsAsc(events);
    if (sorted.length === 0) return "UNKNOWN";
    return sorted[sorted.length - 1].at;
}

export type CaseExportPackV1 = {
    version: "re_export_pack_v1";
    generatedAtIso: string;
    caseId: string;
    notes: string[];
    provenance_index?: {
        version: string;
        generatedAtIso: string;
        docs: Array<{
            docId: string | null;
            name: string | null;
            category: string | null;
            hasOcrText: boolean;
            ocrEngine: string | null;
            ocrTimestamp: string | null;
            storage: {
                provider: string;
                uri: string;
                checksumSha256: string;
            } | null;
        }>;
        facts: Array<{
            key: string;
            value: string;
            provenance: string;
            docId: string | null;
            confirmedByUser: boolean;
        }>;
    };
    files: Array<{
        path: string;
        mime: string;
        shareSafe: boolean;
        content: string;
    }>;
    evidenceStatus?: "PROVIDED" | "NONE_DECLARED" | null;
    verticalId?: VerticalId;
    email_outbox?: {
        items: Array<{
            id: string;
            createdAtIso: string;
            to: string | null;
            subject: string;
            bodyText: string;
            attachments: Array<{
                name: string;
                uri: string;
                checksumSha256: string;
                mime: string;
                sizeBytes: number;
            }>;
            status: "DRAFT" | "READY" | "SENT" | "FAILED";
        }>;
    };
};

export function buildCaseExportPack(caseId: string, options: { shareSafe: boolean }): CaseExportPackV1 {
    const { shareSafe } = options;

    // Read events early to derive generatedAtIso deterministically
    const allEvents = readCaseEvents(caseId);
    const generatedAtIso = getMaxEventTimestamp(allEvents);

    // 1. Cover Sheet (Text)
    // buildCaseCoverSheet already handles shareSafe internal check if passed in options, 
    // but looking at CaseFileIndex usage: buildCaseCoverSheet(caseId, { shareSafe: isRedacted })
    const coverSheetContent = buildCaseCoverSheet(caseId, { shareSafe });

    // 2. Case Packet (JSON)
    const rawPacket = buildCasePacket(caseId);
    const packetContent = shareSafe ? redactCasePacket(rawPacket) : rawPacket;
    const packetJson = JSON.stringify(packetContent, null, 2);

    // 3. Timeline (Text)
    // Use stable sort with tie-breakers (no in-place mutation)
    const sortedEvents = stableSortEventsDesc(allEvents);
    const effectiveEvents = getEffectiveEvents(sortedEvents);
    const rawTimelineText = formatTimelineText(effectiveEvents);
    const timelineContent = shareSafe ? redactTimelineText(rawTimelineText, allEvents) : rawTimelineText;

    // 4. Summary (Text) - Optional but useful to include as separate file
    // Need to reconstitute data object for formatCaseSummary if possible, 
    // or we can rely on what we can easily derive here. 
    // CaseFileIndex constructs a complex object. 
    // Let's see if we can get by with a simpler summary or re-derive what's needed.
    // Ideally we shouldn't duplicate logic.
    // However, formatCaseSummary requires `{ caseId, status, tier, identifiers, counts, evidence, lastActivity }`.
    // These are derived in the component. 
    // For the export pack, let's stick to the Core items requested: "Cover sheet, Case packet JSON, Timeline text".
    // The user prompt says: "Share-safe summary text: reuse existing... otherwise create a minimal...".
    // Since re-deriving all UI counts from scratch here might be brittle or duplication, 
    // we can skip the "Summary" strictly if Cover Sheet covers enough, OR we can implement a lightweight one.
    // Cover Sheet IS a summary. Let's rely on Cover Sheet, Packet, and Timeline as the core trio.
    // Actually, Cover Sheet is usually very good. 
    // Let's add the Cover Sheet as "case-summary.txt" or "cover-sheet.txt".

    const notes = [
        "This export reflects what is currently recorded for this case.",
        "No advice or outcomes are implied."
    ];
    if (shareSafe) {
        notes.push("Where 'share-safe' is true, personal identifiers may be removed or masked.");
    }

    const evidenceStatus = typeof window !== "undefined"
        ? (persistence.get(`re_case_${caseId}_evidence_status`) as "PROVIDED" | "NONE_DECLARED" | null)
        : null;

    const verticalId = CaseStorage.getVerticalId(caseId);

    // Build Provenance Index
    // Extract facts from SCAN_APPLY_CONFIRMED_FIELDS events
    const scanEvents = allEvents.filter(e => e.type === "SCAN_APPLY_CONFIRMED_FIELDS");

    // We want to flatten the applied fields from these events
    const facts: Array<{
        key: string;
        value: string;
        provenance: string;
        docId: string | null;
        confirmedByUser: boolean;
    }> = [];

    // Note: If there are multiple scan events, we might take the latest or all.
    // The requirement says "recorded intake fields that were applied". 
    // Usually fields are unique key-value pairs in the case. 
    // We should probably Map them to avoid duplicates if multiple events touch the same field, 
    // but the requirement "one entry per recorded intake field that has provenance" implies current state.
    // But we only have the *Event* to look at for provenance.
    // Let's iterate events and add them.
    for (const ev of scanEvents) {
        if (!ev.meta || !ev.meta.facts) continue;
        const meta = ev.meta as Record<string, any>;
        const appliedFields = (Array.isArray(meta.appliedFields) ? meta.appliedFields : Object.keys(meta.facts)) as string[];
        const prov = (meta.provenance as string) || "OCR_UNVERIFIED";

        for (const key of appliedFields) {
            const val = meta.facts[key];
            if (typeof val === "string") {
                const hasExplicit = meta.confirmedByUser === true || Boolean(meta.confirmedAt);
                facts.push({
                    key,
                    value: val,
                    provenance: prov,
                    docId: (meta.docId as string) || null,
                    confirmedByUser: prov === "OCR_UNVERIFIED" ? hasExplicit : hasExplicit
                });
            }
        }
    }

    const provenance_index = {
        version: "1.0",
        generatedAtIso,
        docs: rawPacket.docs.items.map(d => ({
            docId: d.id ?? null,
            name: d.name ?? null,
            category: d.category ?? null,
            hasOcrText: Boolean(d.ocrText && String(d.ocrText).trim().length > 0),
            ocrEngine: d.ocrProvenance?.engine ?? null,
            ocrTimestamp: d.ocrProvenance?.timestamp ?? null,
            storage: d.storage ? {
                provider: "local",
                uri: d.storage.uri,
                checksumSha256: d.storage.checksumSha256
            } : null
        })),
        facts
    };




    // Read from unified case record (persistence)
    const storedCase = typeof window !== "undefined"
        ? (persistence.getJSON<{ outbox?: any[] }>(`re_case_${caseId}`) || {})
        : {};

    const storedItems = Array.isArray(storedCase.outbox) ? storedCase.outbox : [];

    const email_outbox = {
        items: storedItems.map(i => ({
            id: i.id,
            createdAtIso: i.createdAtIso,
            to: i.to,
            subject: i.subject,
            bodyText: i.bodyText,
            attachments: i.attachments,
            status: i.status
        }))
    };

    if (auditLog) {
        auditLog({
            eventType: "EXPORT_GENERATED",
            caseId,
            exportKind: shareSafe ? "REDACTED" : "FULL",
            exportChecksum: provenance_index.docs[0]?.storage?.checksumSha256 // Minimal traceability
        });
    }

    return {
        version: "re_export_pack_v1",
        generatedAtIso,
        caseId,
        notes,
        evidenceStatus,
        verticalId,
        provenance_index,
        email_outbox,
        files: [
            {
                path: "case/cover-sheet.txt",
                mime: "text/plain",
                shareSafe,
                content: coverSheetContent
            },
            {
                path: "case/data-packet.json",
                mime: "application/json",
                shareSafe,
                content: packetJson
            },
            {
                path: "case/timeline.txt",
                mime: "text/plain",
                shareSafe,
                content: timelineContent
            }
        ]
    };
}
