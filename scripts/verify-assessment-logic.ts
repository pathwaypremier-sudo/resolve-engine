
import { runAssessment } from "../src/lib/assessment/runAssessment";
import type { AssessmentInput } from "../src/lib/assessment/AssessmentInput";
import type { AssessmentVerdict } from "../src/lib/assessment/AssessmentResult";

/**
 * Verification script for Assessment Engine logic.
 * Run with: npx tsx scripts/verify-assessment-logic.ts
 */

function assert(condition: boolean, message: string) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

async function test_runAssessment() {
    console.log("--- Testing runAssessment ---");

    // Mock minimal input
    const mockInput: AssessmentInput = {
        caseId: "test-case-123",
        disputeType: "parking",
        facts: {
            pcnNumber: { value: "PCN123", source: "questionnaire" },
            issuer: { value: "Camden Council", source: "questionnaire" },
            issueDate: { value: "2023-10-01", source: "questionnaire" },
            // Optional fields can be null/empty for this test
            issueTime: { value: null, source: "none" },
            vrn: { value: null, source: "none" },
            location: { value: null, source: "none" },
            contraventionType: { value: null, source: "none" },
            disputeType: { value: "parking", source: "questionnaire" },
            eventDate: { value: null, source: "none" },
            amountDue: { value: null, source: "none" },
            reference: { value: null, source: "none" },
            noticeType: { value: null, source: "none" }
        },
        evidence: {
            caseId: "test-case-123",
            docs: [], // No docs
            combinedText: "",
            combinedFacts: {}
        },
        rawAnswers: {},
        generatedAtISO: new Date().toISOString()
    };

    // Test 1: Critical Info Present -> APPEAL_POSSIBLE (or at least stable analysis)
    // Note: In current stub, hasDocs is checked. If no docs, might warn but allow appeal? 
    // Let's check logic: hasPcn && hasIssuer && hasDate => APPEAL_POSSIBLE.
    const result1 = await runAssessment(mockInput);
    assert(result1.verdict === "APPEAL_POSSIBLE", `Verdict should be APPEAL_POSSIBLE when core facts exist. Got: ${result1.verdict}`);
    assert(result1.checks.some(c => c.id === "core_identifiers_present" && c.passed), "Core identifiers check should pass");
    assert(result1.checks.some(c => c.id === "evidence_uploaded" && !c.passed), "Evidence check should fail (no docs)");

    // Test 2: Missing Info -> UNCERTAIN
    const incompleteInput = { ...mockInput, facts: { ...mockInput.facts, pcnNumber: { value: null, source: "none" as const } } };
    const result2 = await runAssessment(incompleteInput);
    assert(result2.verdict === "UNCERTAIN", `Verdict should be UNCERTAIN when PCN missing. Got: ${result2.verdict}`);
    assert(result2.missingInfo.includes("pcnNumber"), "Missing info should include pcnNumber");

    console.log("All tests passed!");
}

test_runAssessment().catch(err => {
    console.error("Test failed unhandled:", err);
    process.exit(1);
});
