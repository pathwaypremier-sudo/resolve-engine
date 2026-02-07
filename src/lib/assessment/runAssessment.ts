import type { AssessmentInput } from "./AssessmentInput";
import type { AssessmentResult, AssessmentCheck, AssessmentVerdict } from "./AssessmentResult";
import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * Run the assessment engine on the provided input.
 * 
 * This is the core logic that determines the verdict, checks, and reasons.
 * Currently implements a minimal "stub" logic to verify the pipeline.
 */
export async function runAssessment(input: AssessmentInput): Promise<AssessmentResult> {
    console.group(`[AssessmentEngine] Running assessment for case ${input.caseId}`);
    const generatedAt = new Date().toISOString();

    const facts = input.facts;
    const checks: AssessmentCheck[] = [];
    const missingInfo: Array<keyof CaseFacts> = [];
    const reasons: string[] = [];
    let verdict: AssessmentVerdict = "UNCERTAIN";

    // 1. Basic Completeness Checks
    const hasPcn = !!facts.pcnNumber.value;
    const hasIssuer = !!facts.issuer.value;
    const hasDate = !!facts.issueDate.value;
    const hasDocs = input.evidence.docs.length > 0;

    // Check: Core Identifiers
    checks.push({
        id: "core_identifiers_present",
        label: "Core Key Facts",
        passed: hasPcn && hasIssuer,
        rationale: hasPcn && hasIssuer
            ? "PCN and Issuer identified."
            : "Missing PCN number or Issuer name.",
        citations: []
    });

    if (!hasPcn) missingInfo.push("pcnNumber");
    if (!hasIssuer) missingInfo.push("issuer");

    // Check: Date Validity
    checks.push({
        id: "dates_present",
        label: "Notice Date",
        passed: hasDate,
        rationale: hasDate
            ? `Notice date provided: ${facts.issueDate.value}`
            : "No notice date found to calculate deadlines.",
        citations: []
    });

    if (!hasDate) missingInfo.push("issueDate");

    // Check: Evidence
    checks.push({
        id: "evidence_uploaded",
        label: "Supporting Evidence",
        passed: hasDocs,
        rationale: hasDocs
            ? `${input.evidence.docs.length} document(s) available for analysis.`
            : "No documents uploaded. Assessment limited to user answers.",
        citations: []
    });

    // 2. Verdict Determination (Stub Logic)
    if (hasPcn && hasIssuer && hasDate) {
        verdict = "APPEAL_POSSIBLE";
        reasons.push("Sufficient information provided to assess grounds.");

        if (!hasDocs) {
            reasons.push("Warning: No evidence documents to verify user inputs.");
        }
    } else {
        verdict = "UNCERTAIN";
        reasons.push("Critical information is missing. Please complete the missing fields.");
    }

    console.log(`[AssessmentEngine] Verdict: ${verdict}`);
    console.log(`[AssessmentEngine] Missing: ${missingInfo.join(", ")}`);
    console.groupEnd();

    return {
        verdict,
        checks,
        reasons,
        missingInfo,
        generatedAt
    };
}
