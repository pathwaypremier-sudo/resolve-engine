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
