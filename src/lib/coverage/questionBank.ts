/**
 * Motoring Penalty Question Bank
 * Single source of truth for Council PCN and Private Parking requirements.
 */

export type CaseType = "COUNCIL_PCN" | "PRIVATE_PARKING";
export type ContraventionType = "PARKING" | "BUS_LANE" | "MOVING_TRAFFIC" | "NOT_SURE";

export interface QuestionDef {
    id: string;
    label: string;
    help?: string;
    type: "text" | "date" | "select" | "yesno" | "upload" | "info";
    options?: { value: string; label: string }[];
    // Path in CaseState to read/write value
    path: string;
    // If true, this question is mandatory for the flow
    required: boolean;
    // Conditions for visibility
    when?: (state: any) => boolean;
}

/**
 * Question Bank Definition
 */
export const QUESTION_BANK: QuestionDef[] = [
    // ------------------------------------------------------------------
    // CLASSIFICATION (Determines flow)
    // ------------------------------------------------------------------
    {
        id: "dispute_type",
        path: "disputeType",
        label: "What type of notice is this?",
        type: "select",
        required: true,
        options: [
            { value: "COUNCIL_PCN", label: "Council / TFL / Local Authority (Penalty Charge Notice)" },
            { value: "PRIVATE_PARKING", label: "Private Company (Parking Charge Notice)" },
        ]
    },
    {
        id: "contravention_type",
        path: "contraventionType",
        label: "What is the alleged contravention?",
        type: "select",
        required: true,
        when: (s) => s.disputeType === "COUNCIL_PCN",
        options: [
            { value: "PARKING", label: "Parking (Yellow lines, resident bay, etc.)" },
            { value: "BUS_LANE", label: "Bus Lane" },
            { value: "MOVING_TRAFFIC", label: "Moving Traffic (Box junction, No turn, One way)" },
        ]
    },

    // ------------------------------------------------------------------
    // CORE FACTS (The "Big 5")
    // ------------------------------------------------------------------
    {
        id: "vrm",
        path: "vehicle.reg",
        label: "Vehicle Registration Mark (VRM)",
        help: "As shown on the notice.",
        type: "text",
        required: true,
    },
    {
        id: "pcn_number",
        path: "reference",
        label: "Notice Reference Number",
        help: "Unique identifier on the notice.",
        type: "text",
        required: true,
    },
    {
        id: "contravention_date",
        path: "date.event",
        label: "Date of Contravention",
        help: "When the incident allegedly occurred.",
        type: "date",
        required: true,
    },
    {
        id: "issue_date",
        path: "date.issue",
        label: "Date of Issue / Notice Date",
        help: "The date printed on the letter or ticket.",
        type: "date",
        required: true,
    },
    {
        id: "location",
        path: "location",
        label: "Location of Contravention",
        help: "Street name or car park name as listed.",
        type: "text",
        required: true,
    },

    // ------------------------------------------------------------------
    // EVIDENCE CHECKS
    // ------------------------------------------------------------------
    {
        id: "has_notice_copy",
        path: "evidence.hasNotice",
        label: "Do you have a copy of the notice?",
        type: "yesno",
        required: true,
    },

    // Video evidence is critical for Moving Traffic / Bus Lane
    {
        id: "has_video",
        path: "evidence.hasVideo",
        label: "Have you viewed the video evidence?",
        help: "For moving traffic/bus lane, you MUST view the video to check for meaningful contravention.",
        type: "yesno",
        required: true,
        when: (s) => s.disputeType === "COUNCIL_PCN" &&
            (s.contraventionType === "BUS_LANE" || s.contraventionType === "MOVING_TRAFFIC"),
    },

    // Signage evidence is critical for Parking / Box Junction
    {
        id: "has_signage_photos",
        path: "evidence.hasSignage",
        label: "Do you have photos of the signage/markings?",
        type: "yesno",
        required: false, // Strongly encouraged but user might not have them yet
        when: (s) => s.contraventionType === "PARKING" || s.contraventionType === "MOVING_TRAFFIC",
    },

    // ------------------------------------------------------------------
    // STAGE DETECTION (Escalation Ladder)
    // ------------------------------------------------------------------
    {
        id: "council_stage",
        path: "stage.council",
        label: "What document have you received most recently?",
        type: "select",
        required: true,
        when: (s) => s.disputeType === "COUNCIL_PCN",
        options: [
            { value: "PCN_WINDSCREEN", label: "PCN on Windscreen (Informal)" },
            { value: "PCN_POSTAL", label: "Postal PCN (Formal/NTO equivalent)" },
            { value: "NTO", label: "Notice to Owner (Formal)" },
            { value: "REJECTION_INFORMAL", label: "Rejection of Informal Challenge" },
            { value: "REJECTION_FORMAL", label: "Notice of Rejection (Formal)" },
            { value: "CHARGE_CERT", label: "Charge Certificate (Too late to appeal usually)" },
        ]
    },
    {
        id: "private_stage",
        path: "stage.private",
        label: "What status is the charge in?",
        type: "select",
        required: true,
        when: (s) => s.disputeType === "PRIVATE_PARKING",
        options: [
            { value: "NOTICE_INITIAL", label: "Initial Notice to Driver/Keeper" },
            { value: "REMINDER", label: "Reminder Letter" },
            { value: "DEBT_RECOVERY", label: "Debt Recovery / Bailiff Letter" },
            { value: "PROCEEDINGS", label: "Letter Before Claim / Court Claim" },
        ]
    },

    // ------------------------------------------------------------------
    // GROUNDS / GROUNDS SPECIFIC
    // ------------------------------------------------------------------
    {
        id: "grounds_general",
        path: "grounds.selected",
        label: "What is your main ground for appeal?",
        type: "select",
        required: true,
        options: [
            { value: "CONTRAVENTION_DID_NOT_OCCUR", label: "The contravention did not occur" },
            { value: "NOT_OWNER", label: "I was not the owner at the time" },
            { value: "STOLEN", label: "Vehicle was taken without consent" },
            { value: "PROCESS_ERROR", label: "Procedural impropriety / Technical Error" },
            { value: "MITIGATION", label: "Mitigating circumstances (Emergency, Breakdown)" },
            { value: "PAID", label: "The charge has already been paid" },
        ]
    },

    // Detailed checks based on grounds
    {
        id: "ground_details_mitigation",
        path: "grounds.details.mitigation",
        label: "Describe the mitigating circumstances",
        type: "text",
        required: true,
        when: (s) => s.grounds?.selected === "MITIGATION",
    },
    {
        id: "ground_details_technical",
        path: "grounds.details.technical",
        label: "Describe the error (Wrong VRM, Time, Location?)",
        type: "text",
        required: true,
        when: (s) => s.grounds?.selected === "PROCESS_ERROR",
    }
];

// Helper to get questions for a given state
export function getApplicableQuestions(state: any): QuestionDef[] {
    return QUESTION_BANK.filter(q => {
        if (!q.when) return true;
        try {
            return q.when(state);
        } catch {
            return false;
        }
    });
}
