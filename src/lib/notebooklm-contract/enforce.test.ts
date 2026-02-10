import { describe, it, expect } from "vitest";
import {
    parseNotebookLMJson,
    validateNotebookLMOutput,
    buildFallbackOutput,
    enforceNotebookLMContract,
} from "./enforce";
import { SECTION_MAX_CHARS } from "./contract";
import { containsForbiddenLanguage } from "./forbiddenLanguage";

// ─── Fixtures ───────────────────────────────────────────────────────

function validOutput() {
    return {
        section_1_summary: "Summary of the case position.",
        section_2_position: "Your position is strong based on NTK timing.",
        section_3_reasoning: "The operator failed to issue within 14 days.",
        section_4_evidence_requests: "Gather the original NTK letter.",
        section_5_next_steps: "Submit your appeal to POPLA within 28 days.",
        section_6_risks_and_limits:
            "The operator may escalate. This is not legal advice.",
        metadata: {
            contract_version: "v1" as const,
            generated_at_iso: "2026-02-10T00:00:00.000Z",
        },
    };
}

function validOutputJson(): string {
    return JSON.stringify(validOutput());
}

// ─── parseNotebookLMJson ────────────────────────────────────────────

describe("parseNotebookLMJson", () => {
    it("parses valid JSON", () => {
        const result = parseNotebookLMJson('{"a":1}');
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.value).toEqual({ a: 1 });
        }
    });

    it("returns error for invalid JSON", () => {
        const result = parseNotebookLMJson("not json at all {{{");
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.error).toBeTruthy();
        }
    });

    it("returns error for empty string", () => {
        const result = parseNotebookLMJson("");
        expect(result.ok).toBe(false);
    });
});

// ─── validateNotebookLMOutput ───────────────────────────────────────

describe("validateNotebookLMOutput", () => {
    it("accepts a valid output object", () => {
        const result = validateNotebookLMOutput(validOutput());
        expect(result.ok).toBe(true);
        if (result.ok) {
            expect(result.output.section_1_summary).toBe(
                "Summary of the case position."
            );
        }
    });

    it("rejects output missing a section (schema_invalid)", () => {
        const output = validOutput();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (output as any).section_5_next_steps;
        const result = validateNotebookLMOutput(output);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe("schema_invalid");
        }
    });

    it("rejects output with extra unexpected key (schema_invalid via strict)", () => {
        const output = {
            ...validOutput(),
            section_7_bonus: "Should not exist",
        };
        const result = validateNotebookLMOutput(output);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe("schema_invalid");
        }
    });

    it("rejects output with over-length section", () => {
        const output = {
            ...validOutput(),
            section_1_summary: "x".repeat(SECTION_MAX_CHARS + 1),
        };
        const result = validateNotebookLMOutput(output);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            // Zod catches this too since max is in schema, but reason should indicate the issue
            expect(["over_length", "schema_invalid"]).toContain(result.reason);
        }
    });

    it("rejects output with forbidden language in a section", () => {
        const output = {
            ...validOutput(),
            section_2_position: "We guarantee you will win this case.",
        };
        const result = validateNotebookLMOutput(output);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe("forbidden_language");
        }
    });

    it("rejects output with forbidden language in section_6", () => {
        const output = {
            ...validOutput(),
            section_6_risks_and_limits:
                "This is your final warning before we proceed.",
        };
        const result = validateNotebookLMOutput(output);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe("forbidden_language");
        }
    });

    it("rejects null input", () => {
        const result = validateNotebookLMOutput(null);
        expect(result.ok).toBe(false);
        if (!result.ok) {
            expect(result.reason).toBe("schema_invalid");
        }
    });
});

// ─── buildFallbackOutput ────────────────────────────────────────────

