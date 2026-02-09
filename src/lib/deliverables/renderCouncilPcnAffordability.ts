import type { AssessmentResult, StrengthSignal } from "@/lib/assessment/AssessmentResult";
import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * Deliverable output for COUNCIL_PCN AFFORDABILITY cases.
 * Renders a structured 6-section document for payment/mitigation support.
 */
export type CouncilPcnAffordabilityDeliverable = {
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
 * Render the Council PCN Affordability deliverable from assessment results.
 */
export async function renderCouncilPcnAffordability(
    assessment: AssessmentResult,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<CouncilPcnAffordabilityDeliverable> {
    const generatedAt = new Date().toISOString();

    // Section 1: Recommended Strategy
    const recommendedStrategy = renderRecommendedStrategy();

    // Section 2: Strength Signal
    const strengthSignal = renderStrengthSignal(
        assessment,
        facts,
        rawAnswers
    );

    // Section 3: What Improves Your Chances
    const improvesChances = renderImprovesChances(
        facts,
        rawAnswers
    );

    // Section 4: Draft Document (NotebookLM placeholder)
    const draftDocument = await renderDraftDocument(
        facts,
        rawAnswers
    );

    // Section 5: Timeline & Deadlines
    const timeline = renderTimeline(facts);

    // Section 6: If This Doesn't Work
    const fallback = renderFallback();

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

function renderRecommendedStrategy(): RecommendedStrategySection {
    return {
        title: "Recommended Strategy",
        description: "This is a payment and mitigation support path, not a challenge. You are requesting assistance with payment arrangements or discretionary reduction based on your financial circumstances.",
        reasoning: "This approach focuses on demonstrating genuine hardship and proposing a realistic payment solution. It is non-confrontational and works within the council's discretionary powers."
    };
}

function renderStrengthSignal(
    assessment: AssessmentResult,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): StrengthSignalSection {
    const factors: string[] = [];
    let signal: StrengthSignal = "WEAK";

    // Check for key affordability information
    const hasAffordabilityReason = !!rawAnswers.affordability_reason && rawAnswers.affordability_reason.length > 20;
    const hasAbilityToPay = !!rawAnswers.ability_to_pay_now;
    const hasPreferredOutcome = !!rawAnswers.preferred_outcome;
    const hasReference = !!facts.pcnNumber.value;
    const hasIssuer = !!facts.issuer.value;
    const hasDate = !!facts.issueDate.value;

    // Evaluate strength
    if (hasAffordabilityReason) {
        factors.push("✓ Clear hardship explanation provided");
    } else {
        factors.push("✗ No detailed hardship explanation");
    }

    if (hasAbilityToPay) {
        factors.push("✓ Current payment ability stated");
    } else {
        factors.push("✗ Payment ability not specified");
    }

    if (hasPreferredOutcome) {
        factors.push("✓ Preferred arrangement specified");
    } else {
        factors.push("✗ No preferred arrangement stated");
    }

    if (hasReference && hasIssuer && hasDate) {
        factors.push("✓ All PCN details provided");
    } else {
        factors.push("✗ Missing PCN details");
    }

    // Determine signal
    const strongFactors = [hasAffordabilityReason, hasAbilityToPay, hasPreferredOutcome, hasReference && hasIssuer && hasDate];
    const strongCount = strongFactors.filter(Boolean).length;

    if (strongCount >= 3) {
        signal = "STRONG";
    } else if (strongCount >= 2) {
        signal = "MIXED";
    } else {
        signal = "WEAK";
    }

    const signalMap: Record<StrengthSignal, { title: string; explanation: string }> = {
        STRONG: {
            title: "Strong Request",
            explanation: "You have provided clear hardship explanation, realistic payment ability, and preferred arrangement. Your request has a good chance of being considered favorably."
        },
        MIXED: {
            title: "Mixed Strength",
            explanation: "You have provided some key information, but there are gaps that may weaken your request. Consider adding more detail about your circumstances and payment proposal."
        },
        WEAK: {
            title: "Weak Request",
            explanation: "Key affordability information is missing. You should provide more detail about your hardship, payment ability, and preferred arrangement before submitting."
        }
    };

    const { title, explanation } = signalMap[signal];

    return {
        signal,
        title,
        explanation,
        factors
    };
}

function renderImprovesChances(
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): ImprovesChancesSection {
    const checklist: ImprovesChancesSection["checklist"] = [];

    // Critical items
    checklist.push(
        {
            item: "Provide PCN reference number and notice date",
            completed: !!facts.pcnNumber.value && !!facts.issueDate.value,
            importance: "critical"
        },
        {
            item: "State preferred arrangement (time to pay / installments / reduction)",
            completed: !!rawAnswers.preferred_outcome,
            importance: "critical"
        },
        {
            item: "Provide brief hardship explanation (no oversharing)",
            completed: !!rawAnswers.affordability_reason && rawAnswers.affordability_reason.length > 20,
            importance: "critical"
        }
    );

    // Important items
    checklist.push(
        {
            item: "Attach supporting evidence if available (benefits letter, payslip, bank summary)",
            completed: false,
            importance: "important"
        },
        {
            item: "Offer a realistic payment proposal (if any)",
            completed: !!rawAnswers.ability_to_pay_now,
            importance: "important"
        }
    );

    // Helpful items
    checklist.push(
        {
            item: "Keep tone polite and factual, not emotional or demanding",
            completed: false,
            importance: "helpful"
        },
        {
            item: "Send request before discount deadline if possible",
            completed: false,
            importance: "helpful"
        },
        {
            item: "Keep proof of sending (email confirmation or postal receipt)",
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
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<DraftDocumentSection> {
    // TODO: Integrate with NotebookLM API
    // For now, return a placeholder structure
    
    const preferredOutcome = rawAnswers.preferred_outcome || "payment arrangement";
    const affordabilityReason = rawAnswers.affordability_reason || "[Not provided]";
    const abilityToPay = rawAnswers.ability_to_pay_now || "[Not provided]";

    const placeholder = `[Draft affordability request letter will be generated here]

This section will contain:
- Polite request for ${preferredOutcome}
- Brief explanation of your circumstances
- Realistic payment proposal (if applicable)
- Professional tone suitable for council submission

NotebookLM will generate this content based on:
- PCN Number: ${facts.pcnNumber.value || "[Not provided]"}
- Issuer: ${facts.issuer.value || "[Not provided]"}
- Notice Date: ${facts.issueDate.value || "[Not provided]"}
- Preferred Outcome: ${preferredOutcome}
- Hardship Reason: ${affordabilityReason}
- Current Payment Ability: ${abilityToPay}

The letter will:
- Request ${preferredOutcome}
- Explain your circumstances factually
- Propose a realistic payment plan (if applicable)
- Remain polite and non-threatening
- NOT invent legal rights or guarantee outcomes`;

    return {
        title: "Draft Request Document",
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
            label: "Send this today",
            date: today.toISOString().split('T')[0],
            daysRemaining: 0,
            status: "urgent"
        });

        deadlines.push({
            label: "Discount Deadline (50% off) - act before this if possible",
            date: discountDeadline.toISOString().split('T')[0],
            daysRemaining: discountDaysRemaining,
            status: discountDaysRemaining <= 3 ? "urgent" : discountDaysRemaining <= 7 ? "upcoming" : "unknown"
        });

        deadlines.push({
            label: "Keep proof of sending",
            date: null,
            daysRemaining: null,
            status: "upcoming"
        });

        deadlines.push({
            label: "If you receive escalation notices, do not ignore—respond promptly",
            date: null,
            daysRemaining: null,
            status: "upcoming"
        });
    } else {
        deadlines.push({
            label: "Send this today",
            date: null,
            daysRemaining: null,
            status: "urgent"
        });

        deadlines.push({
            label: "Keep proof of sending",
            date: null,
            daysRemaining: null,
            status: "upcoming"
        });
    }

    return {
        title: "Timeline & Deadlines",
        deadlines
    };
}

function renderFallback(): FallbackSection {
    return {
        title: "If This Doesn't Work",
        alternativeApproaches: [
            "Revise your offer amount - propose a different payment schedule or amount",
            "Request a short extension - ask for more time to gather supporting evidence",
            "Consider partial payment - paying something may stop escalation while you negotiate",
            "Seek advice from Citizens Advice or debt charity if your situation is complex"
        ],
        nextSteps: [
            "If rejected, ask for specific reasons why your request was declined",
            "Gather additional supporting evidence (benefits letters, medical records, etc.)",
            "Consider whether you can increase your payment offer",
            "Do not ignore further notices - respond to prevent escalation to bailiffs",
            "If escalated, contact the council immediately to prevent additional costs"
        ]
    };
}
