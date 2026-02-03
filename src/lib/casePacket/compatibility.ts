/**
 * Packet Compatibility Assessment
 * 
 * Checks imported packets for version compatibility and block presence.
 * Does NOT modify data or reject packets - warnings only.
 */

import { type CasePacket } from "./buildCasePacket";

export type CompatibilityResult = {
    packet_version: string;
    known_version: boolean;
    missing_blocks: string[];
    notes: string[];
};

// Known versions and their expected core blocks
const VERSION_BLOCKS: Record<string, { core: string[]; optional: string[] }> = {
    "1.0": { core: ["case", "entitlement", "intake", "docs", "events"], optional: [] },
    "1.1": { core: ["case", "entitlement", "intake", "docs", "events"], optional: [] },
    "1.2": { core: ["case", "entitlement", "intake", "docs", "events"], optional: [] },
    "1.3": { core: ["case", "entitlement", "intake", "docs", "events", "evidence_checklist"], optional: [] },
    "1.4": { core: ["case", "entitlement", "intake", "docs", "events", "evidence_checklist"], optional: [] },
    "1.5": { core: ["case", "entitlement", "intake", "docs", "events", "evidence_checklist"], optional: [] },
    "1.6": { core: ["case", "entitlement", "intake", "docs", "events", "evidence_checklist", "responses_index"], optional: [] },
    "1.7": { core: ["case", "entitlement", "intake", "docs", "events", "evidence_checklist", "responses_index", "submissions_index"], optional: [] },
    "1.8": { core: ["case", "entitlement", "intake", "docs", "events", "evidence_checklist", "responses_index", "submissions_index", "timeline_facts", "derived_dates"], optional: [] },
    "1.9": { core: ["case", "entitlement", "intake", "docs", "events", "evidence_checklist", "responses_index", "submissions_index", "timeline_facts", "derived_dates"], optional: [] },
    "2.0": {
        core: ["case", "entitlement", "intake", "docs", "events", "integrity", "evidence_checklist", "responses_index", "submissions_index", "timeline_facts", "derived_dates", "outputs"],
        optional: ["contact_method"]
    },
    "2.1": {
        core: ["case", "entitlement", "intake", "docs", "events", "integrity", "evidence_checklist", "responses_index", "submissions_index", "timeline_facts", "derived_dates", "outputs"],
        optional: ["contact_method"]
    },
    "2.2": {
        core: ["case", "entitlement", "intake", "docs", "events", "integrity", "evidence_checklist", "responses_index", "submissions_index", "timeline_facts", "derived_dates", "outputs"],
        optional: ["contact_method"]
    },
};

// Minimal blocks required for ANY version to be valid
const MINIMAL_REQUIRED = ["case", "docs", "events"];

/**
 * Assess compatibility of an imported packet.
 */
export function assessPacketCompatibility(packet: CasePacket): CompatibilityResult {
    const version = packet.packet_version || "unknown";
    const notes: string[] = [];
    const missingBlocks: string[] = [];

    // Check if version is known
    const knownVersion = version in VERSION_BLOCKS;

    if (!knownVersion) {
        notes.push(`Packet version "${version}" is not recognized. Compatibility checks are limited.`);
    }

    // Get expected blocks for this version, or use v2.2 as baseline for unknown future versions
    const versionSpec = VERSION_BLOCKS[version] || VERSION_BLOCKS["2.2"];

    // Check core blocks
    for (const block of versionSpec.core) {
        if (!(block in packet) || (packet as any)[block] === null || (packet as any)[block] === undefined) {
            // Special handling for nested blocks
            if (block === "case" && packet.case) continue;
            missingBlocks.push(block);
        }
    }

    // Check optional blocks (just notes, not warnings)
    for (const block of versionSpec.optional) {
        if (!(block in packet) || (packet as any)[block] === null || (packet as any)[block] === undefined) {
            notes.push(`${block} not present; will be derived or use defaults.`);
        }
    }

    // Additional derived notes
    if (!packet.timeline_facts) {
        notes.push("timeline_facts not present; timeline view will show events only.");
    }

    if (!packet.derived_dates) {
        notes.push("derived_dates not present; dates will be computed from intake.");
    }

    // Version-specific notes
    const majorVersion = parseFloat(version);
    if (!isNaN(majorVersion) && majorVersion < 2.0) {
        notes.push("Older packet format (v1.x). Some newer fields may be absent.");
    }

    return {
        packet_version: version,
        known_version: knownVersion,
        missing_blocks: missingBlocks,
        notes,
    };
}

/**
 * Quick check if packet has minimal required structure.
 */
export function hasMinimalStructure(packet: any): boolean {
    if (!packet || typeof packet !== "object") return false;
    for (const block of MINIMAL_REQUIRED) {
        if (!(block in packet)) return false;
    }
    if (!packet.case?.id) return false;
    if (!Array.isArray(packet.docs?.items)) return false;
    if (!Array.isArray(packet.events?.items)) return false;
    return true;
}