describe("buildFallbackOutput", () => {
    it("produces exactly 6 sections + metadata (SAFE_EXPLANATION_ONLY)", () => {
        const output = buildFallbackOutput(
            "SAFE_EXPLANATION_ONLY",
            "schema_invalid"
        );
        expect(output.section_1_summary).toBeTruthy();
        expect(output.section_2_position).toBeTruthy();
        expect(output.section_3_reasoning).toBeTruthy();
        expect(output.section_4_evidence_requests).toBeTruthy();
        expect(output.section_5_next_steps).toBeTruthy();
        expect(output.section_6_risks_and_limits).toBeTruthy();
        expect(output.metadata.contract_version).toBe("v1");
        expect(output.metadata.safe_mode_used).toBe(true);
        expect(output.metadata.generated_at_iso).toBeTruthy();
    });

    it("produces exactly 6 sections + metadata (DO_NOT_PROCEED_NOTICE)", () => {
        const output = buildFallbackOutput(
            "DO_NOT_PROCEED_NOTICE",
            "forbidden_language"
        );
        expect(output.section_1_summary).toBeTruthy();
        expect(output.section_2_position).toBeTruthy();
        expect(output.section_3_reasoning).toBeTruthy();
        expect(output.section_4_evidence_requests).toBeTruthy();
        expect(output.section_5_next_steps).toBeTruthy();
        expect(output.section_6_risks_and_limits).toBeTruthy();
        expect(output.metadata.contract_version).toBe("v1");
        expect(output.metadata.safe_mode_used).toBe(true);
    });

    it("includes the failure reason in section_3_reasoning", () => {
        const output = buildFallbackOutput(
            "SAFE_EXPLANATION_ONLY",
            "over_length"
        );
        expect(output.section_3_reasoning).toContain("over_length");
    });

    it("never contains forbidden language itself", () => {
        for (const mode of [
            "SAFE_EXPLANATION_ONLY",
            "DO_NOT_PROCEED_NOTICE",
        ] as const) {
            const output = buildFallbackOutput(mode, "schema_invalid");
            const allText = [
                output.section_1_summary,
                output.section_2_position,
                output.section_3_reasoning,
                output.section_4_evidence_requests,
                output.section_5_next_steps,
                output.section_6_risks_and_limits,
            ].join(" ");
            const check = containsForbiddenLanguage(allText);
            expect(check.hit).toBe(false);
        }
    });

    it("fallback output itself passes schema validation", () => {
        const output = buildFallbackOutput(
            "SAFE_EXPLANATION_ONLY",
            "schema_invalid"
        );
        const result = validateNotebookLMOutput(output);
        expect(result.ok).toBe(true);
    });
});

// ─── enforceNotebookLMContract ──────────────────────────────────────

describe("enforceNotebookLMContract", () => {
    it("returns valid output with safe_mode_used=false for valid JSON", () => {
        const result = enforceNotebookLMContract(validOutputJson());
        expect(result.safe_mode_used).toBe(false);
        expect(result.reason).toBeUndefined();
        expect(result.output.section_1_summary).toBe(
            "Summary of the case position."
        );
    });

    it("returns fallback for invalid JSON", () => {
        const result = enforceNotebookLMContract("this is not json");
        expect(result.safe_mode_used).toBe(true);
        expect(result.reason).toBe("schema_invalid");
        expect(result.output.metadata.safe_mode_used).toBe(true);
        expect(result.output.metadata.contract_version).toBe("v1");
    });

    it("returns fallback for missing section", () => {
        const output = validOutput();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (output as any).section_3_reasoning;
        const result = enforceNotebookLMContract(JSON.stringify(output));
        expect(result.safe_mode_used).toBe(true);
        expect(result.reason).toBe("schema_invalid");
    });

    it("returns fallback for forbidden language", () => {
        const output = {
            ...validOutput(),
            section_1_summary: "We guarantee you will definitely win.",
        };
        const result = enforceNotebookLMContract(JSON.stringify(output));
        expect(result.safe_mode_used).toBe(true);
        expect(result.reason).toBe("forbidden_language");
    });

    it("returns fallback for over-length section", () => {
        const output = {
            ...validOutput(),
            section_2_position: "x".repeat(SECTION_MAX_CHARS + 1),
        };
        const result = enforceNotebookLMContract(JSON.stringify(output));
        expect(result.safe_mode_used).toBe(true);
        // Zod catches length in schema, so reason is schema_invalid
        expect(["over_length", "schema_invalid"]).toContain(result.reason);
    });

    it("respects fallbackMode override to DO_NOT_PROCEED_NOTICE", () => {
        const result = enforceNotebookLMContract(
            "bad json",
            "DO_NOT_PROCEED_NOTICE"
        );
        expect(result.safe_mode_used).toBe(true);
        // DO_NOT_PROCEED content mentions "professional review"
        expect(result.output.section_2_position).toContain(
            "professional review"
        );
    });

    it("defaults fallbackMode to SAFE_EXPLANATION_ONLY", () => {
        const result = enforceNotebookLMContract("bad json");
        expect(result.safe_mode_used).toBe(true);
        // SAFE_EXPLANATION content mentions "safe explanation"
        expect(result.output.section_1_summary).toContain("safe explanation");
    });
});
