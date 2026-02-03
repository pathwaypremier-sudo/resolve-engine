/**
 * Artifact Header Invariant Checks
 * 
 * Minimal script to verify that generated artifacts produce the required
 * identifiers-first header format.
 * 
 * Run checks manually if needed:
 * npx tsx src/lib/case/__checks__/artifactHeaderChecks.ts
 */

import { buildCaseCoverSheet } from "../coverSheet";
import { buildCaseSummaryTxt } from "../caseSummary";
import { buildExportManifestTxt } from "../exportManifest";
import { buildAppealLetter } from "../../letters/buildAppealLetter";
import { type CasePacket } from "../../casePacket/buildCasePacket";
import { BANNED_PHRASES } from "../../policy/bannedPhrases";

// Minimal mock to satisfy inputs
const MOCK_PACKET: CasePacket = {
    case: {
        id: "test-case-123",
        dispute_type: "COUNCIL_PCN",
        created_at: new Date().toISOString(),
        status: "open",
    },
    intake: {
        issuer: "Mock Issuer",
        reference: "AB12345678",
        notice_date: "2023-01-01",
        event_date: "2023-01-01",
    },
    docs: { count: 0, items: [] },
    events: { count: 0, items: [] },
    submissions_index: { count: 0, items: [] },
    responses_index: { count: 0, items: [] },
    timeline_events: [],
    events_effective: [],
    evidence_checklist: { items: [] },
    contact_method: null,
    schema_version: "2.2"
} as unknown as CasePacket; // Forced cast for minimal shape

function assertHeader(content: string, label: string) {
    if (!content.includes("Resolve Engine —")) {
        throw new Error(`[${label}] Missing standard header prefix`);
    }
    if (!content.includes("Based on current case entries.")) {
        throw new Error(`[${label}] Missing standard subtitle`);
    }
    if (!content.includes("Case ID:")) {
        throw new Error(`[${label}] Missing Case ID line`);
    }
    for (const phrase of BANNED_PHRASES) {
        if (content.includes(phrase)) {
            throw new Error(`[${label}] Contains banned legacy phrase: ${phrase}`);
        }
    }
    console.log(`PASS: ${label}`);
}

async function runChecks() {
    console.log("Running artifact header checks...");

    // No browser mocks needed! We inject the Core Packet into all generators.

    try {
        // Inject packet to bypass localStorage requirements
        const cover = buildCaseCoverSheet("test-case-123", {
            shareSafe: false,
            packet: MOCK_PACKET
        });
        assertHeader(cover, "Cover Sheet");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    try {
        const summary = buildCaseSummaryTxt(MOCK_PACKET, { shareSafe: false });
        assertHeader(summary, "Case Summary");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    try {
        const manifest = buildExportManifestTxt(MOCK_PACKET, { caseId: "test-case-123", isRedacted: false });
        assertHeader(manifest, "Export Manifest");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    try {
        const letter = buildAppealLetter({
            caseId: "test-case-123",
            issuer: "Mock Issuer",
            reference: "AB12345678",
            notice_date: "2023-01-01",
            event_date: "2023-01-01",
            summary: "Test summary",
            desired_outcome: "Cancel",
            docs: [],
            disputeType: "COUNCIL_PCN"
        });
        assertHeader(letter, "Appeal Letter");
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

    console.log("All checks passed.");
}

// Only run if called directly (allows import without execution)
runChecks();
