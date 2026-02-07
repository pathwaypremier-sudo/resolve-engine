/**
 * Regex patterns for document field extraction.
 * Deterministic, UK-centric.
 */

// UK VRN: Simple robust match.
// e.g. AB12 CDE, AB12CDE, A1 BCD
// We permit optional spaces.
export const VRN_REGEX = /\b([A-Z]{2}[0-9]{2}\s?[A-Z]{3}|[A-Z][0-9]{1,3}[A-Z]{3}|[A-Z]{3}[0-9]{1,3}[A-Z])\b/g;

// Dates: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
// Also capturing full months: 12 January 2024
export const DATE_REGEX = /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi;

// Money: £ followed by digits
export const MONEY_REGEX = /£\s?(\d+(\.\d{2})?)/g;

// Reference labels (case insensitive)
export const PCN_LABELS = [
    "Penalty Charge Notice",
    "PCN",
    "Notice No",
    "Notice Number",
    "Charge Notice",
    "Parking Charge Notice",
    "Ref",
    "Reference",
];

// Issuer keywords
export const ISSUER_KEYWORDS = [
    "Council",
    "Borough",
    "City",
    "Corporation",
    "Parking Services",
    "Enforcement",
    "Operator",
    "Limited",
    "Ltd"
];

// Notice Type specific strings (exact match or strong contains)
export const NOTICE_TYPE_MATCHES = [
    "Penalty Charge Notice",
    "Parking Charge Notice",
    "Notice to Owner",
    "Notice to Keeper",
    "Excess Charge Notice",
    "Fixed Penalty Notice",
];

// Location labels
export const LOCATION_LABELS = [
    "Location",
    "Street",
    "Place",
    "Car Park",
    "Site",
    "Where",
];

// Contravention Code
export const CONTRAVENTION_CODE_REGEX = /\b(Code|Contravention)\s*[:\.]?\s*(\d{2}[A-Z]?)\b/i;

// Discount Amount
export const DISCOUNT_REGEX = /(?:reduced to|discounted to|accept)\s*(£\s?\d+(\.\d{2})?)/i;

// Time patterns: 14:35, 14.35, 9:05
// Matches 00:00-23:59 in HH:MM or HH.MM or H:MM format
export const TIME_REGEX = /\b([01]?[0-9]|2[0-3])[:\.h]([0-5][0-9])\b/gi;

// Strict 4-digit time (only use with label context): 0935, 1435
export const TIME_STRICT_REGEX = /\b([01][0-9]|2[0-3])([0-5][0-9])\b/g;

// Time labels (keywords that precede or follow time values)
export const TIME_LABELS = [
    "time of issue",
    "time issued",
    "time of contravention",
    "contravention time",
    "observed at",
    "issued at",
    "time:",
    "at time",
];

// Context helpers
export function normalizeVRN(vrn: string): string {
    return vrn.replace(/\s+/g, "").toUpperCase();
}

export function isValidVRN(vrn: string): boolean {
    // Basic UK length check after normalization
    const n = normalizeVRN(vrn);
    return n.length >= 2 && n.length <= 7;
}

export function normalizeDate(dateStr: string): string | null {
    // Stub: meaningful normalization needs explicit library or detailed parsing
    // For V1 we just return the cleaned string
    return dateStr.trim();
}

/**
 * Normalize time to HH:MM 24-hour format.
 * Input examples: "14:35", "14.35", "1435", "9:05", "09.05"
 * Output: "14:35", "14:35", "14:35", "09:05", "09:05"
 */
export function normalizeTime(timeStr: string): string | null {
    if (!timeStr) return null;

    const cleaned = timeStr.trim();

    // Match HH:MM, HH.MM, H:MM, H.MM
    const colonOrDot = cleaned.match(/^(\d{1,2})[:\.h](\d{2})$/);
    if (colonOrDot) {
        const hours = colonOrDot[1].padStart(2, '0');
        const mins = colonOrDot[2];
        return `${hours}:${mins}`;
    }

    // Match 4-digit HHMM format
    const fourDigit = cleaned.match(/^(\d{2})(\d{2})$/);
    if (fourDigit) {
        const hours = fourDigit[1];
        const mins = fourDigit[2];
        if (parseInt(hours) <= 23 && parseInt(mins) <= 59) {
            return `${hours}:${mins}`;
        }
    }

    return null;
}

