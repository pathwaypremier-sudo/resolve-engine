/**
 * Document Usage Helpers
 * Derives usages of a document from the case event log.
 */

import { readCaseEvents, formatEventLabel, formatEventMeta, formatEventTime } from "./events";

export type DocUsageItem = {
    event_type: string;
    at: string;
    label: string;
    summary: string | null;
};

/**
 * Get events that link to the specified document.
 */
export function getDocUsage(caseId: string, docId: string): DocUsageItem[] {
    const events = readCaseEvents(caseId);

    // Filter events where meta.linked_doc_id matches docId
    const matching = events.filter((e) => {
        const linkedId = e.meta?.linked_doc_id;
        return linkedId === docId;
    });

    // Sort newest first
    matching.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return matching.map((e) => ({
        event_type: e.type,
        at: e.at,
        label: formatEventLabel(e),
        summary: formatEventMeta(e),
    }));
}
