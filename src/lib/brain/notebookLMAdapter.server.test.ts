import { describe, it, expect } from "vitest";
import { getSafeNotebookLMOutput } from "./notebookLMAdapter.server";

// ─── Fixture ────────────────────────────────────────────────────────

function validOutputJson(): string {
    return JSON.stringify({
        section_1_summary: "Summary of the case position.",
        section_2_position: "Your position is strong based on NTK timing.",
        section_3_reasoning: "The operator failed to issue within 14 days.",
        section_4_evidence_requests: "Gather the original NTK letter.",
        section_5_next_steps: "Submit your appeal to POPLA within 28 days.",
        section_6_risks_and_limits:
            "The operator may escalate. This is not legal advice.",
        metadata: {
            contract_version: "v1",
            generated_at_iso: "2026-02-10T00:00:00.000Z",
        },
    });
}

// ─── Integration Tests ──────────────────────────────────────────────

describe("getSafeNotebookLMOutput", () => {
    it("passes valid model output through unchanged", () => {
        const result = getSafeNotebookLMOutput(validOutputJson());
        expect(result.safe_mode_used).toBe(false);
        expect(result.reason).toBeUndefined();
        expect(result.output.section_1_summary).toBe(
            "Summary of the case position."
        );
        expect(result.output.metadata.contract_version).toBe("v1");
    });

    it("returns fallback for invalid JSON", () => {
        const result = getSafeNotebookLMOutput("this is not valid json");
        expect(result.safe_mode_used).toBe(true);
        expect(result.reason).toBeDefined();
        expect(result.output.metadata.safe_mode_used).toBe(true);
        expect(result.output.metadata.contract_version).toBe("v1");
        // All 6 sections must be present in fallback
        expect(result.output.section_1_summary).toBeTruthy();
        expect(result.output.section_6_risks_and_limits).toBeTruthy();
    });

    it("returns fallback with reason 'forbidden_language' for unsafe content", () => {
        const unsafeOutput = JSON.stringify({
            section_1_summary: "We guarantee you will win this case.",
            section_2_position: "Your position is strong.",
            section_3_reasoning: "The operator failed to comply.",
            section_4_evidence_requests: "Gather the original NTK letter.",
            section_5_next_steps: "Submit your appeal.",
            section_6_risks_and_limits: "This is not legal advice.",
            metadata: {
                contract_version: "v1",
                generated_at_iso: "2026-02-10T00:00:00.000Z",
            },
        });

        const result = getSafeNotebookLMOutput(unsafeOutput);
        expect(result.safe_mode_used).toBe(true);
        expect(result.reason).toBe("forbidden_language");
        expect(result.output.metadata.safe_mode_used).toBe(true);
    });
});
