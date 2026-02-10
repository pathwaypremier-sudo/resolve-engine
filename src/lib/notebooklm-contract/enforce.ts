/**
 * NotebookLM Contract v1 — Runtime Enforcement (Phase N2)
 *
 * Fail-closed enforcement layer. Validates NotebookLM model output
 * against the v1 contract schema, scans for forbidden language,
 * and returns either validated output OR a deterministic safe fallback.
 *
 * RULE: If ANYTHING is invalid or unsafe → fallback. Never allow
 * unsafe output through.
 */

import {
    NotebookLMOutputSchema,
    SECTION_MAX_CHARS,
    type NotebookLMOutput,
} from "./contract";
import { containsForbiddenLanguage } from "./forbiddenLanguage";
import type {
    NotebookLMValidationFailureReason,
    NotebookLMFallbackMode,
} from "./types";

// ─── Section Keys ───────────────────────────────────────────────────

const SECTION_KEYS = [
    "section_1_summary",
    "section_2_position",
    "section_3_reasoning",
    "section_4_evidence_requests",
    "section_5_next_steps",
    "section_6_risks_and_limits",
] as const;

const EXPECTED_SECTION_COUNT = 6;

// ─── 1. Safe JSON Parser ────────────────────────────────────────────

/**
 * Parse a raw JSON string safely. Never uses eval.
 * Returns a discriminated union so callers can handle failure without try/catch.
 */
export function parseNotebookLMJson(
    raw: string
): { ok: true; value: unknown } | { ok: false; error: string } {
    try {
        const value: unknown = JSON.parse(raw);
        return { ok: true, value };
    } catch (err) {
        const message =
            err instanceof Error ? err.message : "Unknown JSON parse error";
        return { ok: false, error: message };
    }
}

// ─── 2. Output Validator ────────────────────────────────────────────

export type ValidationSuccess = { ok: true; output: NotebookLMOutput };
export type ValidationFailure = {
    ok: false;
    reason: NotebookLMValidationFailureReason;
    details?: string;
};
export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Multi-step strict validation of a parsed NotebookLM output object.
 *
 * Order:
 *   a) Zod strict schema parse
 *   b) Defensive section count check (exactly 6)
 *   c) Per-section length ≤ SECTION_MAX_CHARS
 *   d) Forbidden language scan on all sections + metadata.generated_at_iso
 */
export function validateNotebookLMOutput(raw: unknown): ValidationResult {
    // ── Step A: Zod strict schema validation ──
    const zodResult = NotebookLMOutputSchema.safeParse(raw);
    if (!zodResult.success) {
        const paths = zodResult.error.issues.map(
            (i) => `${i.path.join(".")}: ${i.message}`
        );
        return {
            ok: false,
            reason: "schema_invalid",
            details: `Zod validation failed: ${paths.join("; ")}`,
        };
    }

    const output = zodResult.data;

    // ── Step B: Defensive section count check ──
    const presentSections = SECTION_KEYS.filter(
        (k) => k in output && typeof output[k] === "string"
    );
    if (presentSections.length < EXPECTED_SECTION_COUNT) {
        return {
            ok: false,
            reason: "missing_sections",
            details: `Expected ${EXPECTED_SECTION_COUNT} sections, found ${presentSections.length}`,
        };
    }

    // Check for unexpected keys beyond the 6 sections + metadata
    const allowedKeys = new Set<string>([...SECTION_KEYS, "metadata"]);
    const extraKeys = Object.keys(output).filter((k) => !allowedKeys.has(k));
    if (extraKeys.length > 0) {
        return {
            ok: false,
            reason: "extra_sections",
            details: `Unexpected keys: ${extraKeys.join(", ")}`,
        };
    }

    // ── Step C: Section length checks ──
    for (const key of SECTION_KEYS) {
        const section = output[key];
        if (section.length > SECTION_MAX_CHARS) {
            return {
                ok: false,
                reason: "over_length",
                details: `${key} has ${section.length} chars (max ${SECTION_MAX_CHARS})`,
            };
        }
    }

    // ── Step D: Forbidden language scan ──
    // Scan all section content AND the generated_at_iso metadata field
    // (it's the only string metadata that could carry injected content)
    const textsToScan: string[] = SECTION_KEYS.map((k) => output[k]);
    textsToScan.push(output.metadata.generated_at_iso);

    for (let i = 0; i < textsToScan.length; i++) {
        const result = containsForbiddenLanguage(textsToScan[i]);
        if (result.hit) {
            const field =
                i < SECTION_KEYS.length
                    ? SECTION_KEYS[i]
                    : "metadata.generated_at_iso";
            return {
                ok: false,
                reason: "forbidden_language",
                details: `Forbidden language in ${field}: ${result.matches.join("; ")}`,
            };
        }
    }

    // ── All checks passed ──
    return { ok: true, output };
}

