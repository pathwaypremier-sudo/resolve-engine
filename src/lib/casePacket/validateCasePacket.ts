import { type CasePacket } from "./buildCasePacket";

export type PacketValidationResult =
    | { valid: true; packet: CasePacket; warning?: string }
    | { valid: false; error: string };

export function validateCasePacket(jsonString: string, currentCaseId?: string): PacketValidationResult {
    try {
        const data = JSON.parse(jsonString);

        // 1. Basic Schema Check
        if (typeof data !== "object" || data === null) {
            return { valid: false, error: "Invalid JSON object" };
        }

        // 2. Required Root Fields
        if (typeof data.packet_version !== "string") {
            return { valid: false, error: "Missing or invalid 'packet_version'" };
        }
        if (!data.case || typeof data.case.id !== "string") {
            return { valid: false, error: "Missing or invalid 'case.id'" };
        }
        if (!data.events || typeof data.events.count !== "number" || !Array.isArray(data.events.items)) {
            return { valid: false, error: "Missing or invalid 'events' structure" };
        }
        if (!data.docs || typeof data.docs.count !== "number" || !Array.isArray(data.docs.items)) {
            return { valid: false, error: "Missing or invalid 'docs' structure" };
        }

        // 3. Case ID Warning
        let warning: string | undefined;
        if (currentCaseId && data.case.id !== currentCaseId) {
            warning = `Packet Case ID (${data.case.id}) does not match current case (${currentCaseId})`;
        }

        return { valid: true, packet: data as CasePacket, warning };

    } catch (e) {
        return { valid: false, error: "File is not valid JSON" };
    }
}
