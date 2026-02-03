/**
 * Appeal Letter Builder - procedural, parking-safe template.
 * No numeric deadlines. Identifiers-first. Factual only.
 */

import { formatCaseIdShort } from "../case/formatCaseId";
import { readDisputeType, getDisputeTypeLabel } from "../case/disputeType";
import { type CorrespondenceHeaderInput, buildCorrespondenceHeaderText } from "../case/correspondenceHeader";
import { assertNoBannedPhrases } from "../policy/assertNoBannedPhrases";

export type AppealLetterInput = {
    caseId: string;
    issuer: string | null;
    reference: string | null;
    notice_date: string | null;
    event_date: string | null;
    summary: string | null;
    desired_outcome: string | null;
    docs: Array<{ name: string; category?: string | null }>;
    disputeType?: string | null; // Optional override for purity
};

function getVal(caseId: string, key: string): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(`re_case_${caseId}_${key}`);
}

/**
 * Build a standardised appeal/representation letter.
 * Constitutional posture: calm, procedural, no deadlines, no promises.
 */
export function buildAppealLetter(input: AppealLetterInput): string {
    const {
        caseId,
        issuer,
        reference,
        notice_date,
        event_date,
        summary,
        desired_outcome,
        docs,
    } = input;

    // Read dispute type (canonical), favoring input if provided
    const disputeType = input.disputeType || readDisputeType(caseId) || "Not sure";

    const lines: string[] = [];

    // A) Header block (Unified)
    // A) Header block (Unified Identifiers-first)
    // "Resolve Engine — Appeal Letter" standard header.
    // If we want to send this, user can strip it, but per spec we add it.

    lines.push("Resolve Engine — Appeal Letter");
    lines.push("Based on current case entries.");

    lines.push(`Case ID:      ${caseId.slice(0, 8)}`);
    lines.push(`Issuer:       ${issuer || "Not provided"}`);
    lines.push(`Reference:    ${reference || "Not provided"}`);
    lines.push(`Dispute category: ${getDisputeTypeLabel(disputeType)}`); // Basic cleanup
    lines.push("");

    // Date separate or standard? Spec blank line then content.
    // Appeal letter normally has Date.
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push("");

    // B) Subject
    lines.push("Re: Appeal / representations");
    lines.push("");

    // C) Opening
    lines.push("I am writing regarding the above matter.");
    lines.push("");

    // D) Factual details (only if present)
    let hasFactualDetails = false;
    if (notice_date) {
        lines.push(`Notice / charge date: ${notice_date}`);
        hasFactualDetails = true;
    }
    if (event_date) {
        lines.push(`Event date: ${event_date}`);
        hasFactualDetails = true;
    }
    if (summary) {
        if (hasFactualDetails) {
            lines.push("");
        }
        lines.push("Summary:");
        lines.push(summary);
        hasFactualDetails = true;
    }
    if (hasFactualDetails) {
        lines.push("");
    }

    // E) Requested outcome
    if (desired_outcome) {
        lines.push("Requested outcome:");
        lines.push(desired_outcome);
    } else {
        lines.push("I request that this matter is reviewed and resolved appropriately.");
    }
    lines.push("");

    // F) Evidence posture
    lines.push("I have enclosed copies of relevant documents for your consideration.");
    lines.push("");

    // G) Response posture + escalation cues (NO NUMBERS)
    lines.push("Please provide your response in writing.");
    lines.push(
        "If you do not agree, please confirm your final position and any route for independent review or appeal that may be available."
    );
    lines.push("");

    // H) Closing
    lines.push("Yours faithfully,");
    lines.push("(Name)");
    lines.push("");

    // I) Attachments
    lines.push("Attachments:");
    if (docs.length > 0) {
        for (const doc of docs) {
            const category = doc.category || "Document";
            lines.push(`- ${category}: ${doc.name}`);
        }
    } else {
        lines.push("- None");
    }

    const output = lines.join("\n");
    assertNoBannedPhrases(output);
    return output;
}

/**
 * Build letter input from localStorage for a given caseId.
 */
export function getAppealLetterInputFromStorage(caseId: string): AppealLetterInput {
    const issuer = localStorage.getItem(`re_case_${caseId}_issuer`);
    const reference = localStorage.getItem(`re_case_${caseId}_reference`);
    const notice_date = localStorage.getItem(`re_case_${caseId}_notice_date`);
    const event_date = localStorage.getItem(`re_case_${caseId}_event_date`);
    const summary = localStorage.getItem(`re_case_${caseId}_summary`);
    const desired_outcome = localStorage.getItem(`re_case_${caseId}_desired_outcome`);

    let docs: Array<{ name: string; category?: string | null }> = [];
    const docsJson = localStorage.getItem(`re_case_${caseId}_docs`);
    if (docsJson) {
        try {
            const parsed = JSON.parse(docsJson);
            if (Array.isArray(parsed)) {
                docs = parsed.map((d: { name?: string; category?: string }) => ({
                    name: d.name || "Unknown",
                    category: d.category || null,
                }));
            }
        } catch {
            // Ignore parse errors
        }
    }

    return {
        caseId,
        issuer: issuer && issuer !== "NOT_SURE" ? issuer : null,
        reference: reference && reference !== "NOT_SURE" ? reference : null,
        notice_date: notice_date && notice_date !== "NOT_SURE" ? notice_date : null,
        event_date: event_date && event_date !== "NOT_SURE" ? event_date : null,
        summary: summary && summary !== "NOT_SURE" ? summary : null,
        desired_outcome: desired_outcome && desired_outcome !== "NOT_SURE" ? desired_outcome : null,
        docs,
        disputeType: localStorage.getItem(`re_case_${caseId}_dispute_type`) || null,
    };
}
