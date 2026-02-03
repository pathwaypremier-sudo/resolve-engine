/**
 * Handoff Note Generator
 * 
 * Generates a plain-text ops-grade handoff note for operational use.
 * Strictly factual, no deadlines, no promises, no invented data.
 */

import { readCaseEvents, type CaseEvent } from "./events";
import { buildEvidenceChecklist } from "./evidenceChecklist";
import { getNextAction } from "./nextAction";
import { getProceduralRoute } from "./proceduralRoute";
import { readDisputeType } from "./disputeType";

/**
 * Redact a reference string (mask all but last 4 chars).
 */
function redactRef(ref: string): string {
    if (!ref) return "";
    if (ref.length <= 4) return "••••";
    return "••••" + ref.slice(-4);
}

/**
 * Build a plain-text handoff note.
 */
export function buildHandoffNoteText(caseId: string, shareSafe: boolean): string {
    if (typeof window === "undefined") {
        return "Handoff note unavailable (server-side rendering).";
    }

    const lines: string[] = [];

    // ─────────────────────────────────────────────────
    // A) Header
    // ─────────────────────────────────────────────────
    lines.push("══════════════════════════════════════════════════════════════");
    lines.push("RESOLVE ENGINE — CASE HANDOFF NOTE");
    lines.push("══════════════════════════════════════════════════════════════");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push("");

    // ─────────────────────────────────────────────────
    // B) Identifiers
    // ─────────────────────────────────────────────────
    const issuer = localStorage.getItem(`re_case_${caseId}_issuer`) || "Not set";
    const reference = localStorage.getItem(`re_case_${caseId}_reference`) || "";
    const displayRef = shareSafe && reference ? redactRef(reference) : (reference || "Not set");

    lines.push("IDENTIFIERS");
    lines.push("────────────────────────────────────────");
    lines.push(`Case ID:    ${caseId}`);
    lines.push(`Issuer:     ${issuer}`);
    lines.push(`Reference:  ${displayRef}`);
    lines.push("");

    // ─────────────────────────────────────────────────
    // C) Current State
    // ─────────────────────────────────────────────────
    const intakeSubmitted = localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1";
    const tier = localStorage.getItem(`re_case_tier_${caseId}`) || "Not selected";
    const disputeType = readDisputeType(caseId) || "Not set";

    // Derive status
    let derivedStatus = "INTAKE_IN_PROGRESS";
    const events = readCaseEvents(caseId);
    if (intakeSubmitted) {
        const hasAppeal = events.some(e => e.type === "APPEAL_SUBMITTED" || e.type === "APPEAL_SUBMITTED_LEGACY");
        const hasResponse = events.some(e => e.type === "RESPONSE_RECEIVED");
        if (hasResponse) derivedStatus = "RESPONSE_RECEIVED";
        else if (hasAppeal) derivedStatus = "SUBMITTED_AWAITING_RESPONSE";
        else derivedStatus = "READY_TO_SUBMIT";
    }

    // Procedural route
    const capabilities = getTierCapabilities(tier);
    const route = getProceduralRoute(caseId, capabilities);

    lines.push("CURRENT STATE");
    lines.push("────────────────────────────────────────");
    lines.push(`Status:           ${derivedStatus.replace(/_/g, " ").toLowerCase()}`);
    lines.push(`Dispute Type:     ${disputeType.replace(/_/g, " ").toLowerCase()}`);
    lines.push(`Tier:             ${tier.replace(/_/g, " ").toLowerCase()}`);
    lines.push(`Procedural Route: ${route.title.replace("Route: ", "")}`);
    lines.push("");

    // ─────────────────────────────────────────────────
    // D) Evidence (Missing Required)
    // ─────────────────────────────────────────────────
    const checklist = buildEvidenceChecklist(caseId);
    const missingRequired = checklist.items.filter(i => i.status === "MISSING");

    lines.push("EVIDENCE (MISSING REQUIRED)");
    lines.push("────────────────────────────────────────");
    if (missingRequired.length === 0) {
        lines.push("• None recorded");
    } else {
        missingRequired.forEach(item => {
            lines.push(`• ${item.label}`);
        });
    }
    lines.push("");

    // ─────────────────────────────────────────────────
    // E) Latest Submission
    // ─────────────────────────────────────────────────
    const submissions = events
        .filter(e => e.type === "APPEAL_SUBMITTED" || e.type === "APPEAL_SUBMITTED_LEGACY")
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    lines.push("LATEST SUBMISSION");
    lines.push("────────────────────────────────────────");
    if (submissions.length === 0) {
        lines.push("No submission recorded");
    } else {
        const latest = submissions[0];
        const method = (latest.meta?.method as string) || "Unknown method";
        const date = latest.at.split("T")[0];
        const proofDoc = (latest.meta?.proof_doc_name as string) || "";
        lines.push(`Method: ${method}`);
        lines.push(`Date:   ${date}`);
        if (proofDoc) lines.push(`Proof:  ${proofDoc}`);
    }
    lines.push("");

    // ─────────────────────────────────────────────────
    // F) Latest Response
    // ─────────────────────────────────────────────────
    const responses = events
        .filter(e => e.type === "RESPONSE_RECEIVED" || e.type === "APPEAL_REJECTED_PRE_COURT")
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    lines.push("LATEST RESPONSE");
    lines.push("────────────────────────────────────────");
    if (responses.length === 0) {
        lines.push("No response recorded");
    } else {
        const latest = responses[0];
        const respType = (latest.meta?.response_type as string) || latest.type.replace(/_/g, " ");
        const date = latest.at.split("T")[0];
        const linkedDoc = (latest.meta?.linked_doc_name as string) || "";
        lines.push(`Type:   ${respType}`);
        lines.push(`Date:   ${date}`);
        if (linkedDoc) lines.push(`Doc:    ${linkedDoc}`);
    }
    lines.push("");

    // ─────────────────────────────────────────────────
    // G) Next Action
    // ─────────────────────────────────────────────────
    const nextAction = getNextAction(caseId);

    lines.push("NEXT ACTION");
    lines.push("────────────────────────────────────────");
    if (nextAction && nextAction.title) {
        lines.push(`Title: ${nextAction.title}`);
        lines.push(`Route: ${nextAction.href}`);
    } else {
        lines.push("No next action computed");
    }
    lines.push("");

    // ─────────────────────────────────────────────────
    // H) Footer
    // ─────────────────────────────────────────────────
    lines.push("────────────────────────────────────────");
    lines.push("Record everything in writing. Keep copies of correspondence and evidence.");
    lines.push("══════════════════════════════════════════════════════════════");

    return lines.join("\n");
}

