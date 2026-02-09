import type { AssessmentInput } from "./AssessmentInput";
import type { AssessmentResult, AssessmentCheck, AssessmentVerdict, ChallengeStrategy, StrengthSignal } from "./AssessmentResult";
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

    // 3. Strategy Selection for COUNCIL_PCN CHALLENGE cases
    let deliverable_type: string | undefined;
    let chosen_strategy: ChallengeStrategy | undefined;
    let strength_signal: StrengthSignal | undefined;
    let reasoning_notes: string | undefined;

    const isCouncilPCN = facts.noticeType.value === "COUNCIL_PCN";
    const isChallenge = input.rawAnswers.desired_outcome === "CANCEL" || input.rawAnswers.council_appealed === "NO";

    if (isCouncilPCN && isChallenge) {
        deliverable_type = "COUNCIL_PCN_CHALLENGE";

        const summary = input.rawAnswers.summary?.toLowerCase() || "";
        const noticeDate = facts.issueDate.value;
        const eventDate = facts.eventDate.value;
        const responseDate = input.rawAnswers.response_date;

        // Check for evidence-related issues
        const hasSignageIssue = summary.includes("signage") || summary.includes("sign") || summary.includes("unclear") || summary.includes("obscured") || summary.includes("missing");
        const hasMarkingsIssue = summary.includes("marking") || summary.includes("line") || summary.includes("bay");
        const hasFactsGaps = missingInfo.length > 2;

        // Check for timing issues
        const hasTimingIssue = checkTimingIssues(noticeDate, eventDate, responseDate);

        // Strategy selection (ordered priority)
        if (hasSignageIssue || hasMarkingsIssue || hasFactsGaps) {
            chosen_strategy = "EVIDENCE_FIRST";
            reasoning_notes = `Evidence-based strategy selected. Signage issue: ${hasSignageIssue}, Markings issue: ${hasMarkingsIssue}, Facts gaps: ${hasFactsGaps}`;
        } else if (hasTimingIssue) {
            chosen_strategy = "PROCEDURAL_TIMING";
            reasoning_notes = "Procedural timing strategy selected due to potential statutory deadline issues.";
        } else {
            chosen_strategy = "DISCRETIONARY_MITIGATION";
            reasoning_notes = "Discretionary mitigation strategy selected as fallback.";
        }

        // Strength signal determination
        const hasKeyFacts = hasPcn && hasIssuer && hasDate;
        const hasEvidence = hasDocs;
        const hasDetailedSummary = summary.length > 50;

        if (hasKeyFacts && hasEvidence && hasDetailedSummary) {
            strength_signal = "STRONG";
        } else if (hasKeyFacts && (hasEvidence || hasDetailedSummary)) {
            strength_signal = "MIXED";
        } else {
            strength_signal = "WEAK";
        }

        console.log(`[AssessmentEngine] Deliverable: ${deliverable_type}`);
        console.log(`[AssessmentEngine] Strategy: ${chosen_strategy}`);
        console.log(`[AssessmentEngine] Strength: ${strength_signal}`);
    }

    // 4. Strategy Selection for PRIVATE_PARKING CHALLENGE cases
    const isPrivateParking = facts.noticeType.value === "PRIVATE_PARKING";
    const isPrivateParkingChallenge = input.rawAnswers.desired_outcome === "CHALLENGE";

    if (isPrivateParking && isPrivateParkingChallenge) {
        deliverable_type = "PRIVATE_PARKING_CHALLENGE";

        const summary = input.rawAnswers.summary?.toLowerCase() || "";
        const isKeeper = input.rawAnswers.user_role === "KEEPER" || input.rawAnswers.user_role === "keeper";
        const isDriver = input.rawAnswers.user_role === "DRIVER" || input.rawAnswers.user_role === "driver";
        const noticeDate = facts.issueDate.value;
        const eventDate = facts.eventDate.value;

        // Check for NTK timing issues (Notice to Keeper must be sent within specific timeframes)
        const hasNtkTimingIssue = checkNtkTiming(noticeDate, eventDate);

        // Check for signage issues
        const hasSignageIssue = summary.includes("signage") || summary.includes("sign") ||
            summary.includes("unclear") || summary.includes("obscured") ||
            summary.includes("missing") || summary.includes("terms") ||
            summary.includes("display");

        // Check for incomplete facts or need for operator proof
        const hasFactsGaps = missingInfo.length > 2;
        const needsOperatorProof = summary.includes("proof") || summary.includes("evidence") ||
            summary.includes("documentation");

        // Ordered strategy selection (highest priority first)
        if (isKeeper && !isDriver && hasNtkTimingIssue) {
            chosen_strategy = "KEEPER_LIABILITY_CHALLENGE";
            reasoning_notes = "Keeper liability challenge selected: User is keeper (not driver) and NTK timing appears late or non-compliant.";
        } else if (hasSignageIssue) {
            chosen_strategy = "SIGNAGE_EVIDENCE_CHALLENGE";
            reasoning_notes = "Signage evidence challenge selected: Signage unclear or terms not prominently displayed.";
        } else if (hasFactsGaps || needsOperatorProof) {
            chosen_strategy = "EVIDENCE_REQUEST_FIRST";
            reasoning_notes = `Evidence request strategy selected: Facts incomplete (${hasFactsGaps}) or operator proof required (${needsOperatorProof}).`;
        } else {
            chosen_strategy = "DISCRETIONARY_MITIGATION_PP";
            reasoning_notes = "Discretionary mitigation strategy selected as fallback for private parking.";
        }

        // Strength signal determination
        const hasKeeperProtection = isKeeper && !isDriver && hasNtkTimingIssue;
        const hasStrongSignageIssue = hasSignageIssue && hasDocs;
        const hasKeyFacts = hasPcn && hasIssuer && hasDate;
        const hasEvidence = hasDocs;

        if ((hasKeeperProtection || hasStrongSignageIssue) && hasKeyFacts) {
            strength_signal = "STRONG";
        } else if (hasKeyFacts && (hasSignageIssue || hasEvidence)) {
            strength_signal = "MIXED";
        } else {
            strength_signal = "WEAK";
        }

        console.log(`[AssessmentEngine] Deliverable: ${deliverable_type}`);
        console.log(`[AssessmentEngine] Strategy: ${chosen_strategy}`);
        console.log(`[AssessmentEngine] Strength: ${strength_signal}`);
    }

    // 5. Strategy Selection for PRIVATE_PARKING AFFORDABILITY cases
    const isAffordability = input.rawAnswers.user_intent === "AFFORDABILITY";

    if (isPrivateParking && isAffordability) {
        deliverable_type = "PRIVATE_PARKING_AFFORDABILITY";

        // For affordability cases, strategy is determined by the renderer based on ability_to_pay
        // (MITIGATION or PAYMENT_REQUEST). No chosen_strategy is set here.

        // Strength signal determination for affordability
        const hasAffordabilityReason = !!input.rawAnswers.affordability_reason;
        const hasAbilityToPayNow = !!input.rawAnswers.ability_to_pay_now;
        const hasPreferredOutcome = !!input.rawAnswers.preferred_outcome;
        const hasKeyFacts = hasPcn && hasIssuer && hasDate;
        const hasEvidence = hasDocs;

        // Strength is based on completeness of affordability info
        if (hasAffordabilityReason && hasAbilityToPayNow && hasPreferredOutcome && hasKeyFacts) {
            strength_signal = "STRONG";
            reasoning_notes = "Strong case: All affordability information provided with complete key facts.";
        } else if (hasKeyFacts && (hasAffordabilityReason || hasAbilityToPayNow)) {
            strength_signal = "MIXED";
            reasoning_notes = "Mixed case: Some affordability information provided but incomplete.";
        } else {
            strength_signal = "WEAK";
            reasoning_notes = "Weak case: Missing key affordability information or case facts.";
        }

        console.log(`[AssessmentEngine] Deliverable: ${deliverable_type}`);
        console.log(`[AssessmentEngine] Strength: ${strength_signal}`);
    }

    console.groupEnd();

    return {
        verdict,
        checks,
        reasons,
        missingInfo,
        generatedAt,
        deliverable_type,
        chosen_strategy,
        strength_signal,
        reasoning_notes
    };
}

