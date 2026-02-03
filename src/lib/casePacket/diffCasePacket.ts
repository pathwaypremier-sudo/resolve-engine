import { type CasePacket } from "./buildCasePacket";

// Helper to find latest snapshot event
function getLatestSnapshot(events: any[]): string | null {
    if (!Array.isArray(events)) return null;
    const snapshots = events.filter(e => e.type === "STAGE_SNAPSHOT");
    if (snapshots.length === 0) return null;
    // Sort desc
    snapshots.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    return snapshots[0].at;
}

export type SnapshotRelation = "IMPORTED_NEWER" | "CURRENT_NEWER" | "EQUAL" | "UNKNOWN";

export type PacketDiff = {
    generated_at: { current: string; imported: string };
    packet_version: { current: string; imported: string; match: boolean };
    case_id: { current: string; imported: string; match: boolean };
    dispute_type: { current: string | null; imported: string | null; match: boolean };
    tier: { current: string; imported: string; match: boolean };
    intake_submitted: { current: boolean; imported: boolean; match: boolean };
    counts: {
        events: { current: number; imported: number; diff: number };
        docs: { current: number; imported: number; diff: number };
        responses: { current: number; imported: number; diff: number };
        submissions: { current: number; imported: number; diff: number };
        outputs: { current: number; imported: number; diff: number }; // Added outputs
    };
    snapshot: {
        current_at: string | null;
        imported_at: string | null;
        relation: SnapshotRelation;
    };
};

export function diffCasePacket(current: CasePacket, imported: CasePacket): PacketDiff {
    // Detect snapshots
    // 1. Current: prefer effective events (new standard) or fall back to raw
    const currentEvents = (current as any).events_effective?.items || current.events.items;
    const currentSnap = getLatestSnapshot(currentEvents);

    // 2. Imported: prefer effective events (if v1.7+) or fall back to raw
    const importedEvents = (imported as any).events_effective?.items || imported.events.items;
    const importedSnap = getLatestSnapshot(importedEvents);

    // 3. Determine relation
    let relation: SnapshotRelation = "UNKNOWN";
    if (currentSnap && importedSnap) {
        const cTime = new Date(currentSnap).getTime();
        const iTime = new Date(importedSnap).getTime();
        if (iTime > cTime) relation = "IMPORTED_NEWER";
        else if (cTime > iTime) relation = "CURRENT_NEWER";
        else relation = "EQUAL";
    }

    return {
        generated_at: {
            current: current.generated_at_iso,
            imported: imported.generated_at_iso,
        },
        packet_version: {
            current: current.packet_version,
            imported: imported.packet_version,
            match: current.packet_version === imported.packet_version,
        },
        case_id: {
            current: current.case.id,
            imported: imported.case.id,
            match: current.case.id === imported.case.id,
        },
        dispute_type: {
            current: current.case.dispute_type,
            imported: imported.case.dispute_type,
            match: current.case.dispute_type === imported.case.dispute_type,
        },
        tier: {
            current: current.entitlement.tier,
            imported: imported.entitlement.tier,
            match: current.entitlement.tier === imported.entitlement.tier,
        },
        intake_submitted: {
            current: current.integrity.intake_submitted,
            imported: imported.integrity.intake_submitted,
            match: current.integrity.intake_submitted === imported.integrity.intake_submitted,
        },
        counts: {
            events: {
                current: current.events.count,
                imported: imported.events.count,
                diff: imported.events.count - current.events.count,
            },
            docs: {
                current: current.docs.count,
                imported: imported.docs.count,
                diff: imported.docs.count - current.docs.count,
            },
            responses: {
                current: current.responses_index.count,
                imported: imported.responses_index.count,
                diff: imported.responses_index.count - current.responses_index.count,
            },
            submissions: {
                current: current.submissions_index.count,
                imported: imported.submissions_index.count,
                diff: imported.submissions_index.count - current.submissions_index.count,
            },
            outputs: {
                current: current.outputs?.final_letter ? 1 : 0,
                imported: imported.outputs?.final_letter ? 1 : 0,
                diff: 0 // rough proxy
            },
        },
        snapshot: {
            current_at: currentSnap,
            imported_at: importedSnap,
            relation
        }
    };
}

function countOutputs(packet: CasePacket): number {
    if (!packet.events || !packet.events.items) return 0;
    return packet.events.items.filter(e => e.type === "DELIVERABLE_GENERATED").length;
}
