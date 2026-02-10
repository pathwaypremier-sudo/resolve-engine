import { describe, it, expect } from "vitest";
import {
    NotebookLMInputSchema,
    NotebookLMOutputSchema,
    SECTION_MAX_CHARS,
    containsForbiddenLanguage,
} from "./index";

// ─── Fixtures ───────────────────────────────────────────────────────

function validInput() {
    return {
        case_id: "case-abc-123",
        notice_type: "PRIVATE_PARKING" as const,
        user_intent: "CHALLENGE" as const,
        strategy: {
            selected_path: "private_parking_challenge",
            selected_strategy: "KEEPER_LIABILITY_CHALLENGE",
            strength_signal: "STRONG" as const,
            proceed_advice: "PROCEED" as const,
            checklist: ["Gather NTK evidence", "Check timing"],
            fallbacks: ["Request payment plan"],
            determinism: {
                version: "1.0.0",
                rule_ids: ["rule_ntk_timing", "rule_keeper_liability"],
            },
        },
        facts: {
            pcnNumber: "ABC123",
            issuer: "ParkingEye",
            eventDate: "2026-01-15",
        },
        evidence: {
            uploads: {
                has_notice: true,
                has_photos: false,
                has_correspondence: false,
                other: false,
            },
            evidence_flags: ["notice_uploaded"],
            extracted_text_available: false,
        },
        constraints: {
            approved_sources: ["BPA_CODE_2024", "POFA_2012"],
            forbidden_language_profile: "motoring_v1" as const,
            tone_profile: "calm_authoritative" as const,
            jurisdiction: "UK" as const,
        },
    };
}

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

// ─── Input Schema Tests ─────────────────────────────────────────────

describe("NotebookLMInputSchema", () => {
    it("accepts a valid input", () => {
        const result = NotebookLMInputSchema.safeParse(validInput());
        expect(result.success).toBe(true);
    });

    it("rejects input with missing case_id", () => {
        const input = validInput();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (input as any).case_id;
        const result = NotebookLMInputSchema.safeParse(input);
        expect(result.success).toBe(false);
    });

    it("rejects input with invalid notice_type", () => {
        const input = { ...validInput(), notice_type: "TRAFFIC_FINE" };
        const result = NotebookLMInputSchema.safeParse(input);
        expect(result.success).toBe(false);
    });
});

// ─── Output Schema Tests ────────────────────────────────────────────

describe("NotebookLMOutputSchema", () => {
    it("accepts a valid output", () => {
        const result = NotebookLMOutputSchema.safeParse(validOutput());
        expect(result.success).toBe(true);
    });

    it("rejects output missing a section (section_5_next_steps)", () => {
        const output = validOutput();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (output as any).section_5_next_steps;
        const result = NotebookLMOutputSchema.safeParse(output);
        expect(result.success).toBe(false);
        if (!result.success) {
            const paths = result.error.issues.map((i) => i.path.join("."));
            expect(paths).toContain("section_5_next_steps");
        }
    });

    it("rejects output with an extra unexpected key (strict mode)", () => {
        const output = {
            ...validOutput(),
            section_7_extra: "This should not exist",
        };
        const result = NotebookLMOutputSchema.safeParse(output);
        expect(result.success).toBe(false);
    });

    it("rejects output where a section exceeds max length", () => {
        const output = {
            ...validOutput(),
            section_1_summary: "x".repeat(SECTION_MAX_CHARS + 1),
        };
        const result = NotebookLMOutputSchema.safeParse(output);
        expect(result.success).toBe(false);
    });

    it("rejects output with empty section", () => {
        const output = { ...validOutput(), section_3_reasoning: "" };
        const result = NotebookLMOutputSchema.safeParse(output);
        expect(result.success).toBe(false);
    });

    it("rejects output with wrong contract_version", () => {
        const output = {
            ...validOutput(),
            metadata: { ...validOutput().metadata, contract_version: "v2" },
        };
        const result = NotebookLMOutputSchema.safeParse(output);
        expect(result.success).toBe(false);
    });
});

// ─── Forbidden Language Tests ───────────────────────────────────────

describe("containsForbiddenLanguage", () => {
    it("detects a forbidden phrase", () => {
        const result = containsForbiddenLanguage(
            "We guaranteed you will win this case."
        );
        expect(result.hit).toBe(true);
        expect(result.matches.length).toBeGreaterThan(0);
    });

    it("detects forbidden pattern (threat language)", () => {
        const result = containsForbiddenLanguage(
            "This is your final warning before legal action."
        );
        expect(result.hit).toBe(true);
    });

    it("returns hit=false for clean text", () => {
        const result = containsForbiddenLanguage(
            "Based on the available evidence, your case has merit. We recommend proceeding with a calm, factual appeal."
        );
        expect(result.hit).toBe(false);
    });

    it("is case-insensitive for phrases", () => {
        const result = containsForbiddenLanguage("GUARANTEED outcome for you.");
        expect(result.hit).toBe(true);
    });
});
