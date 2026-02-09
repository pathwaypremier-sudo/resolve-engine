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

        // AFFORDABILITY QUESTIONS (only when user_intent = AFFORDABILITY)
    {
      id: "affordability_reason",
      key: "affordability_reason",
      label: "Why can't you afford to pay right now?",
      type: "select",
      required: true,
      options: [
        { value: "LOW_INCOME", label: "Low income" },
        { value: "TEMP_HARDSHIP", label: "Temporary hardship" },
        { value: "DEBT_PRESSURE", label: "Debt pressure" },
        { value: "BENEFITS", label: "Benefits / support" },
        { value: "OTHER", label: "Other" },
      ],
      when: (c) => c.answers.user_intent === "AFFORDABILITY",
      group: "CORE",
    },
    {
      id: "ability_to_pay_now",
      key: "ability_to_pay_now",
      label: "What can you realistically do?",
      type: "select",
      required: true,
      options: [
        { value: "NONE", label: "I can't pay anything right now" },
        { value: "SMALL_AMOUNT", label: "I can pay a small amount" },
        { value: "CAN_PAY_LATER", label: "I can pay later" },
        { value: "UNKNOWN", label: "Not sure" },
      ],
      when: (c) => c.answers.user_intent === "AFFORDABILITY",
      group: "CORE",
    },
    {
      id: "preferred_outcome",
      key: "preferred_outcome",
      label: "What outcome do you want help requesting?",
      type: "select",
      required: true,
      options: [
        { value: "TIME_TO_PAY", label: "More time to pay" },
        { value: "INSTALLMENTS", label: "Installments" },
        { value: "REDUCTION_DISCRETION", label: "Discretion / reduction (if possible)" },
        { value: "ADVICE_ONLY", label: "Advice only (I'll handle it myself)" },
      ],
      when: (c) => c.answers.user_intent === "AFFORDABILITY",
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

        // CAMERA MATTER QUESTIONS (only when notice_type = CAMERA_MATTER)
        {
            id: "camera_involved",
            key: "camera_involved",
            label: "Was this enforced using a camera?",
            type: "select",
            required: true,
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "UNKNOWN", label: "Not sure" },
            ],
            when: (c) => c.answers.notice_type === "CAMERA_MATTER",
            group: "CORE",
        },
        {
            id: "received_within_14_days",
            key: "received_within_14_days",
            label: "Did you receive the notice within 14 days of the event?",
            type: "select",
            required: true,
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            when: (c) => c.answers.notice_type === "CAMERA_MATTER",
            group: "CORE",
        },
        {
            id: "signage_clearly_visible",
            key: "signage_clearly_visible",
            label: "Were the restriction or speed signs clearly visible?",
            type: "select",
            required: true,
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            when: (c) => c.answers.notice_type === "CAMERA_MATTER",
            group: "CORE",
        },
        {
            id: "temporary_roadworks",
            key: "temporary_roadworks",
            label: "Was this in temporary roadworks?",
            type: "select",
            required: true,
            options: [
                { value: "YES", label: "Yes" },
                { value: "NO", label: "No" },
                { value: "NOT_SURE", label: "Not sure" },
            ],
            when: (c) => c.answers.notice_type === "CAMERA_MATTER",
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
