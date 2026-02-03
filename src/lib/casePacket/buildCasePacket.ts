/**
 * Case Packet Builder - backend-ready JSON export for a single case.
 * Reads only from localStorage; no backend calls.
 */

import { readTimelineFacts, type TimelineFacts } from "../case/timelineFacts";
import {
    computeDerivedDates,
    readNoticeDate,
    readServiceDate,
    type DerivedDate,
} from "../case/derivedDates";
import { buildEvidenceChecklist, type EvidenceChecklist } from "../case/evidenceChecklist";
import { getEffectiveEvents } from "@/lib/case/events";

import { readDisputeType } from "@/lib/case/disputeType";
import { readContactMethod } from "@/lib/case/contactMethod";
import { validateCaseStorage } from "@/lib/storage/validateCaseStorage";
import type { PaymentsCaseSlice } from "@/lib/integrations/payments/paymentsContract";

// Re-use tier mapping logic from EntitlementContext
type EntitlementTier = "NONE" | "APPEAL_BUILDER" | "MANAGED" | "PREMIUM" | "ANNUAL_ACCESS";
type Capability =
    | "GENERATE_APPEAL"
    | "SHOW_SUBMISSION_INSTRUCTIONS"
    | "SUBMIT_ON_BEHALF"
    | "TRACK_RESPONSES"
    | "HANDLE_REJECTIONS_PRE_COURT"
    | "HANDLE_COURT_BAILIFFS_CCJ";

type CaseEvent = {
    type: string;
    at: string;
    meta?: Record<string, any>;
};

type DocMeta = {
    id?: string;
    name: string;
    type: string;
    size: number;
    category: string;
    text?: string;
    ocrText?: string;
    ocrProvenance?: {
        engine?: string;
        timestamp?: string;
    };
    storage?: {
        uri: string;
        checksumSha256: string;
        sizeBytes: number;
        storedAtIso: string;
    };
};

export type CasePacket = {
    packet_version: string;
    generated_at_iso: string;
    case: {
        id: string;
        derived_status: string;
        dispute_type: string | null;
        dispute_type_if_known: string | null;
    };
    contact_method?: { // PATCH10 v2.0
        method: string;
        value: string | null;
        source: string | null;
        updated_at: string;
    };
    entitlement: {
        tier: EntitlementTier;
        capabilities: Capability[];
    };
    integrity: {
        intake_submitted: boolean;
        checklist_summary: { present: number; missing: number; optional: number }; // v1.3
        storage?: { // PATCH10 v2.1
            warnings: string[];
            stats: { keys_present: number; keys_expected: number };
        };
    };
    intake: {
        issuer: string | null;
        reference: string | null;
        notice_date: string | null;
        event_date: string | null;
        summary: string | null;
        desired_outcome: string | null;
        already_contacted: string | null;
        council_stage: string | null;
        council_appealed: string | null;
        private_notice_type: string | null;
        private_appealed: string | null;
    };
    docs: {
        count: number;
        items: DocMeta[];
    };
    events: {
        count: number;
        items: CaseEvent[];
    };
    outputs: {
        final_letter: string | null;
    };
    timeline_facts: TimelineFacts;
    derived_dates: {
        version: string;
        generated_at_iso: string;
        reference_only: boolean;
        disclaimer: string;
        base_dates: {
            notice_date: string | null;
            service_date: string | null;
            event_date: string | null;
        };
        items: DerivedDate[];
    };
    evidence_checklist: EvidenceChecklist;
    responses_index: {
        version: string;
        count: number;
        items: Array<{
            at: string;
            response_type: string;
            received_date: string | null;
            linked_doc_id: string | null;
            linked_doc_name: string | null;
        }>;
    };
    submissions_index: {
        version: string;
        count: number;
        items: Array<{
            at: string;
            method: string | null;
            submitted_date: string | null;
            linked_doc_id: string | null;
            linked_doc_name: string | null;
        }>;
    };
    payments?: PaymentsCaseSlice;
};

// Mirror of tierToCapabilities from EntitlementContext
function tierToCapabilities(tier: EntitlementTier): Capability[] {
    switch (tier) {
        case "APPEAL_BUILDER":
            return ["GENERATE_APPEAL", "SHOW_SUBMISSION_INSTRUCTIONS"];
        case "MANAGED":
            return [
                "GENERATE_APPEAL",
                "SHOW_SUBMISSION_INSTRUCTIONS",
                "SUBMIT_ON_BEHALF",
                "TRACK_RESPONSES",
                "HANDLE_REJECTIONS_PRE_COURT",
            ];
        case "PREMIUM":
            return [
                "GENERATE_APPEAL",
                "SHOW_SUBMISSION_INSTRUCTIONS",
                "SUBMIT_ON_BEHALF",
                "TRACK_RESPONSES",
                "HANDLE_REJECTIONS_PRE_COURT",
                "HANDLE_COURT_BAILIFFS_CCJ",
            ];
        case "ANNUAL_ACCESS":
            return [
                "GENERATE_APPEAL",
                "SHOW_SUBMISSION_INSTRUCTIONS",
                "SUBMIT_ON_BEHALF",
                "TRACK_RESPONSES",
                "HANDLE_REJECTIONS_PRE_COURT",
            ];
        default:
            return [];
    }
}

// Derive status from events (matches CaseContext logic)
function deriveStatusFromEvents(events: CaseEvent[], tier: EntitlementTier): string {
    const hasEvent = (type: string) => events.some((e) => e.type === type);

    if (!hasEvent("INTAKE_SUBMITTED")) {
        return "INTAKE_IN_PROGRESS";
    }

    const tierEvent = events.find((e) => e.type === "TIER_SELECTED");
    if (!tierEvent) {
        return "ASSESSMENT_READY";
    }

    const selectedTier = tierEvent.meta?.tier ?? tier;
    if (selectedTier === "PREMIUM") {
        return "PREMIUM_ACTIVE";
    }

    return "ENTITLED";
}

