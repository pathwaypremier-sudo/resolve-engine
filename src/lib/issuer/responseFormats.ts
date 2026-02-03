/**
 * Response Formats - Reference Data
 * 
 * Helps users recognise and record issuer responses accurately.
 * Reference only. Always rely on the wording in your notice/letter.
 */

export type ResponseFormat = {
    key: string;
    title: string;
    what_it_usually_includes: string[];
    phrases_you_might_see: string[];
    record_these_fields: string[];
};

/**
 * Canonical response formats (issuer-independent).
 */
export const RESPONSE_FORMATS: ResponseFormat[] = [
    {
        key: "ACKNOWLEDGEMENT",
        title: "Acknowledgement",
        what_it_usually_includes: [
            "Confirmation that representations were received",
            "Reference number",
            "Date of receipt",
            "Statement that a decision will follow",
        ],
        phrases_you_might_see: [
            "We have received your representations",
            "Your appeal has been logged",
            "We will respond in due course",
        ],
        record_these_fields: [
            "Date received",
            "Reference number stated",
            "Any timeframe mentioned on the notice (reference only)",
        ],
    },
    {
        key: "REJECTION",
        title: "Rejection",
        what_it_usually_includes: [
            "Statement that the charge/penalty is upheld",
            "Reasons for decision",
            "Reference number",
            "Information about next steps (if any stated)",
        ],
        phrases_you_might_see: [
            "Your appeal has been unsuccessful",
            "The charge remains payable",
            "We have considered your representations and...",
            "The penalty charge notice is upheld",
        ],
        record_these_fields: [
            "Date received",
            "Stated outcome (rejection)",
            "Reasons given",
            "Any next-stage information mentioned on the letter",
        ],
    },
    {
        key: "ACCEPTANCE",
        title: "Acceptance / Cancellation",
        what_it_usually_includes: [
            "Statement that the charge/penalty is cancelled",
            "Confirmation no further action required",
            "Reference number",
        ],
        phrases_you_might_see: [
            "Your appeal has been successful",
            "The charge has been cancelled",
            "No further action is required",
            "The penalty charge notice has been withdrawn",
        ],
        record_these_fields: [
            "Date received",
            "Stated outcome (accepted/cancelled)",
            "Confirmation of no further payment due",
        ],
    },
    {
        key: "INFO_REQUEST",
        title: "Request for further information",
        what_it_usually_includes: [
            "Statement that more information is needed",
            "List of documents or details requested",
            "Reference number",
        ],
        phrases_you_might_see: [
            "Please provide further evidence",
            "We require additional information",
            "Your appeal cannot be processed without...",
        ],
        record_these_fields: [
            "Date received",
            "What information is being requested",
            "Any timeframe stated on the notice (reference only)",
        ],
    },
    {
        key: "REMINDER_ESCALATION",
        title: "Reminder / Escalation notice",
        what_it_usually_includes: [
            "Statement that previous notice remains unpaid",
            "Updated amount (if increased)",
            "Reference number",
            "Mention of next stage in process",
        ],
        phrases_you_might_see: [
            "This is a reminder",
            "Final notice before...",
            "The charge has increased to...",
            "Notice to Owner",
            "Charge Certificate",
        ],
        record_these_fields: [
            "Date received",
            "Type of notice (e.g., reminder, NTO, charge certificate)",
            "Current amount stated",
            "Any stage/escalation wording on the notice",
        ],
    },
];

/**
 * Standard disclaimer for UI.
 */
export const RESPONSE_FORMAT_DISCLAIMER = "Reference only. Always rely on the wording in your notice/letter.";

/**
 * Get all response formats.
 */
export function getResponseFormats(): ResponseFormat[] {
    return RESPONSE_FORMATS;
}
