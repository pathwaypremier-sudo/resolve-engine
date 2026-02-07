
import { generateNotebookLMPack } from "../src/lib/notebooklm/generateNotebookLMPack";
import { runAssessment } from "../src/lib/assessment/runAssessment";
import type { AssessmentInput } from "../src/lib/assessment/AssessmentInput";
import assert from "assert";

/**
 * Standalone verification for NotebookLM Pack generation logic.
 * Checks that the generateNotebookLMPack function returns correct structure and content.
 */

const mockInput: AssessmentInput = {
    caseId: "test-case-123",
    disputeType: "parking_private_land",
    generatedAtISO: new Date().toISOString(),
    facts: {
        pcnNumber: { value: "PCN123", source: "questionnaire" },
        issuer: { value: "ParkingEye", source: "extracted" },
        issueDate: { value: "2023-01-01", source: "extracted" },
        // ... include minimal other fields
        vrn: { value: null, source: "none" },
        location: { value: null, source: "none" },
        contraventionType: { value: null, source: "none" },
        disputeType: { value: "parking_private_land", source: "questionnaire" },
        eventDate: { value: null, source: "none" },
        amountDue: { value: null, source: "none" },
        reference: { value: null, source: "none" },
        noticeType: { value: null, source: "none" },
        issueTime: { value: null, source: "none" }
    },
    evidence: {
        caseId: "test-case-123",
        docs: [
            { id: "doc1", text: "Notice to Keeper content here...", provenance: "OCR" }
        ],
        combinedText: "Notice to Keeper content here...",
        combinedFacts: {}
    },
    rawAnswers: {}
};

async function test_notebookLMPack() {
    console.log("Starting NotebookLM Pack verification...");

    // 1. Run Assessment first (dependency)
    const result = await runAssessment(mockInput);

    // 2. Generate Pack
    const pack = generateNotebookLMPack(mockInput, result);

    // 3. Verify Files
    console.log("Verifying pack file structure...");

    assert(pack["case-summary.md"], "case-summary.md missing");
    assert(pack["evidence-index.md"], "evidence-index.md missing");
    assert(pack["evidence-merged.txt"], "evidence-merged.txt missing");

    // 4. Verify Content
    console.log("Verifying content sanity...");

    assert(pack["case-summary.md"].includes("PCN123"), "Summary should contain PCN number");
    assert(pack["evidence-merged.txt"].includes("Notice to Keeper"), "Merged text should contain doc text");

    console.log("✓ NotebookLM Pack verification passed!");
}

test_notebookLMPack().catch(err => {
    console.error("Test Failed:", err);
    process.exit(1);
});
