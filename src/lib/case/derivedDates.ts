/**
 * Derived Dates - compute end dates from timeline facts + base dates.
 * Read-only, reference only. Never used to generate demands.
 */

import { readTimelineFacts, type TimelineFact } from "./timelineFacts";

export type DerivedDate = {
    key: string;
    label: string;
    days: number;
    applies_from: string;
    base_date_iso: string;
    base_date_label: string;
    ends_on_iso: string;
    source: string;
};

/**
 * Read notice date from localStorage.
 */
export function readNoticeDate(caseId: string): string | null {
    if (typeof window === "undefined") return null;
    const val = localStorage.getItem(`re_case_${caseId}_notice_date`);
    if (!val || val === "NOT_SURE") return null;
    return val;
}

/**
 * Read service date from localStorage (event_date used as service date).
 */
export function readServiceDate(caseId: string): string | null {
    if (typeof window === "undefined") return null;
    const val = localStorage.getItem(`re_case_${caseId}_event_date`);
    if (!val || val === "NOT_SURE") return null;
    return val;
}

/**
 * Add days to a date ISO string and return new ISO date string.
 * UTC-safe, returns yyyy-mm-dd format.
 */
function addDays(isoDate: string, days: number): string {
    try {
        const date = new Date(isoDate);
        date.setUTCDate(date.getUTCDate() + days);
        return date.toISOString().split("T")[0];
    } catch {
        return "";
    }
}

/**
 * Compute derived dates from timeline facts and base dates.
 * Never throws; returns empty array on errors.
 */
export function computeDerivedDates(caseId: string): DerivedDate[] {
    const results: DerivedDate[] = [];

    try {
        const facts = readTimelineFacts(caseId);
        const noticeDate = readNoticeDate(caseId);
        const serviceDate = readServiceDate(caseId);

        for (const fact of facts.facts) {
            // Only compute if days is a number
            if (fact.days === null || typeof fact.days !== "number") {
                continue;
            }

            let baseDate: string | null = null;
            let baseDateLabel: string = "";

            switch (fact.applies_from) {
                case "NOTICE_DATE":
                    if (noticeDate) {
                        baseDate = noticeDate;
                        baseDateLabel = "Notice date";
                    }
                    break;
                case "SERVICE_DATE":
                    if (serviceDate) {
                        baseDate = serviceDate;
                        baseDateLabel = "Service date";
                    }
                    break;
                case "UNKNOWN":
                    // Cannot compute without known base
                    continue;
                default:
                    continue;
            }

            if (!baseDate) {
                continue;
            }

            const endsOn = addDays(baseDate, fact.days);
            if (!endsOn) {
                continue;
            }

            results.push({
                key: fact.key,
                label: fact.label,
                days: fact.days,
                applies_from: fact.applies_from,
                base_date_iso: baseDate,
                base_date_label: baseDateLabel,
                ends_on_iso: endsOn,
                source: fact.source,
            });
        }
    } catch {
        // Return empty on any error
        return [];
    }

    return results;
}

/**
 * Format ISO date for display.
 */
export function formatDateDisplay(isoDate: string): string {
    try {
        const date = new Date(isoDate);
        return date.toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    } catch {
        return isoDate;
    }
}
