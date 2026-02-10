export const VALID_NOTEBOOKLM_OUTPUT_JSON = JSON.stringify({
    metadata: {
        contract_version: "v1",
        generated_at_iso: "2024-01-01T00:00:00Z",
        safe_mode_used: false,
    },
    section_1_summary: "This is the summary of the case.",
    section_2_position: "The position is that the contravention did not occur.",
    section_3_reasoning: "The signage was inadequate and obscure.",
    section_4_evidence_requests: "Please provide photos of the signage.",
    section_5_next_steps: "Submit the appeal online.",
    section_6_risks_and_limits: "The council may reject the appeal."
});

export const INVALID_NOTEBOOKLM_OUTPUT_JSON = JSON.stringify({
    metadata: {
        contract_version: "v1",
        generated_at_iso: "2024-01-01T00:00:00Z",
        safe_mode_used: false,
    },
    section_1_summary: "This is the summary of the case.",
    // Missing other sections
});

export const FORBIDDEN_LANGUAGE_OUTPUT_JSON = JSON.stringify({
    metadata: {
        contract_version: "v1",
        generated_at_iso: "2024-01-01T00:00:00Z",
        safe_mode_used: false,
    },
    section_1_summary: "This uses forbidden language: must pay immediately.",
    section_2_position: "The position is that the contravention did not occur.",
    section_3_reasoning: "The signage was inadequate and obscure.",
    section_4_evidence_requests: "Please provide photos of the signage.",
    section_5_next_steps: "Submit the appeal online.",
    section_6_risks_and_limits: "The council may reject the appeal."
});
