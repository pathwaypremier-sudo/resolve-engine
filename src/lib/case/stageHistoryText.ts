/**
 * Stage History Text Export
 * 
 * Generates plain-text audit report of case stage snapshots.
 * Read-only, share-safe aware.
 */

import { readCaseEvents, type CaseEvent } from "./events";

// Snapshot event types we care about
const SNAPSHOT_TYPES = ["STAGE_SNAPSHOT", "EVIDENCE_GAP_SNAPSHOT", "INTEGRITY_SNAPSHOT"];

/**
 * Redact a reference string (mask all but last 4 chars).
 */
function redactRef(ref: string): string {
    if (!ref) return "";
    if (ref.length <= 4) return "••••";
    return "••••" + ref.slice(-4);
}

/**
 * Format a snapshot event for display.
 */
function formatSnapshotEntry(event: CaseEvent, shareSafe: boolean): string {
    const date = new Date(event.at).toISOString();
    const meta = event.meta || {};

    let typeLabel = "Unknown";
    let summary = "";

    switch (event.type) {
        case "STAGE_SNAPSHOT": {
            typeLabel = "Stage snapshot";
            const status = (meta.status as string) || "unknown";
            const tier = (meta.tier as string) || "none";
            const counts = meta.counts as { docs?: number; submissions?: number; responses?: number; outputs?: number } || {};
            const evidence = meta.evidence as { present?: number; missing?: number } || {};
            summary = `Status: ${status} · Tier: ${tier} · Docs: ${counts.docs ?? 0} · Subs: ${counts.submissions ?? 0} · Resp: ${counts.responses ?? 0} · Out: ${counts.outputs ?? 0} · Missing evidence: ${evidence.missing ?? 0}`;
            break;
        }
        case "EVIDENCE_GAP_SNAPSHOT": {
            typeLabel = "Evidence gap";
            const gaps = meta.missing_required as string[] || [];
            const optCount = (meta.optional_count as number) ?? 0;
            const presentCount = (meta.present_count as number) ?? 0;
            const topGaps = gaps.slice(0, 2).join(", ");
            summary = `Missing required: ${gaps.length}${topGaps ? ` (${topGaps})` : ""} · Optional: ${optCount} · Present: ${presentCount}`;
            break;
        }
        case "INTEGRITY_SNAPSHOT": {
            typeLabel = "Integrity snapshot";
            const warnings = meta.warnings as any[] || [];
            const stats = meta.stats as { present?: number; expected?: number } || {};
            summary = `Warnings: ${warnings.length} · Keys present: ${stats.present ?? "?"}/${stats.expected ?? "?"}`;
            break;
        }
    }

    return `[${date}] ${typeLabel}\n  ${summary}`;
}

/**
 * Build plain-text stage history export.
 */
export function buildStageHistoryText(caseId: string, shareSafe: boolean): string {
    if (typeof window === "undefined") {
        return "Stage history unavailable (server-side rendering).";
    }

    const lines: string[] = [];
    const shortId = caseId.slice(0, 8);

    // Header
    lines.push("══════════════════════════════════════════════════════════════");
    lines.push("RESOLVE ENGINE — STAGE HISTORY");
    lines.push("══════════════════════════════════════════════════════════════");
    lines.push(`Case ID: ${shortId}...`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");

    // Get snapshot events
    const allEvents = readCaseEvents(caseId);
    const snapshots = allEvents
        .filter(e => SNAPSHOT_TYPES.includes(e.type))
        .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()); // oldest-first for export

    if (snapshots.length === 0) {
        lines.push("No snapshots recorded.");
        lines.push("");
    } else {
        lines.push(`Total snapshots: ${snapshots.length}`);
        lines.push("────────────────────────────────────────");
        lines.push("");

        for (const event of snapshots) {
            lines.push(formatSnapshotEntry(event, shareSafe));
            lines.push("");
        }
    }

    // Footer
    lines.push("────────────────────────────────────────");
    lines.push("Use 'Record snapshot' in Case File Index to capture state at any time.");
    lines.push("══════════════════════════════════════════════════════════════");

    return lines.join("\n");
}

/**
 * Get snapshot events for UI display (newest-first).
 */
export function getSnapshotEvents(caseId: string): CaseEvent[] {
    if (typeof window === "undefined") return [];

    const allEvents = readCaseEvents(caseId);
    return allEvents
        .filter(e => SNAPSHOT_TYPES.includes(e.type))
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()); // newest-first for UI
}

/**
 * Format snapshot for compact UI display.
 */
export function formatSnapshotForUI(event: CaseEvent): { label: string; summary: string; time: string } {
    const meta = event.meta || {};
    const time = new Date(event.at).toLocaleString();

    let label = "Unknown";
    let summary = "";

    switch (event.type) {
        case "STAGE_SNAPSHOT": {
            label = "Stage snapshot";
            const status = (meta.status as string) || "—";
            const tier = (meta.tier as string) || "—";
            const evidence = meta.evidence as { missing?: number } || {};
            summary = `${status} · ${tier} · ${evidence.missing ?? 0} missing`;
            break;
        }
        case "EVIDENCE_GAP_SNAPSHOT": {
            label = "Evidence gap";
            const gaps = meta.missing_required as string[] || [];
            summary = `${gaps.length} missing required`;
            break;
        }
        case "INTEGRITY_SNAPSHOT": {
            label = "Integrity snapshot";
            const warnings = meta.warnings as any[] || [];
            summary = `${warnings.length} warning(s)`;
            break;
        }
    }

    return { label, summary, time };
}
