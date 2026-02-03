
import { CASE_STORAGE_SCHEMA } from "./schema";

export type StorageWarning = {
    key: string;
    message: string;
    can_reset: boolean;
};

export type StorageValidationResult = {
    warnings: StorageWarning[];
    stats: {
        keys_present: number;
        keys_expected: number;
    };
};

/**
 * Validates localStorage data for a specific case against the known schema.
 * Non-blocking; returns warnings only.
 */
export function validateCaseStorage(caseId: string): StorageValidationResult {
    const warnings: StorageWarning[] = [];
    let presentCount = 0;
    const expectedKeys = Object.keys(CASE_STORAGE_SCHEMA);

    if (typeof window === "undefined") {
        return { warnings: [{ key: "ssr", message: "Validation unavailable (SSR)", can_reset: false }], stats: { keys_present: 0, keys_expected: expectedKeys.length } };
    }

    // Helper to read and validate
    for (const [shortKey, def] of Object.entries(CASE_STORAGE_SCHEMA)) {
        const fullKey = def.keyTemplate.replace("{id}", caseId);
        const value = localStorage.getItem(fullKey);

        if (value !== null) {
            presentCount++;

            // Only specific keys are allowed for "reset" (self-heal)
            // Explicitly: timeline_facts, contact_method
            const isResettable = shortKey === "timeline_facts" || shortKey === "contact_method";

            // Type Checks
            if (def.expectedType === "json_array") {
                try {
                    const parsed = JSON.parse(value);
                    if (!Array.isArray(parsed)) {
                        warnings.push({
                            key: fullKey,
                            message: `Key '${shortKey}' expected array, got ${typeof parsed}`,
                            can_reset: isResettable
                        });
                    }
                } catch (e) {
                    warnings.push({
                        key: fullKey,
                        message: `Key '${shortKey}' contains malformed JSON`,
                        can_reset: isResettable
                    });
                }
            } else if (def.expectedType === "json_object") {
                try {
                    const parsed = JSON.parse(value);
                    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
                        warnings.push({
                            key: fullKey,
                            message: `Key '${shortKey}' expected object`,
                            can_reset: isResettable
                        });
                    }
                } catch (e) {
                    warnings.push({
                        key: fullKey,
                        message: `Key '${shortKey}' contains malformed JSON`,
                        can_reset: isResettable
                    });
                }
            } else if (def.expectedType === "boolean_string") {
                if (value !== "0" && value !== "1" && value !== "true" && value !== "false") {
                    // Loose check, just advisory
                }
            }

            // Content Checks (Specific)
            if (shortKey === "dispute_type" && !value.trim()) {
                warnings.push({
                    key: fullKey,
                    message: "Dispute type is empty",
                    can_reset: false // Core keys cannot be deleted casually
                });
            }
        } else {
            // Missing checks
            if (def.requiredForAssessment) {
                warnings.push({
                    key: fullKey,
                    message: `Missing required key: '${shortKey}'`,
                    can_reset: false
                });
            }
        }
    }

    // Cross-field logic (example)
    const intakeSubKey = CASE_STORAGE_SCHEMA["intake_submitted"].keyTemplate.replace("{id}", caseId);
    const isIntakeSubmitted = localStorage.getItem(intakeSubKey) === "1";

    if (isIntakeSubmitted) {
        // If submitted, we expect issuer/reference ideally, though not strictly forcing validation failure.
        const refKey = CASE_STORAGE_SCHEMA["reference"].keyTemplate.replace("{id}", caseId);
        if (!localStorage.getItem(refKey)) {
            warnings.push({
                key: refKey,
                message: "Intake submitted but 'reference' missing",
                can_reset: false
            });
        }
    }

    return {
        warnings,
        stats: {
            keys_present: presentCount,
            keys_expected: expectedKeys.length
        }
    };
}
