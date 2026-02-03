import { readCaseEvents, type CaseEvent } from "./events";

export type RouteState =
    | "INTAKE_IN_PROGRESS"
    | "READY_FOR_ASSESSMENT"
    | "READY_TO_SUBMIT"
    | "SUBMITTED_AWAITING_RESPONSE"
    | "RESPONSE_RECEIVED"
    | "REJECTED_PRE_COURT"
    | "PREMIUM_REQUIRED"
    | "UNKNOWN";

export type ProceduralRouteData = {
    state: RouteState;
    title: string;
    body: string[];
    notes?: string[];
};

/**
 * Determine the procedural route state based on case facts and capabilities.
 */
export function getProceduralRoute(caseId: string, capabilities: string[]): ProceduralRouteData {
    if (typeof window === "undefined") {
        return {
            state: "UNKNOWN",
            title: "Route: Unknown",
            body: ["Review the case record and timeline to confirm the current stage."],
        };
    }

    const intakeSubmitted = localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1";
    const events = readCaseEvents(caseId);

    // 1. INTAKE_IN_PROGRESS
    if (!intakeSubmitted) {
        return {
            state: "INTAKE_IN_PROGRESS",
            title: "Route: Intake in progress",
            body: ["Complete intake so the case can be assessed. Keep documents together in the case file."],
        };
    }

    const appealSubmitted = events.some((e) => e.type === "APPEAL_SUBMITTED" || e.type === "APPEAL_SUBMITTED_LEGACY");
    const responseReceived = events.find((e) => e.type === "RESPONSE_RECEIVED");
    const rejectedPreCourt = events.some((e) => e.type === "APPEAL_REJECTED_PRE_COURT");
    const rejectedInResponse = responseReceived?.meta?.response_type === "REJECTION";

    // 2. READY_TO_SUBMIT (Assessment ready but not submitted)
    if (!appealSubmitted) {
        // Note: Logic implies if intake submitted and no appeal yet, we are here. 
        // Or "READY_FOR_ASSESSMENT"? User specified: "If intake_submitted != '1' -> INTAKE_IN_PROGRESS ... Else if no APPEAL_SUBMITTED -> READY_TO_SUBMIT"
        // User didn't strictly distinguish READY_FOR_ASSESSMENT in derivation rules, but it is in the set.
        // I will stick to user derivation rules: "Else if no APPEAL_SUBMITTED event -> READY_TO_SUBMIT".
        // Maybe "READY_FOR_ASSESSMENT" is synonymous or intermediate? 
        // Actually, user listed READY_FOR_ASSESSMENT in set but not in rules. I'll stick to READY_TO_SUBMIT for this branch.
        return {
            state: "READY_TO_SUBMIT",
            title: "Route: Ready to submit",
            body: ["You have an assessment and a case file. Next step is submitting representations and keeping proof."],
        };
    }

    // 3. SUBMITTED_AWAITING_RESPONSE
    if (appealSubmitted && !responseReceived && !rejectedPreCourt) {
        return {
            state: "SUBMITTED_AWAITING_RESPONSE",
            title: "Route: Awaiting response",
            body: ["Submission recorded. Maintain the timeline and record any written responses."],
        };
    }

    // 4. REJECTED / RESPONSE logic
    const isRejection = rejectedPreCourt || rejectedInResponse;
    const canEscalate = capabilities.includes("HANDLE_COURT_BAILIFFS_CCJ");

    if (isRejection) {
        if (!canEscalate) {
            return {
                state: "PREMIUM_REQUIRED",
                title: "Route: Escalation boundary",
                body: ["This case indicates escalation beyond pre-court handling. Premium is required for court/bailiff/CCJ strategy."],
            };
        }
        return {
            state: "REJECTED_PRE_COURT",
            title: "Route: Rejected (pre-court)",
            body: ["A rejection is recorded pre-court. Next steps depend on issuer route and entitlement."],
        };
    }

    // 5. GENERIC RESPONSE
    if (responseReceived) {
        return {
            state: "RESPONSE_RECEIVED",
            title: "Route: Response received",
            body: ["A response is recorded. Confirm the issuer’s position and keep the written record."],
        };
    }

    return {
        state: "UNKNOWN",
        title: "Route: Unknown",
        body: ["Review the case record and timeline to confirm the current stage."],
    };
}
