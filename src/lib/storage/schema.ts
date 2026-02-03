
/**
 * Registry of all localStorage keys used by the Resolve Engine Case System.
 * Serves as the source of truth for schema validation and integrity checks.
 */

export type StorageKeyDef = {
    keyTemplate: string; // e.g., "re_case_{id}_events"
    description: string;
    expectedType: "string" | "json_array" | "json_object" | "number_string" | "boolean_string";
    requiredForAssessment: boolean;
};

export const CASE_STORAGE_SCHEMA: Record<string, StorageKeyDef> = {
    // Core Identity
    "dispute_type": {
        keyTemplate: "re_case_{id}_dispute_type",
        description: "Primary category of the dispute (e.g., 'Council PCN', 'Private Parking')",
        expectedType: "string",
        requiredForAssessment: true
    },
    "issuer": {
        keyTemplate: "re_case_{id}_issuer",
        description: "Name of the entity issuing the charge",
        expectedType: "string",
        requiredForAssessment: false // Recommended but strictly optional for initial logic
    },
    "reference": {
        keyTemplate: "re_case_{id}_reference",
        description: "Unique case reference number (PCN number)",
        expectedType: "string",
        requiredForAssessment: false
    },

    // Dates
    "notice_date": {
        keyTemplate: "re_case_{id}_notice_date",
        description: "Date of the penalty notice (ISO date only YYYY-MM-DD)",
        expectedType: "string",
        requiredForAssessment: false
    },
    "event_date": {
        keyTemplate: "re_case_{id}_event_date",
        description: "Date of the alleged contravention (ISO date only YYYY-MM-DD)",
        expectedType: "string",
        requiredForAssessment: false
    },

    // User Input
    "summary": {
        keyTemplate: "re_case_{id}_summary",
        description: "User's free-text description of what happened",
        expectedType: "string",
        requiredForAssessment: false
    },
    "desired_outcome": {
        keyTemplate: "re_case_{id}_desired_outcome",
        description: "User's goal (e.g., 'Cancel ticket', 'Pay reduced')",
        expectedType: "string",
        requiredForAssessment: false
    },
    "already_contacted": {
        keyTemplate: "re_case_{id}_already_contacted",
        description: "Whether the user has already contacted the issuer (Yes/No string)",
        expectedType: "string",
        requiredForAssessment: false
    },

    // Collections
    "docs": {
        keyTemplate: "re_case_{id}_docs",
        description: "JSON array of document metadata",
        expectedType: "json_array",
        requiredForAssessment: false
    },
    "events": {
        keyTemplate: "re_case_{id}_events",
        description: "JSON array of system and user events (timeline)",
        expectedType: "json_array",
        requiredForAssessment: true // Essential for audit trail
    },

    // Workflow State
    "tier": {
        keyTemplate: "re_case_{id}_tier",
        description: "Current service entitlement tier",
        expectedType: "string",
        requiredForAssessment: true // Default 'NONE' usually handled, but key should explicitly exist or be inferable
    },
    "intake_submitted": {
        keyTemplate: "re_case_{id}_intake_submitted",
        description: "Flag indicating intake wizard completion ('1' or '0')",
        expectedType: "boolean_string",
        requiredForAssessment: false
    },

    // PATCH10 / Specialized
    "contact_method": {
        keyTemplate: "re_case_{id}_contact_method",
        description: "JSON object for issuer contact details",
        expectedType: "json_object",
        requiredForAssessment: false
    },
    "final_letter": {
        keyTemplate: "re_case_{id}_final_letter",
        description: "Generated appeal letter content",
        expectedType: "string",
        requiredForAssessment: false
    }
};

/**
 * Returns true if a key matches the template for a specific case ID.
 */
export function isKeyForCase(storageKey: string, caseId: string, template: string): boolean {
    const expected = template.replace("{id}", caseId);
    return storageKey === expected;
}