/**
 * Get capabilities for a tier (mirror of nextAction logic).
 */
function getTierCapabilities(tier: string): string[] {
    const TIER_CAPABILITIES: Record<string, string[]> = {
        NONE: [],
        APPEAL_BUILDER: ["VIEW_ASSESSMENT", "GENERATE_APPEAL", "SHOW_SUBMISSION_INSTRUCTIONS"],
        MANAGED: ["VIEW_ASSESSMENT", "GENERATE_APPEAL", "SUBMIT_ON_BEHALF", "TRACK_RESPONSES", "HANDLE_REJECTIONS_PRE_COURT"],
        ANNUAL_ACCESS: ["VIEW_ASSESSMENT", "GENERATE_APPEAL", "SUBMIT_ON_BEHALF", "TRACK_RESPONSES", "HANDLE_REJECTIONS_PRE_COURT", "ANNUAL_UNLIMITED"],
        PREMIUM: ["VIEW_ASSESSMENT", "GENERATE_APPEAL", "SUBMIT_ON_BEHALF", "TRACK_RESPONSES", "HANDLE_REJECTIONS_PRE_COURT", "HANDLE_COURT_BAILIFFS_CCJ", "PRIORITY_HUMAN_REVIEW"],
    };
    return TIER_CAPABILITIES[tier.toUpperCase()] || [];
}
