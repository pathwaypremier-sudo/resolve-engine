import { CaseEvent } from "./events";
import { redactCaseEmail, redactStringWithReference } from "@/lib/redaction/redact";

/**
 * Redact timeline text using consistent rules.
 * 1. Masks emails.
 * 2. Masks case reference if found in INTAKE_SUBMITTED event.
 */
export function redactTimelineText(text: string, allEvents: CaseEvent[]): string {
    let output = text;

    // 1. Redact emails using regex to find them, then helper to mask
    output = output.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (email) => {
        return redactCaseEmail(email);
    });

    // 2. Redact Reference if known
    const intakeEvent = allEvents.find(e => e.type === "INTAKE_SUBMITTED");
    const ref = intakeEvent?.meta?.reference;
    if (ref && typeof ref === 'string') {
        output = redactStringWithReference(output, ref);
    }

    return output;
}