function getVal(caseId: string, key: string): string | null {
    const v = typeof window !== "undefined" ? localStorage.getItem(`re_case_${caseId}_${key}`) : null;
    if (!v || v === "NOT_SURE") return null;
    return v;
}

function getEvents(caseId: string): CaseEvent[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(`re_case_${caseId}_events`);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getDocs(caseId: string): DocMeta[] {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(`re_case_${caseId}_docs`);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getPayments(caseId: string): PaymentsCaseSlice | undefined {
    if (typeof window === "undefined") return undefined;
    const raw = localStorage.getItem(`re_case_${caseId}_payments`);
    if (!raw) return undefined;
    try {
        return JSON.parse(raw);
    } catch {
        return undefined;
    }
}

function getTier(caseId: string): EntitlementTier {
    if (typeof window === "undefined") return "NONE";
    const stored = localStorage.getItem(`re_case_tier_${caseId}`) as EntitlementTier | null;
    if (stored) return stored;
    const annual = localStorage.getItem("re_annual_access") === "1";
    return annual ? "ANNUAL_ACCESS" : "NONE";
}

export function buildCasePacket(caseId: string): CasePacket {
    const tier = getTier(caseId);
    const capabilities = tierToCapabilities(tier);
    const events = getEvents(caseId);
    const docs = getDocs(caseId);
    const derivedStatus = deriveStatusFromEvents(events, tier);

    const finalLetter = typeof window !== "undefined"
        ? localStorage.getItem(`re_case_${caseId}_final_letter`)
        : null;


    const disputeType = readDisputeType(caseId);

    // Sort events for effective view calculation
    const sortedEvents = [...events].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

    // Read intake status for integrity block
    const isIntakeSubmitted = typeof window !== "undefined" && localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1";

    const effectiveEvents = getEffectiveEvents(sortedEvents);

    // Build derivative stores
    const timelineFacts = readTimelineFacts(caseId);

    // Evidence Checklist
    const checklist = buildEvidenceChecklist(caseId);

    // Derived Dates
    const noticeDate = readNoticeDate(caseId);
    const serviceDate = readServiceDate(caseId);
    const eventDate = getVal(caseId, "contact_date") || null;

    // computeDerivedDates now takes caseId and reads internally
    const derivedItems = computeDerivedDates(caseId);

    // Responses & Submissions Indexes (basic extraction from events)
    const responses = sortedEvents.filter(e => e.type === "RESPONSE_RECEIVED").map(e => ({
        at: e.at,
        response_type: e.meta?.response_date ? "Formal" : "Unknown", // simplicity
        received_date: e.meta?.response_date,
        linked_doc_id: null,
        linked_doc_name: null
    }));

    const submissions = sortedEvents.filter(e => e.type === "APPEAL_SUBMITTED").map(e => ({
        at: e.at,
        method: e.meta?.method || null,
        submitted_date: e.at,
        linked_doc_id: null,
        linked_doc_name: null
    }));

    // PATCH10: Contact Method
    const contact = readContactMethod(caseId);

    // PATCH10: Storage Validation
    const storageVal = validateCaseStorage(caseId);

    // Fix dispute type string logic
    const dtString = String(disputeType || "");

    return {
        packet_version: "2.2",
        generated_at_iso: new Date().toISOString(),
        case: {
            id: caseId,
            derived_status: derivedStatus,
            dispute_type: disputeType,
            dispute_type_if_known: dtString !== "Unknown" ? disputeType : null
        },
        contact_method: contact ? {
            method: contact.method || "Unknown",
            value: contact.value,
            source: contact.recorded_from,
            updated_at: contact.updated_at_iso
        } : undefined,
        entitlement: {
            tier,
            capabilities,
        },
        integrity: {
            intake_submitted: isIntakeSubmitted,
            checklist_summary: checklist.summary,
            storage: {
                warnings: storageVal.warnings.map(w => w.message),
                stats: storageVal.stats
            }
        },
        intake: {
            issuer: getVal(caseId, "issuer"),
            reference: getVal(caseId, "reference"),
            notice_date: getVal(caseId, "notice_date"),
            event_date: getVal(caseId, "event_date"),
            summary: getVal(caseId, "summary"),
            desired_outcome: getVal(caseId, "desired_outcome"),
            already_contacted: getVal(caseId, "already_contacted"),
            council_stage: getVal(caseId, "council_stage"),
            council_appealed: getVal(caseId, "council_appealed"),
            private_notice_type: getVal(caseId, "private_notice_type"),
            private_appealed: getVal(caseId, "private_appealed"),
        },
        docs: {
            count: docs.length,
            items: docs,
        },
        events: {
            count: effectiveEvents.length,
            items: effectiveEvents,
        },
        outputs: {
            final_letter: finalLetter,
        },
        timeline_facts: timelineFacts,
        derived_dates: {
            version: "1.0",
            generated_at_iso: new Date().toISOString(),
            reference_only: true, // or derived
            disclaimer: "Calculated for reference only. Verify with official notices.",
            base_dates: {
                notice_date: noticeDate,
                service_date: serviceDate,
                event_date: eventDate,
            },
            items: derivedItems
        },
        evidence_checklist: checklist,
        responses_index: {
            version: "1.0",
            count: responses.length,
            items: responses,
        },
        submissions_index: {
            version: "1.0",
            count: submissions.length,
            items: submissions,
        },
        payments: getPayments(caseId),
    };
}
