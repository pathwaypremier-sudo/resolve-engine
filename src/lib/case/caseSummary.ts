/**
 * Case Summary Generator
 * Generates a plain text audit snapshot of the case.
 * Designed for print/email/archive.
 */

import { type CasePacket } from "@/lib/casePacket/buildCasePacket";

interface SummaryOptions {
    shareSafe: boolean;
}

import { deriveCaseIdentityFromPacket } from "./identity";
import { assertNoBannedPhrases } from "../policy/assertNoBannedPhrases";

export function buildCaseSummaryTxt(packet: CasePacket, opts: SummaryOptions): string {
    const lines: string[] = [];
    const isRedacted = opts.shareSafe;

    // Header (Identifiers-first)
    lines.push("Resolve Engine — Case Summary (share-safe)");
    lines.push("Based on current case entries.");

    const identity = deriveCaseIdentityFromPacket(packet);

    lines.push(`Case ID:      ${identity.id.slice(0, 8)}`);
    lines.push(`Issuer:       ${identity.issuer}`);
    lines.push(`Reference:    ${identity.reference}`);
    lines.push(`Dispute type: ${identity.disputeTypeLabel}`);
    lines.push("");

    lines.push(`Export Date:  ${new Date().toLocaleString()}`);

    // Integrity
    lines.push("Integrity Check:");
    lines.push(`- Documents:  ${packet.docs.count} recorded`);
    lines.push(`- Events:     ${packet.events.count} recorded`);

    // Status
    const sub = packet.submissions_index.items[0]; // Latest
    const res = packet.responses_index.items[0];   // Latest

    lines.push(`- Submission: ${packet.submissions_index.count > 0 ? `Yes (${new Date(sub.at).toLocaleDateString()})` : "No record"}`);
    lines.push(`- Response:   ${packet.responses_index.count > 0 ? `Yes (${new Date(res.at).toLocaleDateString()})` : "No record"}`);

    lines.push("");
    lines.push("----------------------------------------");
    lines.push("End of Summary");

    const output = lines.join("\n");
    assertNoBannedPhrases(output);
    return output;
}
