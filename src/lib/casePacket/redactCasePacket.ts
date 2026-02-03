import { type CasePacket } from "./buildCasePacket";
import { redactReference, redactCaseEmail } from "../redaction/redact";

export function redactCasePacket(packet: CasePacket): CasePacket {
    // Deep clone to avoid mutating the original
    const clone = JSON.parse(JSON.stringify(packet)) as CasePacket;

    // 1. Redact Issuer Reference
    if (clone.intake?.reference) {
        clone.intake.reference = redactReference(clone.intake.reference);
    }

    // 2. Redact Case Email (if present in intake or root)
    // Note: checks both likely locations even if not currently in strict type
    if ((clone.intake as any)?.case_email) {
        (clone.intake as any).case_email = redactCaseEmail((clone.intake as any).case_email);
    }
    if ((clone as any)?.case_email) {
        (clone as any).case_email = redactCaseEmail((clone as any).case_email);
    }

    // 3. Redact Contact Method Value (PATCH10 v2.0)
    if (clone.contact_method?.value) {
        // Simple full redaction as per requirement
        clone.contact_method.value = "REDACTED";
    }

    return clone;
}