/**
 * Check for NTK (Notice to Keeper) timing issues in private parking cases.
 * The Protection of Freedoms Act 2012 requires operators to send NTK within specific timeframes.
 */
function checkNtkTiming(noticeDate: string | null, eventDate: string | null): boolean {
    if (!noticeDate || !eventDate) return false;

    try {
        const notice = new Date(noticeDate);
        const event = new Date(eventDate);

        // NTK must typically be sent within 14 days of the parking event
        const daysDiff = Math.floor((notice.getTime() - event.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 14) return true;

        return false;
    } catch (e) {
        return false;
    }
}

/**
 * Check for timing issues that might trigger PROCEDURAL_TIMING strategy.
 */
function checkTimingIssues(noticeDate: string | null, eventDate: string | null, responseDate: string | undefined): boolean {
    if (!noticeDate || !eventDate) return false;

    try {
        const notice = new Date(noticeDate);
        const event = new Date(eventDate);

        // Check if notice was issued more than 14 days after event (typical statutory limit)
        const daysDiff = Math.floor((notice.getTime() - event.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 14) return true;

        // Check if response deadline might be breached
        if (responseDate) {
            const response = new Date(responseDate);
            const daysToRespond = Math.floor((response.getTime() - notice.getTime()) / (1000 * 60 * 60 * 24));
            if (daysToRespond > 28) return true; // Typical response window is 28 days
        }

        return false;
    } catch (e) {
        return false;
    }
}
