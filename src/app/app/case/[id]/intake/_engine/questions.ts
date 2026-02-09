export type DisputeType = "COUNCIL_PCN" | "PRIVATE_PARKING" | "CONSUMER_GOODS";

export type QType = "text" | "date" | "select" | "yesno";

export type QGroup = "CORE" | "PROCEDURE";

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
    disputeType?: DisputeType;
    answers: Record<string, string>;
};

export function buildQuestions(ctx: Ctx): Question[] {
    // Constitution (PDF): act fast, keep timeline, written proof, reference numbers, set deadlines.
    // We implement that as: minimal core facts + prior action + desired outcome + urgency.
    const qs: Question[] = [
        // PHASE A: ROUTING QUESTIONS
    {
      id: "notice_type",
      key: "notice_type",
      label: "What type of notice did you receive?",
      help: "This helps us provide the most relevant guidance for your situation.",
      type: "select",
      required: true,
      options: [
        { value: "COUNCIL_PCN", label: "Council Penalty Charge Notice (PCN)" },
        { value: "PRIVATE_PARKING", label: "Private Parking Charge" },
        { value: "CAMERA_MATTER", label: "Camera-related matter (e.g., bus lane, yellow box)" },
      ],
      group: "CORE",
    },
    {
      id: "user_intent",
      key: "user_intent",
      label: "What would you like to do?",
      help: "Choose whether you want to challenge the notice or discuss payment options.",
      type: "select",
      required: true,
      options: [
        { value: "CHALLENGE", label: "Challenge the notice" },
        { value: "AFFORDABILITY", label: "I want to pay but cannot afford it" },
      ],
      group: "CORE",
    },

        // CORE: basic facts



        {
            id: "issuer",
            key: "issuer",
            label: "Who issued the notice?",
            help: "Council name or parking operator (e.g. APCOA, Euro Car Parks).",
            type: "text",
            required: true,
            group: "CORE",
        },
        {
            id: "reference",
            key: "reference",
            label: "Reference number (optional)",
            help: "If you're not sure, leave blank.",
            type: "text",
            group: "CORE",
        },
        {
            id: "notice_date",
            key: "notice_date",
            label: "Date on the notice",
            help: "Used for urgency checks and deadlines.",
            type: "date",
            group: "CORE",
        },
        {
            id: "event_date",
            key: "event_date",
            label: "Date of the parking event (if different)",
            type: "date",
            group: "CORE",
        },
        {
            id: "summary",
            key: "summary",
            label: "Briefly describe what happened",
            help: "Stick to the facts (what, where, when). Avoid opinions for now.",
            type: "text",
            required: true,
            group: "CORE",
        },

        // PROCEDURE: Branch-specific + outcome
        {
            id: "council_stage",
            key: "council_stage",
            label: "Which stage are you at?",
            type: "select",
            options: [
                { value: "PCN_WINDSCREEN", label: "PCN on windscreen" },
                { value: "POSTAL_PCN", label: "Postal PCN" },
                { value: "NOTICE_TO_OWNER", label: "Notice to Owner" },
                { value: "CHARGE_CERT", label: "Charge Certificate" },
                { value: "ORDER_FOR_RECOVERY", label: "Order for Recovery" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            when: (c) => c.disputeType === "COUNCIL_PCN",
            group: "PROCEDURE",
        },
        {
            id: "council_appealed",
            key: "council_appealed",
            label: "Have you already made a formal representation/appeal?",
            type: "yesno",
            when: (c) => c.disputeType === "COUNCIL_PCN",
            group: "PROCEDURE",
        },
        {
            id: "private_notice_type",
            key: "private_notice_type",
            label: "How did you receive it?",
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
            label: "Have you already appealed to the operator?",
            type: "yesno",
            when: (c) => c.disputeType === "PRIVATE_PARKING",
            group: "PROCEDURE",
        },
        {
            id: "desired_outcome",
            key: "desired_outcome",
            label: "What outcome do you want?",
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
        {
            id: "already_contacted",
            key: "already_contacted",
            label: "Have you contacted them already (email/letter/form)?",
            help: "Written contact is best for evidence trails.",
            type: "yesno",
            group: "PROCEDURE",
        },
    ];

    return qs;
}
