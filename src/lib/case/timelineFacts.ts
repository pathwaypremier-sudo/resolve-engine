/**
 * Timeline Facts - issuer/statutory timeframes for reference only.
 * Display-only, no demands or advice generated from these.
 */

export type TimelineFactKey = "DISCOUNT_PERIOD" | "APPEAL_WINDOW" | "PAYMENT_DUE" | "OTHER";
export type TimelineFactAppliesFrom = "NOTICE_DATE" | "SERVICE_DATE" | "UNKNOWN";
export type TimelineFactSource = "USER_ENTERED" | "NOTICE_TEXT_EXTRACT" | "STATUTE_REFERENCE";

export type TimelineFact = {
    key: TimelineFactKey;
    label: string;
    days: number | null;
    applies_from: TimelineFactAppliesFrom;
    source: TimelineFactSource;
    notes: string | null;
};

export type TimelineFacts = {
    version: string;
    facts: TimelineFact[];
    updated_at_iso: string;
};

const DEFAULT_FACTS: TimelineFacts = {
    version: "1.0",
    facts: [],
    updated_at_iso: new Date().toISOString(),
};

/**
 * Read timeline facts from localStorage.
 * Returns default structure if missing or malformed.
 */
export function readTimelineFacts(caseId: string): TimelineFacts {
    try {
        const json = localStorage.getItem(`re_case_${caseId}_timeline_facts`);
        if (!json) return { ...DEFAULT_FACTS, updated_at_iso: new Date().toISOString() };
        const parsed = JSON.parse(json);
        if (!parsed.version || !Array.isArray(parsed.facts)) {
            console.warn(`[timelineFacts] Invalid structure for case ${caseId}`);
            return { ...DEFAULT_FACTS, updated_at_iso: new Date().toISOString() };
        }
        return parsed as TimelineFacts;
    } catch (e) {
        console.warn(`[timelineFacts] Failed to parse for case ${caseId}`, e);
        return { ...DEFAULT_FACTS, updated_at_iso: new Date().toISOString() };
    }
}

/**
 * Write timeline facts to localStorage.
 */
export function writeTimelineFacts(caseId: string, data: TimelineFacts): void {
    const updated = {
        ...data,
        updated_at_iso: new Date().toISOString(),
    };
    localStorage.setItem(`re_case_${caseId}_timeline_facts`, JSON.stringify(updated));
}

/**
 * Add a fact to the list.
 */
export function addTimelineFact(caseId: string, fact: TimelineFact): void {
    const current = readTimelineFacts(caseId);
    current.facts.push(fact);
    writeTimelineFacts(caseId, current);
}

/**
 * Update a fact at a specific index.
 */
export function updateTimelineFact(caseId: string, index: number, fact: TimelineFact): void {
    const current = readTimelineFacts(caseId);
    if (index >= 0 && index < current.facts.length) {
        current.facts[index] = fact;
        writeTimelineFacts(caseId, current);
    }
}

/**
 * Remove a fact at a specific index.
 */
export function removeTimelineFact(caseId: string, index: number): void {
    const current = readTimelineFacts(caseId);
    if (index >= 0 && index < current.facts.length) {
        current.facts.splice(index, 1);
        writeTimelineFacts(caseId, current);
    }
}

/**
 * Get human-readable label for fact key.
 */
export function getFactKeyLabel(key: TimelineFactKey): string {
    switch (key) {
        case "DISCOUNT_PERIOD":
            return "Discounted payment period";
        case "APPEAL_WINDOW":
            return "Appeal window";
        case "PAYMENT_DUE":
            return "Payment due";
        case "OTHER":
            return "Other";
        default:
            return key;
    }
}

/**
 * Get human-readable label for applies_from.
 */
export function getAppliesFromLabel(from: TimelineFactAppliesFrom): string {
    switch (from) {
        case "NOTICE_DATE":
            return "Notice date";
        case "SERVICE_DATE":
            return "Service date";
        case "UNKNOWN":
            return "Unknown";
        default:
            return from;
    }
}

/**
 * Get human-readable label for source.
 */
export function getSourceLabel(source: TimelineFactSource): string {
    switch (source) {
        case "USER_ENTERED":
            return "User entered";
        case "NOTICE_TEXT_EXTRACT":
            return "Notice extracted";
        case "STATUTE_REFERENCE":
            return "Statute reference";
        default:
            return source;
    }
}
