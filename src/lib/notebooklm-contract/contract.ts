/**
 * NotebookLM Contract v1 — Zod Schemas
 *
 * Strict schemas defining the exact shape of data flowing between
 * the Strategy Engine and NotebookLM.
 *
 * - NotebookLMInputSchema:  what the engine sends TO NotebookLM
 * - NotebookLMOutputSchema: what NotebookLM MUST return (strict — no extra keys)
 *
 * RULE: Strategy Engine DECIDES. NotebookLM DRAFTS + EXPLAINS only.
 * NotebookLM must never decide routing, eligibility, or outcomes.
 */

import { z } from "zod";

// ─── Configurable Limits ────────────────────────────────────────────

/** Maximum character length for any single output section. */
export const SECTION_MAX_CHARS = 2000;

/** Minimum character length for any single output section. */
export const SECTION_MIN_CHARS = 1;

// ─── Input Schema ───────────────────────────────────────────────────

const StrategyBlockSchema = z.object({
    selected_path: z.string(),
    selected_strategy: z.string(),
    strength_signal: z.enum(["STRONG", "MIXED", "WEAK"]),
    proceed_advice: z.enum(["PROCEED", "PROCEED_WITH_CAUTION", "DO_NOT_PROCEED"]),
    checklist: z.array(z.string()),
    fallbacks: z.array(z.string()),
    determinism: z.object({
        version: z.string(),
        rule_ids: z.array(z.string()),
    }),
});

const EvidenceBlockSchema = z.object({
    uploads: z.object({
        has_notice: z.boolean(),
        has_photos: z.boolean(),
        has_correspondence: z.boolean(),
        other: z.boolean(),
    }),
    evidence_flags: z.array(z.string()),
    extracted_text_available: z.boolean(),
});

const ConstraintsBlockSchema = z.object({
    approved_sources: z.array(z.string()),
    forbidden_language_profile: z.literal("motoring_v1"),
    tone_profile: z.literal("calm_authoritative"),
    jurisdiction: z.literal("UK"),
});

export const NotebookLMInputSchema = z.object({
    case_id: z.string().min(1),
    notice_type: z.enum(["COUNCIL_PCN", "PRIVATE_PARKING", "CAMERA_MATTER"]),
    user_intent: z.enum(["CHALLENGE", "AFFORDABILITY"]),
    strategy: StrategyBlockSchema,
    facts: z.record(z.string(), z.unknown()),
    evidence: EvidenceBlockSchema,
    constraints: ConstraintsBlockSchema,
});

/** TypeScript type inferred from the input schema. */
export type NotebookLMInput = z.infer<typeof NotebookLMInputSchema>;

// ─── Output Schema ──────────────────────────────────────────────────

const SectionSchema = z
    .string()
    .min(SECTION_MIN_CHARS, "Section must not be empty")
    .max(SECTION_MAX_CHARS, `Section must not exceed ${SECTION_MAX_CHARS} characters`);

const OutputMetadataSchema = z.object({
    contract_version: z.literal("v1"),
    generated_at_iso: z.string().min(1),
    safe_mode_used: z.boolean().optional(),
});

/**
 * The output schema is STRICT: no extra keys allowed at top level.
 * NotebookLM must return EXACTLY these 6 sections + metadata.
 */
export const NotebookLMOutputSchema = z
    .object({
        section_1_summary: SectionSchema,
        section_2_position: SectionSchema,
        section_3_reasoning: SectionSchema,
        section_4_evidence_requests: SectionSchema,
        section_5_next_steps: SectionSchema,
        section_6_risks_and_limits: SectionSchema,
        metadata: OutputMetadataSchema,
    })
    .strict();

/** TypeScript type inferred from the output schema. */
export type NotebookLMOutput = z.infer<typeof NotebookLMOutputSchema>;
