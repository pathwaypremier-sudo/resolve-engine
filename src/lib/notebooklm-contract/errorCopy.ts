/**
 * NotebookLM Contract v1 — Error Copy (Phase N9b)
 *
 * Centralized user-facing error messages for all NotebookLM validation
 * and intake-related error states.
 *
 * Philosophy:
 * - Calm, human-readable language
 * - No technical jargon
 * - No blame language
 * - No outcome promises
 * - Each error includes: title, explanation, next step
 */

export type ErrorCopy = {
    title: string;
    explanation: string;
    nextStep: string;
};

// ─── API-Level Errors ────────────────────────────────────────────────────────

export const ERROR_COPY = {
    // Rate limiting
    RATE_LIMIT: {
        title: "Please wait a moment",
        explanation: "We've received several requests from your connection recently. This helps us maintain service quality for everyone.",
        nextStep: "Please wait a minute and try again.",
    },

    // Authentication
    UNAUTHORIZED: {
        title: "Session not found",
        explanation: "We couldn't verify your session. This can happen if you've been inactive for a while.",
        nextStep: "Please refresh the page and sign in again.",
    },

    // Input validation
    MISSING_INPUT: {
        title: "Input required",
        explanation: "We didn't receive the text needed to perform the analysis.",
        nextStep: "Please make sure you've pasted or entered the content you want analyzed.",
    },

    INPUT_TOO_LONG: {
        title: "Input is too long",
        explanation: "The text you provided exceeds our current processing limit. This helps us maintain response quality and speed.",
        nextStep: "Please try with a shorter excerpt or summary of the key details.",
    },

    INVALID_CASE_ID: {
        title: "Case reference issue",
        explanation: "The case reference provided doesn't match the expected format.",
        nextStep: "Please check the case reference and try again, or proceed without one.",
    },

    // Processing errors
    INTERNAL_ERROR: {
        title: "Something went wrong",
        explanation: "We encountered an unexpected issue while processing your request. This has been logged for review.",
        nextStep: "Please try again in a moment. If the issue continues, contact support.",
    },

    // ─── Validation Errors ───────────────────────────────────────────────────

    // Schema validation
    SCHEMA_INVALID: {
        title: "Analysis format issue",
        explanation: "The analysis output didn't match the expected structure. This is a safety measure to ensure you receive complete information.",
        nextStep: "A safe fallback response has been provided. You may want to review your input and try again.",
    },

    // Section validation
    MISSING_SECTIONS: {
        title: "Incomplete analysis",
        explanation: "The analysis didn't include all required sections. We require complete information to ensure you have everything needed.",
        nextStep: "A safe fallback response has been provided with all required sections.",
    },

    EXTRA_SECTIONS: {
        title: "Unexpected content detected",
        explanation: "The analysis included content that wasn't part of the standard format. This is flagged as a precaution.",
        nextStep: "A safe fallback response has been provided using the standard format.",
    },

    OVER_LENGTH: {
        title: "Section too detailed",
        explanation: "One or more sections exceeded the maximum length. This helps ensure responses remain focused and readable.",
        nextStep: "A safe fallback response has been provided with appropriately sized sections.",
    },

    // Language validation
    FORBIDDEN_LANGUAGE: {
        title: "Content safety check",
        explanation: "The analysis contained language that doesn't meet our safety standards. We avoid guarantees, threats, or outcome promises.",
        nextStep: "A safe fallback response has been provided that meets our ethical guidelines.",
    },
} as const satisfies Record<string, ErrorCopy>;

// ─── Fallback Mode Copy ──────────────────────────────────────────────────────

export const FALLBACK_COPY = {
    DO_NOT_PROCEED: {
        summary:
            "The automated analysis could not produce a validated output for this case. " +
            "This does not reflect on the merits of your situation.",
        position:
            "We are unable to provide a position assessment at this time. " +
            "The system has determined that proceeding without professional review would not be appropriate.",
        reasoning: (reason: string) =>
            "The analysis output did not meet the required safety and quality standards. " +
            `Validation issue: ${reason}. ` +
            "This is a precautionary measure to ensure you receive accurate information.",
        evidenceRequests:
            "Please retain all documents related to your case, including the original notice, " +
            "any correspondence, photographs, and receipts. These may be needed for professional review.",
        nextSteps:
            "We recommend seeking independent legal advice or contacting a relevant advisory service " +
            "such as Citizens Advice (England & Wales) before taking any further action on this matter.",
        risksAndLimits:
            "This output was generated in safe mode due to a validation issue. " +
            "It does not constitute legal advice and makes no promises about outcomes. " +
            "Parking and motoring matters can have financial and legal consequences. " +
            "Always verify information independently and consider seeking professional legal advice.",
    },

    SAFE_EXPLANATION: {
        summary:
            "The automated analysis was unable to produce a fully validated result. " +
            "A safe explanation has been generated instead.",
        position:
            "Based on the information available, a detailed position could not be determined. " +
            "This may be due to incomplete data or a processing issue, not a reflection of your case merits.",
        reasoning: (reason: string) =>
            "The system applies strict validation to all generated content to ensure accuracy and safety. " +
            `The output did not pass validation (issue: ${reason}). ` +
            "This safe fallback has been provided to ensure you are not given unverified information.",
        evidenceRequests:
            "To help with your case, please gather and retain all relevant documents: " +
            "the original notice, any letters or emails exchanged, photographs of signage or location, " +
            "and proof of any payments made.",
        nextSteps:
            "You may wish to review your case details and try again, or seek guidance from " +
            "an advisory service such as Citizens Advice. No action is required immediately " +
            "unless a deadline is approaching on your notice.",
        risksAndLimits:
            "This output was generated in safe mode due to a validation issue. " +
            "It does not constitute legal advice and makes no promises about outcomes. " +
            "All information should be independently verified. " +
            "Consider seeking professional legal advice for your specific circumstances.",
    },
} as const;

// ─── Helper Functions ────────────────────────────────────────────────────────

/**
 * Get user-facing error copy for a given error type.
 */
export function getErrorCopy(errorType: keyof typeof ERROR_COPY): ErrorCopy {
    return ERROR_COPY[errorType];
}

/**
 * Format an error response with consistent structure.
 */
export function formatErrorResponse(errorType: keyof typeof ERROR_COPY): {
    error: string;
    title: string;
    explanation: string;
    nextStep: string;
} {
    const copy = ERROR_COPY[errorType];
    return {
        error: copy.title,
        title: copy.title,
        explanation: copy.explanation,
        nextStep: copy.nextStep,
    };
}
