/**
 * Next Action Engine - deterministic procedural router.
 * Single source of "what should the user do next" based on case state.
 */

import { readCaseEvents } from "./events";

export type NextAction = {
    key: string;
    title: string;
    description: string;
    href: string;
    kind: "primary" | "secondary";
    requires?: string[];
    blocked?: boolean;
    blocked_reason?: string;
};

// Tier to capabilities mapping (must match EntitlementContext)
const TIER_CAPABILITIES: Record<string, string[]> = {
    NONE: [],
    APPEAL_BUILDER: ["VIEW_ASSESSMENT", "GENERATE_APPEAL", "SHOW_SUBMISSION_INSTRUCTIONS"],
    MANAGED: [
        "VIEW_ASSESSMENT",
        "GENERATE_APPEAL",
        "SUBMIT_ON_BEHALF",
        "TRACK_RESPONSES",
        "HANDLE_REJECTIONS_PRE_COURT",
    ],
    ANNUAL_ACCESS: [
        "VIEW_ASSESSMENT",
        "GENERATE_APPEAL",
        "SUBMIT_ON_BEHALF",
        "TRACK_RESPONSES",
        "HANDLE_REJECTIONS_PRE_COURT",
        "ANNUAL_UNLIMITED",
    ],
    PREMIUM: [
        "VIEW_ASSESSMENT",
        "GENERATE_APPEAL",
        "SUBMIT_ON_BEHALF",
        "TRACK_RESPONSES",
        "HANDLE_REJECTIONS_PRE_COURT",
        "HANDLE_COURT_BAILIFFS_CCJ",
        "PRIORITY_HUMAN_REVIEW",
    ],
};

function getTierFromStorage(caseId: string): string {
    const tierKey = localStorage.getItem(`re_case_tier_${caseId}`);
    if (!tierKey) return "NONE";
    // Normalize tier key to our enum
    const normalized = tierKey.toUpperCase().replace(/_/g, "_");
    if (normalized === "APPEAL_BUILDER") return "APPEAL_BUILDER";
    if (normalized === "MANAGED") return "MANAGED";
    if (normalized === "ANNUAL_ACCESS") return "ANNUAL_ACCESS";
    if (normalized === "PREMIUM") return "PREMIUM";
    return "NONE";
}

function getCapabilities(tier: string): string[] {
    return TIER_CAPABILITIES[tier] || [];
}

function hasCapability(capabilities: string[], cap: string): boolean {
    return capabilities.includes(cap);
}

function hasEvent(caseId: string, type: string): boolean {
    const events = readCaseEvents(caseId);
    return events.some((e) => e.type === type);
}

/**
 * Deterministic next action engine.
 * Same inputs always produce same output.
 */
export function getNextAction(caseId: string): NextAction {
    // Read state
    const intakeSubmitted = localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1";
    const tier = getTierFromStorage(caseId);
    const capabilities = getCapabilities(tier);
    const hasFinalLetter = !!localStorage.getItem(`re_case_${caseId}_final_letter`);

    // A) Intake not submitted
    if (!intakeSubmitted) {
        const hasDisputeType = !!localStorage.getItem(`re_case_${caseId}_dispute_type`);
        const hasIssuer = !!localStorage.getItem(`re_case_${caseId}_issuer`);
        const docsJson = localStorage.getItem(`re_case_${caseId}_docs`);
        const hasDocs = docsJson && JSON.parse(docsJson)?.length > 0;

        if (!hasDisputeType || !hasIssuer) {
            return {
                key: "intake_details",
                title: "Complete intake",
                description: "Add case details to proceed.",
                href: `/app/case/${caseId}/intake/details`,
                kind: "primary",
            };
        }

        if (!hasDocs) {
            return {
                key: "intake_docs",
                title: "Add documents",
                description: "Upload the notice and supporting evidence.",
                href: `/app/case/${caseId}/intake/docs`,
                kind: "primary",
            };
        }

        return {
            key: "intake_review",
            title: "Review and submit",
            description: "Confirm your case details before proceeding.",
            href: `/app/case/${caseId}/intake/review`,
            kind: "primary",
        };
    }

    // B) Intake submitted, no tier selected
    if (tier === "NONE") {
        return {
            key: "choose_tier",
            title: "Choose service tier",
            description: "Select how you want this case handled.",
            href: `/app/case/${caseId}/checkout`,
            kind: "primary",
        };
    }

    // C) Tier selected - determine next action based on capabilities and events

    // Check for APPEAL_BUILDER flow
    if (hasCapability(capabilities, "GENERATE_APPEAL") && !hasFinalLetter) {
        return {
            key: "generate_letter",
            title: "Generate appeal letter",
            description: "Create your appeal letter based on case details.",
            href: `/app/case/${caseId}/deliver`,
            kind: "primary",
            requires: ["GENERATE_APPEAL"],
        };
    }

    // Managed/Annual flow: submit, track, handle rejections
    if (hasCapability(capabilities, "SUBMIT_ON_BEHALF")) {
        const appealSubmitted = hasEvent(caseId, "APPEAL_SUBMITTED");
        const responseReceived = hasEvent(caseId, "RESPONSE_RECEIVED");
        const rejectedPreCourt = hasEvent(caseId, "APPEAL_REJECTED_PRE_COURT");

        if (!appealSubmitted) {
            return {
                key: "submit_appeal",
                title: "Submit appeal",
                description: "We will submit the appeal on your behalf.",
                href: `/app/case/${caseId}/deliver`,
                kind: "primary",
                requires: ["SUBMIT_ON_BEHALF"],
            };
        }

        if (!responseReceived) {
            return {
                key: "awaiting_response",
                title: "Awaiting response",
                description: "Appeal submitted. Waiting for issuer response.",
                href: `/app/case/${caseId}/deliver`,
                kind: "secondary",
            };
        }

        if (rejectedPreCourt) {
            // Check if Premium is needed for court escalation
            if (!hasCapability(capabilities, "HANDLE_COURT_BAILIFFS_CCJ")) {
                return {
                    key: "premium_boundary",
                    title: "Premium boundary",
                    description: "Court and enforcement handling requires Premium.",
                    href: `/app/case/${caseId}/checkout`,
                    kind: "secondary",
                    blocked: true,
                    blocked_reason: "Further escalation requires Premium tier.",
                };
            }
            return {
                key: "court_handling",
                title: "Court handling",
                description: "Premium escalation active.",
                href: `/app/case/${caseId}/deliver`,
                kind: "primary",
                requires: ["HANDLE_COURT_BAILIFFS_CCJ"],
            };
        }

        // Response received but not rejected
        return {
            key: "case_resolved",
            title: "Case status",
            description: "Response received. Review current status.",
            href: `/app/case/${caseId}/deliver`,
            kind: "secondary",
        };
    }

    // Premium flow
    if (hasCapability(capabilities, "HANDLE_COURT_BAILIFFS_CCJ")) {
        return {
            key: "premium_handling",
            title: "Premium handling",
            description: "Human-reviewed strategic handling active.",
            href: `/app/case/${caseId}/deliver`,
            kind: "primary",
            requires: ["HANDLE_COURT_BAILIFFS_CCJ"],
        };
    }

    // Appeal Builder with letter generated
    if (hasFinalLetter) {
        return {
            key: "view_deliverables",
            title: "View deliverables",
            description: "Your appeal letter is ready.",
            href: `/app/case/${caseId}/deliver`,
            kind: "secondary",
        };
    }

    // Fallback
    return {
        key: "review_status",
        title: "Review case status",
        description: "Check case status and next steps.",
        href: `/app/case/${caseId}/assessment`,
        kind: "secondary",
    };
}
