import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * Action to resolve a missing information item.
 */
export type MissingInfoAction = {
    /** The missing field key */
    field: keyof CaseFacts;

    /** User-friendly label for the field */
    label: string;

    /** URL to the specific intake step to correct this */
    url: string;
};

/**
 * Maps missing case fact fields to the appropriate intake questions.
 * 
 * @param caseId - The current case ID
 * @param missingFields - List of missing keys from AssessmentResult
 * @returns List of actionable items with deep links
 */
export function mapMissingInfoToQuestions(
    caseId: string,
    missingFields: Array<keyof CaseFacts>
): MissingInfoAction[] {
    const actions: MissingInfoAction[] = [];

    for (const field of missingFields) {
        let label = field.toString();
        let step = "";

        switch (field) {
            case "pcnNumber":
                label = "PCN Number";
                step = "basics";
                break;
            case "issuer":
                label = "Issuer Name";
                step = "basics";
                break;
            case "issueDate":
                label = "Date of Issue";
                step = "dates";
                break;
            case "vrn":
                label = "Vehicle Registration";
                step = "vehicle";
                break;
            case "location":
                label = "Location";
                step = "vehicle";
                break;
            case "disputeType":
                label = "Dispute Type";
                step = "type";
                break;
            case "contraventionType":
                label = "Contravention Code";
                step = "details";
                break;
            default:
                // Fallback for fields not yet mapped to specific steps
                label = field.replace(/([A-Z])/g, " $1").trim(); // CamelCase to Spaced
                step = "";
        }

        // Construct URL - assuming standard intake wizard routing
        // If step is empty, just go to root intake for that case
        const url = step
            ? `/intake?case=${caseId}&step=${step}`
            : `/intake?case=${caseId}`;

        actions.push({ field, label, url });
    }

    return actions;
}
