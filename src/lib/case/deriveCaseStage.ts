import { getCaseEvents } from "../../app/app/case/_context/CaseEvents";

export type CaseStage = {
    label: string;
    tone: "neutral" | "complete";
};

export function deriveCaseStage(caseId: string): CaseStage {
    if (typeof window === "undefined") return { label: "Loading...", tone: "neutral" };

    // 1. Intake Status
    const intakeSubmitted = localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1";
    if (!intakeSubmitted) {
        return { label: "Intake in progress", tone: "neutral" };
    }

    const events = getCaseEvents(caseId);

    // 2. Response Status
    const hasResponse = events.some(e => e.type === "RESPONSE_RECEIVED");
    if (hasResponse) {
        return { label: "Responses recorded", tone: "complete" };
    }

    // 3. Deliverable Status
    // "DELIVERABLE_GENERATED" or just checking entitlement? 
    // User requirement: "Else if deliverables generated but no response events: Deliverables available"
    const hasDeliverable = events.some(e => e.type === "DELIVERABLE_GENERATED");
    if (hasDeliverable) {
        return { label: "Deliverables available", tone: "complete" };
    }

    // 4. Assessment Status
    // "Else if no assessment-derived events yet: Ready for assessment"
    // "Assessment in progress" -> implied if some assessment events exist but not deliverables?
    // Assessment events might be implicit (like entitlement purchase?)
    // Let's assume:
    // - TIER_SELECTED -> Assessment/Checkout done.
    // - If just intake submitted -> Ready for assessment.

    // Improving granularity based on known events:
    // If we have TIER_SELECTED, we are likely working on deliverables or just finished assessment.
    const tierSelected = events.some(e => e.type === "TIER_SELECTED");

    if (tierSelected) {
        // Tier selected but no deliverable generated yet
        return { label: "Assessment complete", tone: "complete" };
    }

    return { label: "Ready for assessment", tone: "neutral" };
}