// ─── 3. Fallback Builder ────────────────────────────────────────────

/**
 * Build a deterministic safe fallback output.
 * No external calls. Produces EXACTLY 6 sections with ethical disclosure.
 */
export function buildFallbackOutput(
    mode: NotebookLMFallbackMode,
    reason: NotebookLMValidationFailureReason
): NotebookLMOutput {
    if (mode === "DO_NOT_PROCEED_NOTICE") {
        return {
            section_1_summary:
                "The automated analysis could not produce a validated output for this case. " +
                "This does not reflect on the merits of your situation.",
            section_2_position:
                "We are unable to provide a position assessment at this time. " +
                "The system has determined that proceeding without professional review would not be appropriate.",
            section_3_reasoning:
                "The analysis output did not meet the required safety and quality standards. " +
                `Validation failure reason: ${reason}. ` +
                "This is a precautionary measure to ensure you receive accurate information.",
            section_4_evidence_requests:
                "Please retain all documents related to your case, including the original notice, " +
                "any correspondence, photographs, and receipts. These may be needed for professional review.",
            section_5_next_steps:
                "We recommend seeking independent legal advice or contacting a relevant advisory service " +
                "such as Citizens Advice (England & Wales) before taking any further action on this matter.",
            section_6_risks_and_limits:
                "This output was generated in safe mode due to a validation failure. " +
                "It does not constitute legal advice and makes no promises about outcomes. " +
                "Parking and motoring matters can have financial and legal consequences. " +
                "Always verify information independently and consider seeking professional legal advice.",
            metadata: {
                contract_version: "v1",
                generated_at_iso: new Date().toISOString(),
                safe_mode_used: true,
            },
        };
    }

    // Default: SAFE_EXPLANATION_ONLY
    return {
        section_1_summary:
            "The automated analysis was unable to produce a fully validated result. " +
            "A safe explanation has been generated instead.",
        section_2_position:
            "Based on the information available, a detailed position could not be determined. " +
            "This may be due to incomplete data or a processing issue, not a reflection of your case merits.",
        section_3_reasoning:
            "The system applies strict validation to all generated content to ensure accuracy and safety. " +
            `The output did not pass validation (reason: ${reason}). ` +
            "This safe fallback has been provided to ensure you are not given unverified information.",
        section_4_evidence_requests:
            "To help with your case, please gather and retain all relevant documents: " +
            "the original notice, any letters or emails exchanged, photographs of signage or location, " +
            "and proof of any payments made.",
        section_5_next_steps:
            "You may wish to review your case details and try again, or seek guidance from " +
            "an advisory service such as Citizens Advice. No action is required immediately " +
            "unless a deadline is approaching on your notice.",
        section_6_risks_and_limits:
            "This output was generated in safe mode due to a validation failure. " +
            "It does not constitute legal advice and makes no promises about outcomes. " +
            "All information should be independently verified. " +
            "Consider seeking professional legal advice for your specific circumstances.",
        metadata: {
            contract_version: "v1",
            generated_at_iso: new Date().toISOString(),
            safe_mode_used: true,
        },
    };
}

// ─── 4. Top-Level Enforcement Orchestrator ──────────────────────────

export type EnforcementResult = {
    output: NotebookLMOutput;
    safe_mode_used: boolean;
    reason?: NotebookLMValidationFailureReason;
};

/**
 * Top-level enforcement: parse JSON → validate → return valid output or fallback.
 *
 * This function NEVER throws. It always returns a usable NotebookLMOutput.
 * If anything fails, it returns a deterministic safe fallback.
 */
export function enforceNotebookLMContract(
    rawModelOutputText: string,
    fallbackMode: NotebookLMFallbackMode = "SAFE_EXPLANATION_ONLY"
): EnforcementResult {
    // Step 1: Parse JSON
    const parsed = parseNotebookLMJson(rawModelOutputText);
    if (!parsed.ok) {
        return {
            output: buildFallbackOutput(fallbackMode, "schema_invalid"),
            safe_mode_used: true,
            reason: "schema_invalid",
        };
    }

    // Step 2: Validate
    const validated = validateNotebookLMOutput(parsed.value);
    if (!validated.ok) {
        return {
            output: buildFallbackOutput(fallbackMode, validated.reason),
            safe_mode_used: true,
            reason: validated.reason,
        };
    }

    // Step 3: All checks passed — return validated output
    return {
        output: validated.output,
        safe_mode_used: false,
    };
}
