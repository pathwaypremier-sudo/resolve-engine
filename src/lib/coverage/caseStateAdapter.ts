/**
 * Case State Adapter
 * Normalizes persistent data into a canonical format for the Coverage Engine.
 */

import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { CaseType, ContraventionType } from "./questionBank";

export interface CaseState {
    disputeType: CaseType | "NOT_SURE" | null;
    contraventionType: ContraventionType | null;
    stage: {
        council: string | null;
        private: string | null;
    };
    vehicle: {
        reg: string | null;
    };
    date: {
        event: string | null; // ISO
        issue: string | null; // ISO
        timeOfIssue: string | null; // e.g. "14:35"
    };
    location: string | null;
    reference: string | null;
    pcnNumber: string | null;
    evidence: {
        hasNotice: boolean;
        hasVideo: boolean;
        hasSignage: boolean;
    };
    grounds: {
        selected: string | null;
        details: {
            mitigation: string | null;
            technical: string | null;
        };
    };
    rawAnswers: Record<string, string>;
}

/**
 * Load case state from persistence.
 * This runs on the server (or client if persistence adapter supports it).
 */
export async function loadCaseState(caseId: string): Promise<CaseState> {
    // 1. Fetch Raw Data
    // We try multiple keys to gather all fragments of state
    const answersKey = `re_case_${caseId}_intake_data`; // Often JSON
    const legacyPrefix = `re_case_${caseId}_`;

    let rawAnswers: Record<string, string> = {};

    // Try JSON blob first
    const jsonBlob = persistence.get(answersKey);
    if (jsonBlob) {
        try {
            const parsed = JSON.parse(jsonBlob);
            rawAnswers = { ...parsed };
        } catch { }
    }

    // Overlay individual keys (legacy pattern)
    // We can't iterate keys easily with this adapter, but we can check known keys
    const knownKeys = [
        "dispute_type", "issuer", "reference", "notice_date", "event_date",
        "summary", "location", "vehicle_reg", "contravention_type",
        "pcn_number", "time_of_issue"
    ];

    for (const key of knownKeys) {
        const val = persistence.get(`${legacyPrefix}${key}`);
        if (val) rawAnswers[key] = val;
    }

    // 2. Normalization Logic

    // Dispute Type
    let disputeType: CaseState["disputeType"] = null;
    if (rawAnswers.dispute_type === "COUNCIL_PCN") disputeType = "COUNCIL_PCN";
    else if (rawAnswers.dispute_type === "PRIVATE_PARKING") disputeType = "PRIVATE_PARKING";
    else if (rawAnswers.issuer?.toLowerCase().includes("council")) disputeType = "COUNCIL_PCN";
    else if (rawAnswers.issuer) disputeType = "PRIVATE_PARKING"; // Default to private if unknown issuer name

    // Contravention Type
    let contraventionType: ContraventionType | null = null;
    if (rawAnswers.contravention_type) {
        contraventionType = rawAnswers.contravention_type as ContraventionType;
    } else if (rawAnswers.summary?.toLowerCase().includes("bus lane")) {
        contraventionType = "BUS_LANE";
    } else if (rawAnswers.summary?.toLowerCase().includes("box junction")) {
        contraventionType = "MOVING_TRAFFIC";
    } else if (disputeType === "COUNCIL_PCN") {
        contraventionType = "PARKING"; // Default assumption
    }

    // Dates
    const normalizeDate = (d: string | undefined) => {
        if (!d) return null;
        // Basic check if it's already ISO or near ISO
        return d;
    };

    return {
        disputeType,
        contraventionType,
        stage: {
            council: rawAnswers.council_stage || null,
            private: rawAnswers.private_stage || null,
        },
        vehicle: {
            reg: rawAnswers.vehicle_reg || null,
        },
        date: {
            event: normalizeDate(rawAnswers.event_date),
            issue: normalizeDate(rawAnswers.notice_date),
            timeOfIssue: rawAnswers.time_of_issue || null,
        },
        location: rawAnswers.location || null,
        reference: rawAnswers.reference || null,
        pcnNumber: rawAnswers.pcn_number || null,
        evidence: {
            hasNotice: rawAnswers.has_notice_copy === "YES" || rawAnswers.copies_kept === "YES" || !!persistence.get(`re_case_${caseId}_docs`),
            hasVideo: rawAnswers.has_video === "YES",
            hasSignage: rawAnswers.has_signage_photos === "YES",
        },
        grounds: {
            selected: rawAnswers.grounds_selected || null,
            details: {
                mitigation: rawAnswers.grounds_mitigation || null,
                technical: rawAnswers.grounds_technical || null,
            }
        },
        rawAnswers
    };
}
