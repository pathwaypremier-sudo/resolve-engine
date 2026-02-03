import { readCaseEvents } from "./events";

/**
 * Check if a rejection has been recorded for the case.
 * Returns true if:
 * - APPEAL_REJECTED_PRE_COURT event exists
 * - RESPONSE_RECEIVED event exists with response_type="REJECTION"
 * - RESPONSE_RECEIVED event exists with legacy meta.outcome containing "reject"
 */
export function isRejectionRecorded(caseId: string): boolean {
    const events = readCaseEvents(caseId);

    const hasExplicitRejection = events.some((e) => e.type === "APPEAL_REJECTED_PRE_COURT");
    if (hasExplicitRejection) return true;

    const responseEvents = events.filter((e) => e.type === "RESPONSE_RECEIVED");

    return responseEvents.some((e) => {
        // Structured meta
        if (e.meta?.response_type === "REJECTION") return true;

        // Legacy/Fallback meta check
        if (typeof e.meta?.outcome === "string") {
            const outcome = e.meta.outcome.toLowerCase();
            if (outcome.includes("reject") || outcome.includes("declined")) {
                return true;
            }
        }

        return false;
    });
}
