import type { AssessmentResult, ChallengeStrategy, StrengthSignal } from "@/lib/assessment/AssessmentResult";
import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * Deliverable output for COUNCIL_PCN CHALLENGE cases.
 * Renders a structured 6-section document based on assessment results.
 */
export type CouncilPcnChallengeDeliverable = {
    sections: {
        recommendedStrategy: RecommendedStrategySection;
        strengthSignal: StrengthSignalSection;
        improvesChances: ImprovesChancesSection;
        draftDocument: DraftDocumentSection;
        timeline: TimelineSection;
        fallback: FallbackSection;
    };
    generatedAt: string;
};

export type RecommendedStrategySection = {
    strategy: ChallengeStrategy;
    title: string;
    description: string;
    reasoning: string;
};

export type StrengthSignalSection = {
    signal: StrengthSignal;
    title: string;
    explanation: string;
    factors: string[];
};

export type ImprovesChancesSection = {
    title: string;
    checklist: Array<{
        item: string;
        completed: boolean;
        importance: "critical" | "important" | "helpful";
    }>;
};

export type DraftDocumentSection = {
    title: string;
    content: string; // NotebookLM-generated
    disclaimer: string;
};

export type TimelineSection = {
    title: string;
    deadlines: Array<{
        label: string;
        date: string | null;
        daysRemaining: number | null;
        status: "urgent" | "upcoming" | "unknown";
    }>;
};

export type FallbackSection = {
    title: string;
    alternativeApproaches: string[];
    nextSteps: string[];
};

/**
 * Render the Council PCN Challenge deliverable from assessment results.
 */
