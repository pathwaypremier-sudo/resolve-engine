export type CaseEventType =
    | "INTAKE_SUBMITTED"
    | "TIER_SELECTED"
    | "DELIVERABLE_GENERATED"
    | "APPEAL_SUBMITTED"
    | "RESPONSE_RECEIVED"
    | "APPEAL_REJECTED_PRE_COURT"
    | "CASE_EMAIL_ASSIGNED";

export type CaseEvent = {
    type: CaseEventType;
    at: string;
    meta?: Record<string, unknown>;
};

export function getCaseEvents(caseId: string): CaseEvent[] {
    const raw = localStorage.getItem(`re_case_${caseId}_events`);
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch {
        return [];
    }
}

export function addCaseEvent(caseId: string, event: CaseEvent): void {
    const events = getCaseEvents(caseId);
    events.push(event);
    localStorage.setItem(`re_case_${caseId}_events`, JSON.stringify(events));
}
