/**
 * Case event types and helpers for consistent timeline rendering.
 * Audit-grade: handles unknown types gracefully, never crashes.
 */

export type CaseEvent = {
    type: string;
    at: string;
    meta?: Record<string, unknown>;
};

export type EventCategory =
    | "ALL"
    | "INTAKE"
    | "ENTITLEMENT"
    | "OUTPUTS"
    | "SUBMISSIONS"
    | "RESPONSES"
    | "SYSTEM";

/**
 * Get category for an event type.
 */
export function getEventCategory(type: string): EventCategory {
    switch (type) {
        case "INTAKE_SUBMITTED":
            return "INTAKE";
        case "TIER_SELECTED":
        case "TIER_SELECTED":
        case "CASE_EMAIL_ASSIGNED":
        case "ENTITLEMENT_GRANTED":
            return "ENTITLEMENT";
        case "DELIVERABLE_GENERATED":
        case "CASE_PACKET_COPIED":
            return "OUTPUTS";
        case "APPEAL_SUBMITTED":
        case "APPEAL_SUBMITTED_LEGACY":
            return "SUBMISSIONS";
        case "RESPONSE_RECEIVED":
        case "APPEAL_REJECTED_PRE_COURT":
            return "RESPONSES";
        case "CASE_FIELDS_EXTRACTED":
        case "STAGE_SNAPSHOT":
        case "SCAN_APPLY_CONFIRMED_FIELDS":
        case "EVIDENCE_GAP_SNAPSHOT":
        case "PAYMENT_CHECKOUT_CREATED":
        case "PAYMENT_CHECKOUT_UPDATED":
        case "CRM_SYNC_CONFIGURED":
        case "CRM_SYNC_REQUESTED":
        case "CRM_SYNC_ATTEMPTED":
        case "CRM_SYNC_SUCCEEDED":
        case "CRM_SYNC_FAILED":
        case "AUTH_SESSION_STARTED":
        case "AUTH_SESSION_ENDED":
        case "AUTH_POLICY_EVALUATED":
            return "SYSTEM";
        default:
            return "SYSTEM"; // Unknown types are system/audit log
    }
}

/**
 * Read case events from localStorage.
 * Returns empty array if missing or malformed.
 */
export function readCaseEvents(caseId: string): CaseEvent[] {
    try {
        if (typeof window === "undefined") return [];
        const json = localStorage.getItem(`re_case_${caseId}_events`);
        if (!json) return [];
        const parsed = JSON.parse(json);
        if (!Array.isArray(parsed)) {
            console.warn(`[events] Expected array for case ${caseId}, got`, typeof parsed);
            return [];
        }
        return parsed as CaseEvent[];
    } catch (e) {
        console.warn(`[events] Failed to parse events for case ${caseId}`, e);
        return [];
    }
}

/**
 * Format event type to human-readable label.
 * Unknown types return "Recorded event".
 */
export function formatEventLabel(event: CaseEvent): string {
    const { type, meta } = event;

    switch (type) {
        case "INTAKE_SUBMITTED":
            return "Intake submitted";
        case "TIER_SELECTED":
            return `Tier selected: ${meta?.tier ?? "—"}`;
        case "DELIVERABLE_GENERATED":
            return `Deliverable generated: ${meta?.kind ?? "—"}`;
        case "CASE_EMAIL_ASSIGNED":
            return "Case email assigned";
        case "APPEAL_SUBMITTED":
            return "Appeal submitted";
        case "APPEAL_SUBMITTED_LEGACY": // Fallback if needed, though we reuse type
            return "Appeal submitted";
        case "RESPONSE_RECEIVED":
            if (meta?.response_type) {
                return "Response received";
            }
            return `Response received: ${meta?.outcome ?? "—"}`;
        case "APPEAL_REJECTED_PRE_COURT":
            return "Appeal rejected (pre-court)";
        case "CASE_PACKET_COPIED":
            return "Case packet export copied";
        case "STAGE_SNAPSHOT":
            return "Stage snapshot recorded";
        case "STORAGE_BLOCK_RESET":
            return "Storage block reset";
        case "INTEGRITY_SNAPSHOT":
            const warnCount = (meta?.warnings as any[])?.length ?? 0;
            return `Integrity snapshot recorded`;
        case "EVIDENCE_GAP_SNAPSHOT":
            return "Evidence gap recorded";
        case "CASE_FIELDS_EXTRACTED":
            return "Fields extracted";
        case "SCAN_APPLY_CONFIRMED_FIELDS":
            return "Appplied scanned fields";
        case "EVENT_CORRECTED":
            return `Correction recorded: ${event.meta?.target_type ?? "Event"}`;
        case "RESTORE_APPLIED":
            return "Restore applied";
        case "PAYMENT_CHECKOUT_CREATED":
            return "Checkout created";
        case "PAYMENT_CHECKOUT_UPDATED":
            return `Checkout status: ${event.meta?.status ?? "updated"}`;
        case "ENTITLEMENT_GRANTED":
            return "Entitlement granted";
        case "CRM_SYNC_CONFIGURED":
            return "CRM sync configured";
        case "CRM_SYNC_REQUESTED":
            return "CRM sync requested";
        case "CRM_SYNC_ATTEMPTED":
            return "CRM sync attempted";
        case "CRM_SYNC_SUCCEEDED":
            return "CRM sync succeeded";
        case "CRM_SYNC_FAILED":
            return "CRM sync failed";
        case "AUTH_SESSION_STARTED":
            return "Auth session started";
        case "AUTH_SESSION_ENDED":
            return "Auth session ended";
        case "AUTH_POLICY_EVALUATED":
            return "Auth policy evaluated";
        default:
            return type.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
    }
}