export async function renderCouncilPcnChallenge(
    assessment: AssessmentResult,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<CouncilPcnChallengeDeliverable> {
    if (!assessment.chosen_strategy || !assessment.strength_signal) {
        throw new Error("Assessment must include chosen_strategy and strength_signal for Council PCN Challenge deliverable");
    }

    const generatedAt = new Date().toISOString();

    // Section 1: Recommended Strategy
    const recommendedStrategy = renderRecommendedStrategy(
        assessment.chosen_strategy,
        assessment.reasoning_notes || ""
    );

    // Section 2: Strength Signal
    const strengthSignal = renderStrengthSignal(
        assessment.strength_signal,
        assessment.checks,
        facts
    );

    // Section 3: What Improves Your Chances
    const improvesChances = renderImprovesChances(
        assessment.chosen_strategy,
        assessment.missingInfo,
        facts
    );

    // Section 4: Draft Document (NotebookLM placeholder)
    const draftDocument = await renderDraftDocument(
        assessment.chosen_strategy,
        assessment.strength_signal,
        facts,
        rawAnswers
    );

    // Section 5: Timeline & Deadlines
    const timeline = renderTimeline(facts);

    // Section 6: If This Doesn't Work
    const fallback = renderFallback(assessment.chosen_strategy);

    return {
        sections: {
            recommendedStrategy,
            strengthSignal,
            improvesChances,
            draftDocument,
            timeline,
            fallback
        },
        generatedAt
    };
}

function renderRecommendedStrategy(
    strategy: ChallengeStrategy,
    reasoning: string
): RecommendedStrategySection {
    const strategyMap: Record<ChallengeStrategy, { title: string; description: string }> = {
        EVIDENCE_FIRST: {
            title: "Evidence-First Challenge",
            description: "Focus on physical evidence issues such as unclear signage, missing road markings, or incomplete facts that undermine the PCN's validity."
        },
        PROCEDURAL_TIMING: {
            title: "Procedural & Timing Challenge",
            description: "Challenge based on statutory timing requirements, such as late notice issuance or breached response deadlines."
        },
        DISCRETIONARY_MITIGATION: {
            title: "Discretionary Mitigation",
            description: "Request cancellation based on mitigating circumstances and discretionary grounds when procedural or evidence-based challenges are weak."
        },
        // Private parking strategies (should not be used in Council PCN context)
        KEEPER_LIABILITY_CHALLENGE: {
            title: "Keeper Liability Challenge",
            description: "Challenge based on keeper liability and Notice to Keeper timing issues."
        },
        SIGNAGE_EVIDENCE_CHALLENGE: {
            title: "Signage Evidence Challenge",
            description: "Challenge based on unclear signage or terms not prominently displayed."
        },
        EVIDENCE_REQUEST_FIRST: {
            title: "Evidence Request First",
            description: "Request operator evidence before proceeding with challenge."
        },
        DISCRETIONARY_MITIGATION_PP: {
            title: "Discretionary Mitigation (Private Parking)",
            description: "Request cancellation based on mitigating circumstances for private parking."
        }
    };

    const { title, description } = strategyMap[strategy];

    return {
        strategy,
        title,
        description,
        reasoning
    };
}

function renderStrengthSignal(
    signal: StrengthSignal,
    checks: AssessmentResult["checks"],
    facts: CaseFacts
): StrengthSignalSection {
    const signalMap: Record<StrengthSignal, { title: string; explanation: string }> = {
        STRONG: {
            title: "Strong Case",
            explanation: "Your case has key facts, supporting evidence, and a clear challenge strategy. You have a good chance of success."
        },
        MIXED: {
            title: "Mixed Strength",
            explanation: "Your case has some supporting elements, but there are gaps in facts or evidence that may weaken your challenge."
        },
        WEAK: {
            title: "Weak Case",
            explanation: "Your case is possible to challenge, but evidence and facts are thin. Consider gathering more information before proceeding."
        }
    };

    const { title, explanation } = signalMap[signal];

    // Extract factors from checks
    const factors: string[] = [];
    checks.forEach(check => {
        if (check.passed) {
            factors.push(`✓ ${check.label}: ${check.rationale}`);
        } else {
            factors.push(`✗ ${check.label}: ${check.rationale}`);
        }
    });

    return {
        signal,
        title,
        explanation,
        factors
    };
}

function renderImprovesChances(
    strategy: ChallengeStrategy,
    missingInfo: AssessmentResult["missingInfo"],
    facts: CaseFacts
): ImprovesChancesSection {
    const checklist: ImprovesChancesSection["checklist"] = [];

    // Strategy-specific checklist items
    if (strategy === "EVIDENCE_FIRST") {
        checklist.push(
            {
                item: "Photograph unclear or missing signage",
                completed: false,
                importance: "critical"
            },
            {
                item: "Photograph road markings or bay layout",
                completed: false,
                importance: "critical"
            },
            {
                item: "Obtain witness statements if available",
                completed: false,
                importance: "important"
            }
        );
    } else if (strategy === "PROCEDURAL_TIMING") {
        checklist.push(
            {
                item: "Verify exact dates: event, notice issue, notice receipt",
                completed: !!facts.eventDate.value && !!facts.issueDate.value,
                importance: "critical"
            },
            {
                item: "Check statutory time limits (14 days for notice, 28 days for response)",
                completed: false,
                importance: "critical"
            }
        );
    } else {
        checklist.push(
            {
                item: "Provide detailed explanation of circumstances",
                completed: false,
                importance: "important"
            },
            {
                item: "Include any supporting documentation (medical, emergency, etc.)",
                completed: false,
                importance: "important"
            }
        );
    }

    // Common items
    checklist.push(
        {
            item: "Complete all required PCN details (number, issuer, dates)",
            completed: missingInfo.length === 0,
            importance: "critical"
        },
        {
            item: "Submit challenge before discount deadline",
            completed: false,
            importance: "important"
        }
    );

    return {
        title: "What Improves Your Chances",
        checklist
    };
}

async function renderDraftDocument(
    strategy: ChallengeStrategy,
    signal: StrengthSignal,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<DraftDocumentSection> {
    // TODO: Integrate with NotebookLM API
    // For now, return a placeholder structure
    
    const placeholder = `[Draft challenge letter will be generated here]

This section will contain:
- Explanation of the ${strategy} strategy
- Reference to confirmed facts from your case
- Structured argument based on your evidence
- Professional tone suitable for council submission

NotebookLM will generate this content based on:
- Strategy: ${strategy}
- Strength: ${signal}
- PCN Number: ${facts.pcnNumber.value || "[Not provided]"}
- Issuer: ${facts.issuer.value || "[Not provided]"}
- Event Date: ${facts.eventDate.value || "[Not provided]"}
- Your summary: ${rawAnswers.summary || "[Not provided]"}`;

    return {
        title: "Draft Challenge Document",
        content: placeholder,
        disclaimer: "This is a draft for your review. You should verify all facts and customize the language before submission. This is not legal advice."
    };
}

function renderTimeline(facts: CaseFacts): TimelineSection {
    const deadlines: TimelineSection["deadlines"] = [];

    const issueDate = facts.issueDate.value ? new Date(facts.issueDate.value) : null;
    const today = new Date();

    if (issueDate) {
        // Discount deadline (typically 14 days)
        const discountDeadline = new Date(issueDate);
        discountDeadline.setDate(discountDeadline.getDate() + 14);
        const discountDaysRemaining = Math.floor((discountDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        deadlines.push({
            label: "Discount Deadline (50% off)",
            date: discountDeadline.toISOString().split('T')[0],
            daysRemaining: discountDaysRemaining,
            status: discountDaysRemaining <= 3 ? "urgent" : discountDaysRemaining <= 7 ? "upcoming" : "unknown"
        });

        // Challenge deadline (typically 28 days)
        const challengeDeadline = new Date(issueDate);
        challengeDeadline.setDate(challengeDeadline.getDate() + 28);
        const challengeDaysRemaining = Math.floor((challengeDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        deadlines.push({
            label: "Challenge Deadline",
            date: challengeDeadline.toISOString().split('T')[0],
            daysRemaining: challengeDaysRemaining,
            status: challengeDaysRemaining <= 5 ? "urgent" : challengeDaysRemaining <= 14 ? "upcoming" : "unknown"
        });
    } else {
        deadlines.push({
            label: "Deadlines Unknown",
            date: null,
            daysRemaining: null,
            status: "unknown"
        });
    }

    return {
        title: "Timeline & Deadlines",
        deadlines
    };
}

function renderFallback(strategy: ChallengeStrategy): FallbackSection {
    const fallbackMap: Record<ChallengeStrategy, { alternatives: string[]; nextSteps: string[] }> = {
        EVIDENCE_FIRST: {
            alternatives: [
                "If evidence is insufficient, consider procedural timing challenges",
                "Request a site visit or independent assessment of signage/markings",
                "Escalate to adjudication if informal challenge is rejected"
            ],
            nextSteps: [
                "Gather additional photographic evidence",
                "Obtain witness statements",
                "Research similar successful cases in your area"
            ]
        },
        PROCEDURAL_TIMING: {
            alternatives: [
                "If timing challenge fails, pivot to evidence-based arguments",
                "Request formal review of notice issuance procedures",
                "Consider discretionary mitigation if deadlines are borderline"
            ],
            nextSteps: [
                "Verify all dates with official records",
                "Check postal delivery times and proof of service",
                "Consult statutory time limits for your jurisdiction"
            ]
        },
        DISCRETIONARY_MITIGATION: {
            alternatives: [
                "If mitigation is rejected, look for procedural or evidence issues",
                "Request reconsideration with additional supporting documentation",
                "Appeal to independent adjudicator if available"
            ],
            nextSteps: [
                "Gather supporting evidence for your circumstances",
                "Obtain medical or emergency service records if relevant",
                "Consider payment plan if challenge is unsuccessful"
            ]
        }
    };

    const { alternatives, nextSteps } = fallbackMap[strategy];

    return {
        title: "If This Doesn't Work",
        alternativeApproaches: alternatives,
        nextSteps
    };
}
