/**
 * Shared redaction logic for PII masking.
 * Ensures consistent rules across Case Packet, Timeline Export, and Summary Export.
 */

/**
 * Mask a case reference number.
 * Rule: Show last 4 chars if length > 4, otherwise mask all.
 * Example: "PCN-12345678" -> "****5678"
 * Example: "123" -> "****"
 */
export function redactReference(ref: string): string {
    if (!ref) return "";
    if (ref.length <= 4) return "****";
    return "****" + ref.slice(-4);
}

/**
 * Mask an email address.
 * Rule: Mask local part, keep domain.
 * Special handling for 'resolve-engine' emails: keep 'case-' prefix if present?
 * Current rule: Mask local part completely or consistently.
 * 
 * Previous implementation had:
 * - if `case-uuid@...` -> `case-********@...`
 * - else `****@...`
 */
export function redactCaseEmail(email: string): string {
    if (!email) return "";
    const parts = email.split("@");
    if (parts.length !== 2) return email; // Fallback for invalid

    // Special logic for internal/generated emails if needed, 
    // strictly following the user's "mask local part consistently" request.
    // Preserving the 'case-********' pattern if it was there before seems safer for context.

    if (parts[1].includes("resolve-engine") && parts[0].startsWith("case-")) {
        return "case-********@" + parts[1];
    }

    return "****@" + parts[1];
}

/**
 * Helper to redact a string that might contain a reference.
 * Uses regex replacement.
 */
export function redactStringWithReference(text: string, ref: string): string {
    if (!ref || !text) return text;

    // Only redact if ref is actually present preventing overly aggressive replace if ref is empty/short
    if (ref.length < 2) return text; // Too short to safely grep/replace without false positives?
    // Actually our rule says ref <= 4 masks all "****".
    // But searching for "123" in a text might be dangerous.
    // Let's stick to strict replacement if we are confident it's the Ref.

    const safeRef = redactReference(ref);
    // Escape for regex
    const escapedRef = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(escapedRef, 'g'), safeRef);
}