/**
 * Append a new event to the case history.
 * Handles reading current, appending, and saving back to localStorage.
 */
export function appendCaseEvent(caseId: string, event: CaseEvent): void {
    try {
        const events = readCaseEvents(caseId);
        events.push(event);
        // Sort by 'at' descending usually? Or ascending?
        // readCaseEvents just returns the array.
        // Usually we append to end. 
        // But the CaseTimeline sorts correctly.
        if (typeof window !== "undefined") {
            localStorage.setItem(`re_case_${caseId}_events`, JSON.stringify(events));
        }
    } catch (e) {
        console.error("Failed to append event", e);
    }
}

/**
 * Format event metadata to a small summary string.
 * Returns null if no relevant meta to show.
 */
export function formatEventMeta(event: CaseEvent): string | null {
    const { type, meta } = event;
    if (!meta) return null;

    if (type === "EVENT_CORRECTED") {
        const targetAt = meta.target_at as string;
        const reason = meta.reason as string;
        const corrected = meta.corrected_fields as Record<string, any>;

        const changes = corrected
            ? Object.keys(corrected).map(k => `${k}`).join(", ")
            : "details";

        return `Target: ${targetAt ? new Date(targetAt).toLocaleString() : '?'}.${reason ? ` Reason: ${reason}` : ''} [${changes}]`;
    }

    switch (type) {
        case "CASE_EMAIL_ASSIGNED":
            return meta.email ? String(meta.email) : null;
        case "TIER_SELECTED":
            return null; // Already in label
        case "APPEAL_SUBMITTED":
            if (meta?.method || meta?.submitted_date || meta?.linked_doc_name) {
                const parts: string[] = [];
                if (meta.method) parts.push(String(meta.method));
                if (meta.submitted_date) parts.push(String(meta.submitted_date));
                if (meta.linked_doc_name) parts.push(`Proof: ${meta.linked_doc_name}`);
                return parts.join(", ");
            }
            return null;
        case "RESPONSE_RECEIVED":
            if (meta?.response_type) {
                const parts: string[] = [String(meta.response_type)];
                if (meta.received_date) parts.push(String(meta.received_date));
                if (meta.linked_doc_name) parts.push(`Doc: ${meta.linked_doc_name}`);
                return parts.join(", ");
            }
            return null; // Old format handled in label
        case "DELIVERABLE_GENERATED":
            return null; // Already in label
        case "CASE_PACKET_COPIED":
            return meta.bytes ? `${meta.bytes} bytes` : null;
        case "STAGE_SNAPSHOT":
            // meta: { status, tier, counts: {docs, submissions, responses, outputs}, evidence: {present, missing} }
            const s = meta.status || "?";
            const t = meta.tier || "?";
            const c = meta.counts as any || {};
            const ev = meta.evidence as any || {};

            return `${s} · ${t} · Docs ${c.docs ?? 0} · Sub ${c.submissions ?? 0} · Resp ${c.responses ?? 0} · Out ${c.outputs ?? 0} · Ev Missing ${ev.missing ?? 0}`;
        case "EVIDENCE_GAP_SNAPSHOT":
            // meta: { missing_required: string[], optional_missing: string[], present: string[], counts: {present, missing, optional} }
            const cGap = meta.counts as any || {};
            const missingReq = (meta.missing_required as string[]) || [];

            let suffix = "";
            if (missingReq.length > 0) {
                const firstTwo = missingReq.slice(0, 2).join(", ");
                suffix = ` (${firstTwo}${missingReq.length > 2 ? "..." : ""})`;
            }

            return `Missing ${cGap.missing ?? 0} required${suffix} · Optional ${cGap.optional ?? 0} · Present ${cGap.present ?? 0}`;
        case "SCAN_APPLY_CONFIRMED_FIELDS":
            const appliedKeys = (meta?.appliedFields as string[]) || [];
            const src = meta?.sourceType || "?";
            const status = meta?.ocrStatus ? ` (${meta.ocrStatus})` : "";
            return `Applied ${appliedKeys.length} fields from ${src}${status}`;
        case "PAYMENT_CHECKOUT_CREATED":
            return meta ? `${meta.amountPence} ${(meta.currency as string || "").toUpperCase()} for ${meta.purpose}` : null;
        case "ENTITLEMENT_GRANTED":
            return meta ? `${meta.entitlementKey} via ${meta.provider}` : null;
        case "CRM_SYNC_CONFIGURED":
            return meta ? `Target: ${meta.targetId} (${meta.mode})` : null;
        case "CRM_SYNC_REQUESTED":
            return meta ? `Scope: ${meta.scope}` : null;
        case "CRM_SYNC_ATTEMPTED":
            return meta ? `Attempt: ${meta.attemptId}` : null;
        case "CRM_SYNC_SUCCEEDED":
            return meta ? `Result: ${meta.resultSummary}` : null;
        case "CRM_SYNC_FAILED":
            return meta ? `Class: ${meta.failureClass} (Retryable: ${meta.retryable})` : null;
        case "AUTH_SESSION_STARTED":
            return meta ? `Actor: ${meta.actorId} (Mode: ${meta.mode})` : null;
        case "AUTH_SESSION_ENDED":
            return meta ? `Reason: ${meta.reason}` : null;
        case "AUTH_POLICY_EVALUATED":
            return meta ? `${meta.policyKey} => ${meta.decision} (${meta.reasonCode})` : null;
        default:
            return null;
    }
}

