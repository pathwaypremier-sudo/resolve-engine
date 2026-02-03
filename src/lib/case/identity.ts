/**
 * Case Identity Helper
 * 
 * Centralizes duplicate logic for extracting and formatting
 * case identity fields (ID, Issuer, Reference, Dispute Type)
 * from a CasePacket.
 */

import { type CasePacket } from "@/lib/casePacket/buildCasePacket";
import { getDisputeTypeLabel } from "./disputeType";

export interface CaseIdentity {
    id: string;
    issuer: string;
    reference: string;
    issuerRaw: string | null;
    referenceRaw: string | null;
    disputeTypeRaw: string;
    disputeTypeLabel: string;
}

/**
 * Derive identity fields from a case packet.
 * Provides consistent fallback defaults ("Not provided", "Unknown", etc.)
 * matching the established behavior of Summary/Manifest.
 */
export function deriveCaseIdentityFromPacket(packet: CasePacket): CaseIdentity {
    const disputeTypeRaw = packet.case.dispute_type || "Provisional / Not sure";

    // Format label matching Summary/Manifest legacy logic
    const disputeTypeLabel = getDisputeTypeLabel(packet.case.dispute_type);

    return {
        id: packet.case.id || "Unknown",
        issuer: packet.intake.issuer || "Not provided",
        reference: packet.intake.reference || "Not provided",
        issuerRaw: packet.intake.issuer || null,
        referenceRaw: packet.intake.reference || null,
        disputeTypeRaw: disputeTypeRaw,
        disputeTypeLabel: disputeTypeLabel
    };
}
