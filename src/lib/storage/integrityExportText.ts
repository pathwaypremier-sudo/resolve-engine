
import { validateCaseStorage, type StorageWarning } from "./validateCaseStorage";

/**
 * Redaction helper (matches followUpNote / packet logic)
 */
function redactRef(ref: string): string {
    if (!ref) return "";
    if (ref.length <= 4) return "••••";
    return ref.slice(0, 4) + "•".repeat(ref.length - 4);
}

/**
 * Builds a plain text integrity report for the current case storage state.
 * Respects Share-safe toggle for PII.
 */
export function buildIntegrityExportText(caseId: string, shareSafe: boolean): string | null {
    // 1. Validate
    const result = validateCaseStorage(caseId);

    // If no warnings, usually no report needed, but we can output a "Clean" report if requested.
    // However, UI generally only shows download if warnings exist.
    // We'll generate it regardless in case logic changes.

    // 2. Read context
    let issuer = "";
    let reference = "";
    let tier = "None";
    let disputeType = "Missing";
    let contactMethodVal = null;
    let eventsCount = 0;

    if (typeof window !== "undefined") {
        issuer = localStorage.getItem(`re_case_${caseId}_issuer`) || "";
        reference = localStorage.getItem(`re_case_${caseId}_reference`) || "";

        const tierRaw = localStorage.getItem(`re_case_tier_${caseId}`);
        if (tierRaw) tier = tierRaw;

        const dtRaw = localStorage.getItem(`re_case_${caseId}_dispute_type`);
        if (dtRaw) disputeType = dtRaw;

        const eventsRaw = localStorage.getItem(`re_case_${caseId}_events`);
        if (eventsRaw) {
            try {
                const evs = JSON.parse(eventsRaw);
                if (Array.isArray(evs)) eventsCount = evs.length;
            } catch { }
        }

        const contactRaw = localStorage.getItem(`re_case_${caseId}_contact_method`);
        if (contactRaw) {
            try {
                const c = JSON.parse(contactRaw);
                contactMethodVal = c.value;
            } catch { }
        }
    }

    // 3. Redact
    if (shareSafe) {
        if (reference) reference = redactRef(reference);
        if (contactMethodVal) contactMethodVal = "REDACTED";
    }

    const shortId = caseId.slice(0, 8);
    const dateStr = new Date().toISOString();

    const lines: string[] = [];

    // Header
    lines.push(`INTEGRITY REPORT (LOCAL DEVICE)`);
    lines.push(`=============================`);
    lines.push(`Generated:    ${dateStr}`);
    lines.push(`Case ID:      ${shortId}`);
    lines.push(`Dispute Type: ${disputeType}`);
    lines.push(`Tier:         ${tier}`);

    // Identifiers (optional but helpful context)
    if (issuer) lines.push(`Issuer:       ${issuer}`);
    if (reference) lines.push(`Reference:    ${reference}`);

    lines.push(`Events:       ${eventsCount}`);
    if (contactMethodVal) lines.push(`Contact Contact: ${contactMethodVal}`);

    lines.push(``); // Spacer

    // Warnings
    lines.push(`WARNINGS (${result.warnings.length})`);
    lines.push(`-------------------`);

    if (result.warnings.length === 0) {
        lines.push(`(No warnings detected. Storage integrity checks pass.)`);
    } else {
        result.warnings.forEach(w => {
            lines.push(`- [${w.key}] ${w.message}`);
        });
    }

    lines.push(``);
    lines.push(`-----------------------------------------------------------`);
    lines.push(`This report lists issues detected in the browser's local storage.`);
    lines.push(`It does not imply legal validity of the case.`);

    return lines.join("\n");
}
