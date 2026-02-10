
import { describe, it, expect } from "vitest";
import { buildNotebookLMPromptV1, NotebookLMPromptArgs } from "./promptBuilder";

describe("buildNotebookLMPromptV1", () => {
    const validArgs: NotebookLMPromptArgs = {
        contract_version: "v1",
        notice_type: "COUNCIL_PCN",
        user_intent: "CHALLENGE",
        strategy_summary: {
            selected_path: "path_A",
            selected_strategy: "EVIDENCE_FIRST",
            strength_signal: "STRONG",
            proceed_advice: "PROCEED",
        },
        approved_sources_labels: ["case-summary.md", "evidence-index.md", "evidence-merged.txt"],
    };

    it("should generate a strict JSON prompt", () => {
        const prompt = buildNotebookLMPromptV1(validArgs);

        expect(prompt).toContain("MUST return output in STRICT JSON format");
        expect(prompt).toContain("JSON ONLY");
        expect(prompt).toContain("{");
        expect(prompt).toContain("metadata");
        expect(prompt).toContain("section_1_summary");
        expect(prompt).toContain("section_6_risks_and_limits");
    });

    it("should include safety rules", () => {
        const prompt = buildNotebookLMPromptV1(validArgs);

        expect(prompt).toContain("NO guarantees of success");
        expect(prompt).toContain("NO threats");
    });

    it("should enforce authorized sources", () => {
        const prompt = buildNotebookLMPromptV1(validArgs);

        expect(prompt).toContain("Use ONLY the provided sources");
        expect(prompt).toContain("case-summary.md");
    });

    it("should declare strategy explicitly (Sacred Split)", () => {
        const prompt = buildNotebookLMPromptV1(validArgs);

        expect(prompt).toContain("You do NOT decide strategy");
        expect(prompt).toContain("EVIDENCE_FIRST"); // selected strategy
        expect(prompt).toContain("STRONG"); // strength
    });

    it("should include version in metadata", () => {
        const prompt = buildNotebookLMPromptV1(validArgs);

        expect(prompt).toContain('"contract_version": "v1"');
    });
});
