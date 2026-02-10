import { describe, it, expect } from "vitest";
import { buildMinimumNotebookLMPack } from "./minimumInputPack";
import { loadGoldenCaseFixtureV1 } from "./fixtures/goldenCaseFixture";
import { NotebookLMInputSchema } from "@/lib/notebooklm-contract";

describe("buildMinimumNotebookLMPack", () => {
    it("builds a valid pack with absolutely minimal arguments", () => {
        const result = buildMinimumNotebookLMPack({
            notice_type: "COUNCIL_PCN",
            user_intent: "CHALLENGE",
            strategy: {
                selected_path: "path_test",
                selected_strategy: "strategy_test",
                strength_signal: "WEAK",
                proceed_advice: "DO_NOT_PROCEED",
                determinism: {
                    version: "1.0.0",
                    rule_ids: ["rule_1"]
                }
            }
        });

        // 1. Zod schema validation
        const parsed = NotebookLMInputSchema.safeParse(result);
        expect(parsed.success).toBe(true);

        // 2. Check defaults
        expect(result.case_id).toBe("case_unknown");
        expect(result.facts).toEqual({});
        expect(result.evidence.uploads.has_notice).toBe(false);
        expect(result.constraints.jurisdiction).toBe("UK");
        expect(result.strategy.checklist).toEqual([]);
    });

    it("wires the golden fixture correctly", () => {
        // Load fixture data (simulated upload flow)
        const fixture = loadGoldenCaseFixtureV1();

        // Ensure fixture actually loaded what we expect
        expect(fixture.notice_present).toBe(true);
        expect(fixture.circumstances_text).toContain("elderly mother");

        // Build pack using fixture data
        const result = buildMinimumNotebookLMPack({
            case_id: "case_golden_v1",
            notice_type: "PRIVATE_PARKING",
            user_intent: "AFFORDABILITY",
            facts: {
                circumstances: fixture.circumstances_text
            },
            evidence: {
                uploads: {
                    has_notice: fixture.notice_present,
                    has_photos: fixture.photos_present,
                    has_correspondence: false,
                    other: fixture.id_present
                }
            },
            strategy: {
                selected_path: "private_parking_affordability",
                selected_strategy: "request_plan",
                strength_signal: "MIXED",
                proceed_advice: "PROCEED_WITH_CAUTION",
                determinism: {
                    version: "v1_fixture",
                    rule_ids: ["fixture_rule"]
                }
            }
        });

        // Validate
        const parsed = NotebookLMInputSchema.safeParse(result);
        expect(parsed.success).toBe(true);

        expect(result.evidence.uploads.has_notice).toBe(true);
        expect(result.evidence.uploads.has_photos).toBe(true);
        expect(result.evidence.uploads.other).toBe(true); // ID mapped to 'other'
        expect(result.facts["circumstances"]).toContain("elderly mother");
        expect(result.case_id).toBe("case_golden_v1");
    });

    it("overrides defaults when provided", () => {
        const result = buildMinimumNotebookLMPack({
            notice_type: "CAMERA_MATTER",
            user_intent: "CHALLENGE",
            approved_sources: ["CUSTOM_SOURCE"],
            strategy: {
                selected_path: "p",
                selected_strategy: "s",
                strength_signal: "STRONG",
                proceed_advice: "PROCEED",
                checklist: ["check_1"],
                determinism: { version: "1", rule_ids: [] }
            }
        });

        expect(result.constraints.approved_sources).toEqual(["CUSTOM_SOURCE"]);
        expect(result.strategy.checklist).toEqual(["check_1"]);
    });
});