/**
 * Derives the "effective" state of events by applying corrections.
 * Corrections are EVENTS_CORRECTED types that target other events.
 * Returns a new array with `effective_meta` populated on targeted events.
 */
export function getEffectiveEvents(events: CaseEvent[]): (CaseEvent & { effective_meta?: Record<string, unknown> })[] {
    // 1. Find all corrections
    const corrections = events.filter(e => e.type === "EVENT_CORRECTED");
    if (corrections.length === 0) return events;

    // 2. Map original events to their corrections
    return events.map(event => {
        // Find corrections targeting this event
        const relevantCorrections = corrections.filter(c =>
            c.meta?.target_at === event.at &&
            c.meta?.target_type === event.type &&
            c.meta?.corrected_fields
        );

        if (relevantCorrections.length === 0) return event;

        // 3. Sort corrections by timeline order (latest last)
        const sortedCorrections = relevantCorrections.sort((a, b) =>
            new Date(a.at).getTime() - new Date(b.at).getTime()
        );

        // 4. Merge fields from all corrections in order
        let effectiveMeta = { ...event.meta };
        for (const correction of sortedCorrections) {
            const fields = correction.meta?.corrected_fields as Record<string, unknown>;
            if (fields) {
                effectiveMeta = { ...effectiveMeta, ...fields };
            }
        }

        // Return event with attached effective_meta
        return {
            ...event,
            effective_meta: effectiveMeta
        };
    });
}

/**
 * Format timestamp for display.
 */
export function formatEventTime(isoString: string): string {
    try {
        const date = new Date(isoString);
        return date.toLocaleString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return isoString;
    }
}

/**
 * Format timeline as plain text (for copy).
 */
export function formatTimelineText(events: CaseEvent[]): string {
    return events
        .map((e) => {
            const time = formatEventTime(e.at);
            const label = formatEventLabel(e);
            const meta = formatEventMeta(e);
            return meta ? `${time} — ${label} (${meta})` : `${time} — ${label}`;
        })
        .join("\n");
}
