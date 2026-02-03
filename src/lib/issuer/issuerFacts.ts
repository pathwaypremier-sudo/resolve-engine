/**
 * Issuer Facts - Static Reference Data
 * 
 * General information about issuers for reference only.
 * This does not replace the information on your notice.
 */

export enum IssuerSubmissionMethod {
    PORTAL = "PORTAL",
    EMAIL = "EMAIL",
    POST = "POST",
}

export type IssuerFacts = {
    issuer_name: string;
    notice_types: string[];
    common_submission_methods: string[];
    commonSubmissionMethod?: IssuerSubmissionMethod;
    typical_documents_referenced: string[];
    notes: string[];
};

/**
 * Static map of issuer facts.
 * Keys are normalized issuer names (lowercase, trimmed).
 */
const ISSUER_FACTS_MAP: Record<string, IssuerFacts> = {
    // Council-type issuers
    "transport for london": {
        issuer_name: "Transport for London",
        notice_types: ["Penalty Charge Notice (PCN)", "Congestion Charge PCN", "ULEZ PCN"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["PCN", "Photographs", "Vehicle registration"],
        notes: [
            "TfL issues notices for road-based charges and contraventions.",
            "Notices typically include reference numbers and contravention details.",
        ],
    },
    "westminster council": {
        issuer_name: "Westminster City Council",
        notice_types: ["Penalty Charge Notice (PCN)"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["PCN", "Photographs", "Signage evidence"],
        notes: [
            "Local authority notices for parking and traffic contraventions.",
        ],
    },
    "camden council": {
        issuer_name: "Camden Council",
        notice_types: ["Penalty Charge Notice (PCN)"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["PCN", "Photographs"],
        notes: [
            "Local authority notices for parking contraventions.",
        ],
    },
    "islington council": {
        issuer_name: "Islington Council",
        notice_types: ["Penalty Charge Notice (PCN)"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["PCN", "Photographs"],
        notes: [
            "Local authority notices for parking contraventions.",
        ],
    },

    // Private operators
    "parking eye": {
        issuer_name: "Parking Eye",
        notice_types: ["Parking Charge Notice"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["Parking Charge Notice", "Photographs", "ANPR records"],
        notes: [
            "Private operator managing car parks on behalf of landowners.",
            "Notices are typically issued based on ANPR camera records.",
        ],
    },
    "vehicle control services": {
        issuer_name: "Vehicle Control Services",
        notice_types: ["Parking Charge Notice"],
        common_submission_methods: ["Post"],
        typical_documents_referenced: ["Parking Charge Notice", "Photographs"],
        notes: [
            "Private operator issuing charges for parking contraventions.",
        ],
    },
    "excel parking": {
        issuer_name: "Excel Parking",
        notice_types: ["Parking Charge Notice"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["Parking Charge Notice", "Photographs"],
        notes: [
            "Private operator managing retail and commercial car parks.",
        ],
    },
    "cps": {
        issuer_name: "Civil Parking Services (CPS)",
        notice_types: ["Parking Charge Notice"],
        common_submission_methods: ["Post"],
        typical_documents_referenced: ["Parking Charge Notice", "Photographs"],
        notes: [
            "Private operator issuing charges based on terms and conditions.",
        ],
    },
    "ukpc": {
        issuer_name: "UK Parking Control",
        notice_types: ["Parking Charge Notice"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["Parking Charge Notice", "Photographs", "ANPR records"],
        notes: [
            "Private operator managing car parks.",
        ],
    },
    "euro car parks": {
        issuer_name: "Euro Car Parks",
        notice_types: ["Parking Charge Notice"],
        common_submission_methods: ["Online", "Post"],
        typical_documents_referenced: ["Parking Charge Notice", "Photographs"],
        notes: [
            "Private operator with car parks across the UK.",
        ],
    },

    // Default fallback
    "default": {
        issuer_name: "Unknown Issuer",
        notice_types: ["Notice", "Charge Notice"],
        common_submission_methods: ["Post", "Online (if available)"],
        typical_documents_referenced: ["Notice", "Photographs", "Supporting evidence"],
        notes: [
            "Refer to your notice for specific submission instructions.",
            "Keep copies of all correspondence.",
        ],
    },
};

/**
 * Normalize issuer name for lookup.
 */
function normalizeIssuerName(name: string): string {
    return name.toLowerCase().trim();
}

/**
 * Get issuer facts for a given issuer name.
 * Falls back to DEFAULT if not found.
 */
export function getIssuerFacts(issuerName: string): IssuerFacts {
    const normalized = normalizeIssuerName(issuerName);

    // Direct match
    if (ISSUER_FACTS_MAP[normalized]) {
        return ISSUER_FACTS_MAP[normalized];
    }

    // Partial match
    for (const key of Object.keys(ISSUER_FACTS_MAP)) {
        if (key !== "default" && normalized.includes(key)) {
            return ISSUER_FACTS_MAP[key];
        }
    }

    // Fallback
    return ISSUER_FACTS_MAP["default"];
}

/**
 * Check if we have specific facts for this issuer (not default).
 */
export function hasIssuerFacts(issuerName: string): boolean {
    const facts = getIssuerFacts(issuerName);
    return facts.issuer_name !== "Unknown Issuer";
}
