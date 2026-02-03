
import { type EvidenceChecklist } from "./evidenceChecklist";

/**
 * Simple redaction helper purely for the note.
 */
function redactRef(ref: string): string {
    if (!ref) return "";
    if (ref.length <= 4) return "••••";
    return ref.slice(0, 4) + "•".repeat(ref.length - 4);
}

/**
 * Builds a plain text note for requesting missing evidence.
 * Respects Share-safe toggle for reference redaction.
 */
export function buildMissingEvidenceNote(caseId: string, checklist: EvidenceChecklist, shareSafe: boolean): string | null {
    const missing = checklist.items.filter(i => i.status === "MISSING");
    if (missing.length === 0) return null;

    // Read identifiers
    let issuer = "";
    let reference = "";
    if (typeof window !== "undefined") {
        issuer = localStorage.getItem(`re_case_${caseId}_issuer`) || "";
        reference = localStorage.getItem(`re_case_${caseId}_reference`) || "";
    }

    if (shareSafe && reference) {
        reference = redactRef(reference);
    }

    const shortId = caseId.slice(0, 8);
    const dateStr = new Date().toLocaleDateString();

    const lines: string[] = [];

    // Header
    lines.push(`CASE FOLLOW-UP NOTE`);
    lines.push(`===================`);
    lines.push(`Date:      ${dateStr}`);
    lines.push(`Case ID:   ${shortId}`);
    if (issuer) lines.push(`Issuer:    ${issuer}`);
    if (reference) lines.push(`Reference: ${reference}`);
    lines.push(``); // Spacer

    // Body
    lines.push(`I am updating my case file. Please provide copies of the following items, if available:`);
    lines.push(``);

    missing.forEach(item => {
        lines.push(`- ${item.label}`);
    });

    lines.push(``);
    lines.push(`Please reply in writing.`);
    lines.push(`I will keep a copy of this message for my records.`);

    return lines.join("\n");
}
