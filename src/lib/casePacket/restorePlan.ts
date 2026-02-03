
import { type CasePacket } from "./buildCasePacket";

export type RestoreAction = {
    key: string;
    action: "SET" | "SKIP";
    value?: string;
    summary: string;
};

export type RestorePlan = {
    can_apply: boolean;
    reasons: string[];
    writes: RestoreAction[];
};

/**
 * Builds a preview plan for restoring a case packet.
 * NO SIDE EFFECTS. Pure calculation.
 */
export function buildRestorePlan(caseId: string, packet: CasePacket): RestorePlan {
    const actions: RestoreAction[] = [];
    const reasons: string[] = [];
    let canApply = true;

    // 1. Identity Check
    if (packet.case.id !== caseId) {
        canApply = false;
        reasons.push(`Packet Case ID (${packet.case.id}) does not match current Case ID (${caseId}). Restoration blocked to prevent data corruption. Switch to the correct case first.`);
    }

    // Helper to add action
    const planSet = (keyTemplate: string, value: string | null | undefined, desc: string) => {
        if (value === undefined || value === null) {
            actions.push({
                key: keyTemplate.replace("{id}", caseId),
                action: "SKIP",
                summary: `${desc} (Not present in packet)`
            });
        } else {
            actions.push({
                key: keyTemplate.replace("{id}", caseId),
                action: "SET",
                value: value,
                summary: desc
            });
        }
    };

    // 2. Map Fields to Keys (Exhaustive based on known schema)

    // Identity
    planSet("re_case_{id}_dispute_type", packet.case.dispute_type || packet.case.dispute_type_if_known, `Dispute Type: ${packet.case.dispute_type || "Unknown"}`);

    // Tier (Special key format)
    planSet("re_case_tier_{id}", packet.entitlement.tier, `Tier: ${packet.entitlement.tier}`);

    // Intake Fields
    const i = packet.intake;
    planSet("re_case_{id}_issuer", i.issuer, `Issuer: ${i.issuer}`);
    planSet("re_case_{id}_reference", i.reference, `Reference: ${i.reference}`);
    planSet("re_case_{id}_notice_date", i.notice_date, `Notice Date: ${i.notice_date}`);
    planSet("re_case_{id}_event_date", i.event_date, `Event Date: ${i.event_date}`);
    planSet("re_case_{id}_summary", i.summary, "Summary text");
    planSet("re_case_{id}_desired_outcome", i.desired_outcome, "Desired outcome");
    planSet("re_case_{id}_already_contacted", i.already_contacted, "Already contacted flag");
    planSet("re_case_{id}_council_stage", i.council_stage, "Council stage");
    planSet("re_case_{id}_council_appealed", i.council_appealed, "Council appealed flag");
    planSet("re_case_{id}_private_notice_type", i.private_notice_type, "Private notice type");
    planSet("re_case_{id}_private_appealed", i.private_appealed, "Private appealed flag");

    // Intake Submitted Flag
    const submitted = packet.integrity?.intake_submitted;
    if (submitted !== undefined) {
        planSet("re_case_{id}_intake_submitted", submitted ? "1" : "0", `Intake Submitted: ${submitted}`);
    }

    // Complex Objects (arrays/JSON)

    // Docs
    if (packet.docs && Array.isArray(packet.docs.items)) {
        planSet("re_case_{id}_docs", JSON.stringify(packet.docs.items), `Documents Index (${packet.docs.items.length} items)`);
    }

    // Events
    if (packet.events && Array.isArray(packet.events.items)) {
        planSet("re_case_{id}_events", JSON.stringify(packet.events.items), `Events Timeline (${packet.events.items.length} items)`);
    }

    // Timeline Facts
    if (packet.timeline_facts) {
        planSet("re_case_{id}_timeline_facts", JSON.stringify(packet.timeline_facts), "Timeline Facts");
    }

    // Contact Method
    if (packet.contact_method) {
        planSet("re_case_{id}_contact_method", JSON.stringify({
            method: packet.contact_method.method,
            value: packet.contact_method.value,
            recorded_from: packet.contact_method.source,
            updated_at_iso: packet.contact_method.updated_at
        }), "Contact Method");
    }

    // Final Letter
    if (packet.outputs && packet.outputs.final_letter) {
        planSet("re_case_{id}_final_letter", packet.outputs.final_letter, "Final Letter (Generated)");
    }

    // Derived dates/status/checklist are COMPUTED, not stored (mostly).
    // We restore the RAW inputs (events, facts, intake dates) so derived state regenerates naturally.

    return {
        can_apply: canApply,
        reasons,
        writes: actions.filter(a => a.action === "SET") // Only return active writes
    };
}
