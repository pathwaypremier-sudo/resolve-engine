import { VerticalId } from "../verticals/verticals";

export type DisputeType = "COUNCIL_PCN" | "PRIVATE_PARKING";

export const QUESTION_SET_VERSION = "2026-01-31-01";

export type QType = "text" | "date" | "select" | "yesno";

export type QGroup = "CORE" | "PROCEDURE" | "CLASSIFICATION";

export type Question = {
    id: string;
    label: string;
    help?: string;
    type: QType;
    required?: boolean;
    options?: { value: string; label: string }[];
    // If this returns false, the question is hidden.
    when?: (ctx: Ctx) => boolean;
    // Storage key suffix; full key becomes: re_case_{caseId}_{key}
    key: string;
    // Group for progressive sub-steps
    group: QGroup;
};

export type Ctx = {
    verticalId?: VerticalId; // Optional for backward compatibility, but runtime always has it
    disputeType?: DisputeType | string; // Allow string to support loosely typed local storage
    evidenceStatus?: "PROVIDED" | "NONE_DECLARED" | string | null;
    answers: Record<string, string>;
};

export function buildQuestions(ctx: Ctx): Question[] {
    const isNotSure = !ctx.disputeType || ctx.disputeType === "NOT_SURE" || ctx.disputeType === "null";

    const qs: Question[] = [
        // CLASSIFICATION: If we don't know the type yet
        {
            id: "dispute_type_guess",
            key: "dispute_type_guess",
            label: "What type of notice did you receive?",
            help: "Check the top of the notice: 'Penalty Charge Notice' (Council) or 'Parking Charge Notice' (Private).",
            type: "select",
            options: [
                { value: "COUNCIL_PCN", label: "Council (Penalty Charge Notice)" },
                { value: "PRIVATE_PARKING", label: "Private (Parking Charge Notice)" },
                { value: "NOT_SURE", label: "I am not sure" },
            ],
            when: () => isNotSure,
            group: "CLASSIFICATION",
        },

        // CORE: basic facts
        {
            id: "issuer",
            key: "issuer",
            label: "Name of the enforcement authority",
            help: "The organization named at the top of the notice (e.g. 'Barnet Council', 'Parking Eye').",
            type: "text",
            required: true,
            group: "CORE",
        },
        {
            id: "reference",
            key: "reference",
            label: "Notice Reference Number (optional)",
            help: "Usually labeled 'PCN Number' or 'Ref'. Leave blank if unclear.",
            type: "text",
            group: "CORE",
        },
        {
            id: "notice_date",
            key: "notice_date",
            label: "Date of Issue",
            help: "Usually near the top or next to the reference number. Record the date printed (even if you received it later).",
            type: "date",
            group: "CORE",
        },
        {
            id: "event_date",
            key: "event_date",
            label: "Date of Contravention (if different)",
            help: "When the parking event happened. Often the same as Date of Issue. Leave blank if unsure.",
            type: "date",
            group: "CORE",
        },
        {
            id: "summary",
            key: "summary",
            label: "Briefly describe the event",
            help: "State the facts (e.g. 'I paid but entered wrong VRN', 'Signage was obscured').",
            type: "text",
            required: true,
            group: "CORE",
        },

        // PAPER TRAIL: Constitutional basics
        {
            id: "ref_check",
            key: "ref_check",
            label: "Can you locate the reference number on the notice?",
            type: "select",
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            // Only ask to check reference if we don't have one, or if we want to confirm a manually entered one?
            // "Reference number (optional)" is keys: reference.
            // If they entered one, we might assume it's right.
            // But the question asks "exactly as shown".
            // Fix: Suppress if we have a reference value.
            when: (c) => !c.answers.reference,
            group: "CORE",
        },
        {
            id: "copies_kept",
            key: "copies_kept",
            label: "Do you have copies of the notice and correspondence?",
            type: "select",
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "PARTLY", label: "Partly" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            // Suppress if they already uploaded evidence ("PROVIDED").
            when: (c) => c.evidenceStatus !== "PROVIDED",
            group: "CORE",
        },
        {
            id: "contact_status",
            key: "contact_status",
            label: "Have you already contacted the enforcement authority?",
            help: "This includes appeals, letters, or phone calls.",
            type: "select",
            options: [
                { value: "NO", label: "No" },
                { value: "YES_WRITING", label: "Yes – in writing (email/letter/form)" },
                { value: "YES_PHONE", label: "Yes – by phone" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            group: "CORE",
        },
        {
            id: "contact_copy",
            key: "contact_copy",
            label: "Do you have a record of the correspondence?",
            help: "e.g. a sent email, screenshot, copy of letter, or proof of posting.",
            type: "select",
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            when: (c) => c.answers.contact_status === "YES_WRITING",
            group: "CORE",
        },
        {
            id: "response_received",
            key: "response_received",
            label: "Has the enforcement authority responded?",
            help: "Any letter or email reply (even an automated acknowledgment).",
            type: "select",
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            when: (c) => c.answers.contact_status === "YES_WRITING" || c.answers.contact_status === "YES_PHONE",
            group: "CORE",
        },
        {
            id: "response_date",
            key: "response_date",
            label: "Date of Response",
            help: "The date printed on their letter or email.",
            type: "date",
            when: (c) => c.answers.response_received === "YES",
            group: "CORE",
        },

        // PROCEDURE: Branch-specific + outcome
        {
            id: "council_stage",
            key: "council_stage",
            label: "What is the current status of the penalty?",
            help: "Check the latest document received (e.g. 'Notice to Owner', 'Charge Certificate').",
            type: "select",
            options: [
                { value: "PCN_WINDSCREEN", label: "PCN on windscreen" },
                { value: "POSTAL_PCN", label: "Postal PCN" },
                { value: "NOTICE_TO_OWNER", label: "Notice to Owner" },
                { value: "CHARGE_CERT", label: "Charge Certificate" },
                { value: "ORDER_FOR_RECOVERY", label: "Order for Recovery" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            // Show for Council OR if we are unsure (to help disambiguate via stage)
            when: (c) => c.disputeType === "COUNCIL_PCN" || isNotSure,
            group: "PROCEDURE",
        },
        {
            id: "council_appealed",
            key: "council_appealed",
            label: "Have you submitted a formal representation?",
            help: "This is the official written challenge sent to the council.",
            type: "yesno",
            when: (c) => c.disputeType === "COUNCIL_PCN",
            group: "PROCEDURE",
        },
        {
            id: "private_notice_type",
            key: "private_notice_type",
            label: "How was the parking charge issued?",
            help: "Was it affixed to the vehicle or received by post?",
            type: "select",
            options: [
                { value: "WINDSCREEN", label: "Ticket on windscreen" },
                { value: "POST", label: "Letter in the post" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            when: (c) => c.disputeType === "PRIVATE_PARKING",
            group: "PROCEDURE",
        },
        {
            id: "private_appealed",
            key: "private_appealed",
            label: "Have you appealed to the operator?",
            help: "The initial appeal sent to the parking company.",
            type: "yesno",
            when: (c) => c.disputeType === "PRIVATE_PARKING",
            group: "PROCEDURE",
        },
        {
            id: "desired_outcome",
            key: "desired_outcome",
            label: "What is your primary objective?",
            help: "Select the outcome you are seeking.",
            type: "select",
            options: [
                { value: "CANCEL", label: "Cancellation" },
                { value: "REDUCE", label: "Reduced amount" },
                { value: "PAY_PLAN", label: "Payment plan" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            required: true,
            group: "PROCEDURE",
        },
    ];

    return qs;
}
