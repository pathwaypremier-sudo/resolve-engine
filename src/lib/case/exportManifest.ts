/**
 * Export Manifest Generator
 * Generates a plain text manifest describing available exports.
 * Designed for audit logging.
 */

interface ManifestOptions {
    caseId: string;
    isRedacted: boolean;
}

// Update signature to use Packet for data access
import { type CasePacket } from "@/lib/casePacket/buildCasePacket";

import { deriveCaseIdentityFromPacket } from "./identity";
import { assertNoBannedPhrases } from "../policy/assertNoBannedPhrases";

export function buildExportManifestTxt(packet: CasePacket, opts: ManifestOptions): string {
    const lines: string[] = [];
    const { isRedacted } = opts;

    // Header
    lines.push("Resolve Engine — Export Manifest");
    lines.push("Based on current case entries.");

    const identity = deriveCaseIdentityFromPacket(packet);

    lines.push(`Case ID:      ${identity.id.slice(0, 8)}`);
    lines.push(`Issuer:       ${identity.issuer}`);
    lines.push(`Reference:    ${identity.reference}`);
    lines.push(`Dispute type: ${identity.disputeTypeLabel}`);
    lines.push("");

    lines.push(`Export Mode:  ${isRedacted ? "Share-safe (redacted)" : "Full"}`);
    lines.push(`Generated:    ${new Date().toLocaleString()}`);
    lines.push("");

    // Available Artifacts
    lines.push("Available Export Artifacts:");
    lines.push("- Case packet (JSON)");
    lines.push("- Case summary (.txt)");
    // Note: Cover sheet is dynamic/user-dependent, but usually available if entitled. 
    // We list it as available for consistency with the panel options.

    lines.push("");
    lines.push("----------------------------------------");
    lines.push("End of Manifest");

    const output = lines.join("\n");
    assertNoBannedPhrases(output);
    return output;
}
