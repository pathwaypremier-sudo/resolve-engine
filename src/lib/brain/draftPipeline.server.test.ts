import { describe, it, expect } from "vitest";
import fs from "fs";
import { runDraftPipeline } from "./draftPipeline.server";
import {
    VALID_NOTEBOOKLM_OUTPUT_JSON,
    INVALID_NOTEBOOKLM_OUTPUT_JSON,
    FORBIDDEN_LANGUAGE_OUTPUT_JSON,
} from "./__tests__/sampleNotebookLMOutput";
import { NotebookLMInputSchema } from "@/lib/notebooklm-contract";

describe("runDraftPipeline (Phase N5)", () => {
    const validStrategy = {
        selected_path: "path_1",
        selected_strategy: "strategy_A",
        strength_signal: "STRONG" as const,
        proceed_advice: "PROCEED" as const,
        checklist: ["check_item_1"],
        fallbacks: ["fallback_item_1"],
        determinism: {
            version: "v1",
            rule_ids: ["rule_1"],
        },
    };

    const baseArgs = {
        case_id: "test_case_123",
        notice_type: "COUNCIL_PCN" as const,
        user_intent: "CHALLENGE" as const,
        strategy: validStrategy,
    };

    it("should process valid input and valid output correctly", () => {
        const result = runDraftPipeline({
            ...baseArgs,
            rawModelOutputText: VALID_NOTEBOOKLM_OUTPUT_JSON,
        });

        // 1. Check NotebookLM Input
        expect(result.notebookInput).toBeDefined();
        // Verify schema validity of the constructed input
        const inputValidation = NotebookLMInputSchema.safeParse(result.notebookInput);
        expect(inputValidation.success).toBe(true);
        expect(result.notebookInput.case_id).toBe("test_case_123");

        // 2. Check Safe Output
        expect(result.safeOutput).toBeDefined();
        expect(result.safe_mode_used).toBe(false);
        expect(result.reason).toBeUndefined();
        expect(result.safeOutput.section_1_summary).toContain("This is the summary");
    });

    it("should fallback when output is invalid JSON", () => {
        const result = runDraftPipeline({
            ...baseArgs,
            rawModelOutputText: "{ invalid json: ",
        });

        expect(result.safe_mode_used).toBe(true);
        expect(result.reason).toBe("schema_invalid");
        // Should contain fallback text
        expect(result.safeOutput.section_1_summary).toContain("unable to produce");
    });

    it("should fallback when output is missing sections", () => {
        const result = runDraftPipeline({
            ...baseArgs,
            rawModelOutputText: INVALID_NOTEBOOKLM_OUTPUT_JSON,
        });

        expect(result.safe_mode_used).toBe(true);
        // It might be schema_invalid or missing_sections depending on implementation details of enforce
        // but it should definitely use safe mode.
        // Schema validation usually catches missing keys first.
        expect(["schema_invalid", "missing_sections"]).toContain(result.reason);
    });

    it("should fallback when output contains forbidden language", () => {
        const result = runDraftPipeline({
            ...baseArgs,
            rawModelOutputText: FORBIDDEN_LANGUAGE_OUTPUT_JSON,
        });

        expect(result.safe_mode_used).toBe(true);
        expect(result.reason).toBe("forbidden_language");
    });

    it("should accept optional facts and evidence", () => {
        const result = runDraftPipeline({
            ...baseArgs,
            facts: { vehicle_make: "Ford" },
            evidence: {
                uploads: {
                    has_photos: true,
                    has_notice: false,
                    has_correspondence: false,
                    other: false
                }
            },
            rawModelOutputText: VALID_NOTEBOOKLM_OUTPUT_JSON,
        });

        expect(result.notebookInput.facts.vehicle_make).toBe("Ford");
        expect(result.notebookInput.evidence.uploads.has_photos).toBe(true);
        // Default should be false
        expect(result.notebookInput.evidence.uploads.has_notice).toBe(false);
    });
});
