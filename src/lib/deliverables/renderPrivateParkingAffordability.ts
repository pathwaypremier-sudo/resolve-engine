import type { AssessmentResult, StrengthSignal } from "@/lib/assessment/AssessmentResult";
import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * Deliverable output for PRIVATE_PARKING AFFORDABILITY cases.
 * Renders a structured 6-section document for mitigation/payment request strategies.
 */
export type PrivateParkingAffordabilityDeliverable = {
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
    strategy: "MITIGATION" | "PAYMENT_REQUEST";
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
 * Render the Private Parking Affordability deliverable from assessment results.
 * ONLY activates when deliverable_type === "PRIVATE_PARKING_AFFORDABILITY"
 */
export async function renderPrivateParkingAffordability(
    assessment: AssessmentResult,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<PrivateParkingAffordabilityDeliverable> {
    if (assessment.deliverable_type !== "PRIVATE_PARKING_AFFORDABILITY") {
        throw new Error("renderPrivateParkingAffordability called with wrong deliverable_type");
    }

    if (!assessment.strength_signal) {
        throw new Error("Assessment must include strength_signal for Private Parking Affordability deliverable");
    }

    const generatedAt = new Date().toISOString();

    // Determine strategy based on user intent
    const strategy = determineAffordabilityStrategy(rawAnswers);

    // Section 1: Recommended Strategy
    const recommendedStrategy = renderRecommendedStrategy(
        strategy,
        assessment.reasoning_notes || "",
        rawAnswers
    );

    // Section 2: Strength Signal
    const strengthSignal = renderStrengthSignal(
        assessment.strength_signal,
        assessment.checks,
        facts,
        rawAnswers
    );

    // Section 3: What Improves Your Chances
    const improvesChances = renderImprovesChances(
        strategy,
        assessment.missingInfo,
        facts,
        rawAnswers
    );

    // Section 4: Draft Document (NotebookLM placeholder)
    const draftDocument = await renderDraftDocument(
        strategy,
        assessment.strength_signal,
        facts,
        rawAnswers
    );

    // Section 5: Timeline & Deadlines
    const timeline = renderTimeline(facts);

    // Section 6: If This Doesn't Work
    const fallback = renderFallback(strategy);

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

function determineAffordabilityStrategy(
    rawAnswers: Record<string, any>
): "MITIGATION" | "PAYMENT_REQUEST" {
    // If user can pay something now, suggest payment request
    // Otherwise, suggest mitigation
    const abilityToPay = rawAnswers.ability_to_pay_now;
    if (abilityToPay && abilityToPay !== "nothing") {
        return "PAYMENT_REQUEST";
    }
    return "MITIGATION";
}

function renderRecommendedStrategy(
    strategy: "MITIGATION" | "PAYMENT_REQUEST",
    reasoning: string,
    rawAnswers: Record<string, any>
): RecommendedStrategySection {
    const strategyMap = {
        MITIGATION: {
            title: "Request Mitigation Due to Financial Hardship",
            description: "Request cancellation or significant reduction of the parking charge based on your financial circumstances. Private parking operators may exercise discretion when genuine hardship is demonstrated."
        },
        PAYMENT_REQUEST: {
            title: "Request Payment Plan or Reduced Amount",
            description: "Request a payment plan or reduced settlement amount based on your ability to pay. Operators may accept partial payment to resolve the matter quickly."
        }
    };

    const { title, description } = strategyMap[strategy];

    return {
        strategy,
        title,
        description,
        reasoning: reasoning || "Based on your financial circumstances and ability to pay."
    };
}

function renderStrengthSignal(
    signal: StrengthSignal,
    checks: AssessmentResult["checks"],
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): StrengthSignalSection {
    const signalMap: Record<StrengthSignal, { title: string; explanation: string }> = {
        STRONG: {
            title: "Strong Case for Consideration",
            explanation: "Your circumstances demonstrate genuine financial hardship. Operators often show discretion in such cases, especially when you provide supporting evidence."
        },
        MIXED: {
            title: "Moderate Chance of Success",
            explanation: "Your request has merit, but additional supporting evidence would strengthen your case. Operators may be sympathetic but will need clear documentation."
        },
        WEAK: {
            title: "Limited Grounds",
            explanation: "Your circumstances may not meet typical hardship criteria. Consider whether paying (potentially at a discount) is more practical than pursuing mitigation."
        }
    };

    const { title, explanation } = signalMap[signal];

    // Extract factors from checks and affordability details
    const factors: string[] = [];
    
    if (rawAnswers.affordability_reason) {
        factors.push(`✓ Reason provided: ${rawAnswers.affordability_reason}`);
    }
    
    if (rawAnswers.ability_to_pay_now) {
        factors.push(`✓ Current ability to pay: ${rawAnswers.ability_to_pay_now}`);
    }

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
    strategy: "MITIGATION" | "PAYMENT_REQUEST",
    missingInfo: AssessmentResult["missingInfo"],
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): ImprovesChancesSection {
    const checklist: ImprovesChancesSection["checklist"] = [];

    // Strategy-specific checklist items
    if (strategy === "MITIGATION") {
        checklist.push(
            {
                item: "Provide detailed explanation of your financial circumstances",
                completed: !!rawAnswers.affordability_reason,
                importance: "critical"
            },
            {
                item: "Include supporting evidence (bank statements, benefit letters, medical documents)",
                completed: false,
                importance: "critical"
            },
            {
                item: "Explain why you cannot pay even a reduced amount",
                completed: false,
                importance: "important"
            }
        );
    } else {
        checklist.push(
            {
                item: "State clearly what amount you can afford to pay",
                completed: !!rawAnswers.ability_to_pay_now,
                importance: "critical"
            },
            {
                item: "Propose a specific payment plan or settlement amount",
                completed: !!rawAnswers.preferred_outcome,
                importance: "critical"
            },
            {
                item: "Provide evidence of your financial situation",
                completed: false,
                importance: "important"
            }
        );
    }

    // Common items for all strategies
    checklist.push(
        {
            item: "Complete all required charge notice details (number, operator, dates)",
            completed: missingInfo.length === 0,
            importance: "critical"
        },
        {
            item: "Submit request promptly to avoid escalation",
            completed: false,
            importance: "important"
        },
        {
            item: "Keep proof of all correspondence and submission",
            completed: false,
            importance: "helpful"
        },
        {
            item: "Be polite and factual - avoid emotional language",
            completed: false,
            importance: "helpful"
        }
    );

    return {
        title: "What Improves Your Chances",
        checklist
    };
}

async function renderDraftDocument(
    strategy: "MITIGATION" | "PAYMENT_REQUEST",
    signal: StrengthSignal,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<DraftDocumentSection> {
    // TODO: Integrate with NotebookLM API
    // NotebookLM will receive ONLY: confirmed facts, affordability_reason, ability_to_pay_now, preferred_outcome
    // NotebookLM will generate polite, non-adversarial mitigation request
    
    const placeholder = `[Draft mitigation request will be generated here]

This section will contain:
- Polite explanation of your ${strategy === "MITIGATION" ? "financial hardship" : "payment proposal"}
- Reference to confirmed facts from your case
- Calm, respectful, and factual language
- No legal threats or aggressive tone
- Clear request for ${strategy === "MITIGATION" ? "cancellation or reduction" : "payment plan or settlement"}

NotebookLM will generate this content based on:
- Strategy: ${strategy}
- Strength: ${signal}
- Charge Notice Number: ${facts.pcnNumber.value || "[Not provided]"}
- Operator: ${facts.issuer.value || "[Not provided]"}
- Event Date: ${facts.eventDate.value || "[Not provided]"}
- Affordability reason: ${rawAnswers.affordability_reason || "[Not provided]"}
- Ability to pay: ${rawAnswers.ability_to_pay_now || "[Not provided]"}
- Preferred outcome: ${rawAnswers.preferred_outcome || "[Not provided]"}`;

    return {
        title: "Draft Mitigation Request",
        content: placeholder,
        disclaimer: "This is a draft for your review. You should verify all facts and customize the language before submission. This is not legal advice."
    };
}

function renderTimeline(facts: CaseFacts): TimelineSection {
    const deadlines: TimelineSection["deadlines"] = [];

    const issueDate = facts.issueDate.value ? new Date(facts.issueDate.value) : null;
    const today = new Date();

    if (issueDate) {
        // Discount period (often 14 days)
        const discountDeadline = new Date(issueDate);
        discountDeadline.setDate(discountDeadline.getDate() + 14);
        const discountDaysRemaining = Math.floor((discountDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        deadlines.push({
            label: "Discount Deadline (if applicable)",
            date: discountDeadline.toISOString().split('T')[0],
            daysRemaining: discountDaysRemaining,
            status: discountDaysRemaining <= 3 ? "urgent" : discountDaysRemaining <= 7 ? "upcoming" : "unknown"
        });

        // Response deadline (typically 28 days from notice)
        const responseDeadline = new Date(issueDate);
        responseDeadline.setDate(responseDeadline.getDate() + 28);
        const responseDaysRemaining = Math.floor((responseDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        deadlines.push({
            label: "Submit Mitigation Request Promptly",
            date: responseDeadline.toISOString().split('T')[0],
            daysRemaining: responseDaysRemaining,
            status: responseDaysRemaining <= 5 ? "urgent" : responseDaysRemaining <= 14 ? "upcoming" : "unknown"
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

function renderFallback(strategy: "MITIGATION" | "PAYMENT_REQUEST"): FallbackSection {
    const fallbackMap = {
        MITIGATION: {
            alternatives: [
                "If mitigation is rejected, consider requesting a payment plan",
                "Explore whether you can pay a reduced amount as settlement",
                "Check if the operator is willing to accept partial payment",
                "Consider whether procedural or evidence issues exist that could support a challenge"
            ],
            nextSteps: [
                "Gather all supporting evidence for your financial circumstances",
                "Submit your mitigation request with clear, factual explanation",
                "If rejected, assess whether to pay, request payment plan, or challenge on other grounds",
                "Keep all correspondence as evidence of your good faith efforts"
            ]
        },
        PAYMENT_REQUEST: {
            alternatives: [
                "If payment plan is rejected, request a lower settlement amount",
                "Propose a longer payment period with smaller installments",
                "If operator refuses, consider whether full mitigation request is appropriate",
                "Explore whether procedural or evidence issues exist that could support a challenge"
            ],
            nextSteps: [
                "Propose a specific, realistic payment plan or settlement amount",
                "Provide evidence that you can meet the proposed payment terms",
                "If rejected, assess whether to pay in full, request mitigation, or challenge",
                "Keep all correspondence as evidence of your good faith efforts"
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
