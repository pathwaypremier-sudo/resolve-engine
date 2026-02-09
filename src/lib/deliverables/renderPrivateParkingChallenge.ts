import type { AssessmentResult, ChallengeStrategy, StrengthSignal } from "@/lib/assessment/AssessmentResult";
import type { CaseFacts } from "@/lib/caseFacts/getCaseFacts";

/**
 * Deliverable output for PRIVATE_PARKING CHALLENGE cases.
 * Renders a structured 6-section document based on assessment results.
 */
export type PrivateParkingChallengeDeliverable = {
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
 * Render the Private Parking Challenge deliverable from assessment results.
 * ONLY activates when deliverable_type === "PRIVATE_PARKING_CHALLENGE"
 */
export async function renderPrivateParkingChallenge(
    assessment: AssessmentResult,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<PrivateParkingChallengeDeliverable> {
    if (assessment.deliverable_type !== "PRIVATE_PARKING_CHALLENGE") {
        throw new Error("renderPrivateParkingChallenge called with wrong deliverable_type");
    }

    if (!assessment.chosen_strategy || !assessment.strength_signal) {
        throw new Error("Assessment must include chosen_strategy and strength_signal for Private Parking Challenge deliverable");
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
        facts,
        rawAnswers
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
        KEEPER_LIABILITY_CHALLENGE: {
            title: "Keeper Liability Challenge",
            description: "Challenge based on your position as the registered keeper (not the driver) and potential non-compliance with Notice to Keeper timing requirements under the Protection of Freedoms Act 2012."
        },
        SIGNAGE_EVIDENCE_CHALLENGE: {
            title: "Signage & Terms Challenge",
            description: "Challenge based on unclear signage, missing terms and conditions, or failure to prominently display parking rules at the site. Private parking operators must meet specific signage standards."
        },
        EVIDENCE_REQUEST_FIRST: {
            title: "Evidence Request Strategy",
            description: "Request full evidence from the operator including proof of their authority, landowner contract, signage photos, and compliance documentation before proceeding with a formal challenge."
        },
        DISCRETIONARY_MITIGATION_PP: {
            title: "Discretionary Appeal",
            description: "Appeal based on mitigating circumstances and request for discretionary cancellation. This approach is used when procedural or evidence-based challenges are limited."
        },
        // Council PCN strategies (not used in private parking but required for type completeness)
        EVIDENCE_FIRST: {
            title: "Evidence-First Challenge",
            description: "Not applicable to private parking cases."
        },
        PROCEDURAL_TIMING: {
            title: "Procedural & Timing Challenge",
            description: "Not applicable to private parking cases."
        },
        DISCRETIONARY_MITIGATION: {
            title: "Discretionary Mitigation",
            description: "Not applicable to private parking cases."
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
            explanation: "Your case has clear grounds for challenge with supporting facts. Private parking operators must follow strict rules, and you have leverage based on the identified issues."
        },
        MIXED: {
            title: "Mixed Strength",
            explanation: "Your case has some valid grounds, but there are gaps in evidence or facts that may weaken your position. Gathering additional information will improve your chances."
        },
        WEAK: {
            title: "Weak Case",
            explanation: "Your challenge is possible but the grounds are limited. Consider whether the time and effort are worthwhile, or if paying (potentially at a discount) is more practical."
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
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): ImprovesChancesSection {
    const checklist: ImprovesChancesSection["checklist"] = [];

    // Strategy-specific checklist items
    if (strategy === "KEEPER_LIABILITY_CHALLENGE") {
        checklist.push(
            {
                item: "Verify NTK timing: Notice to Keeper must be sent within 14 days of parking event",
                completed: false,
                importance: "critical"
            },
            {
                item: "Confirm you are the registered keeper (not the driver)",
                completed: rawAnswers.user_role === "KEEPER" || rawAnswers.user_role === "keeper",
                importance: "critical"
            },
            {
                item: "Check if operator requested keeper details from DVLA correctly",
                completed: false,
                importance: "important"
            }
        );
    } else if (strategy === "SIGNAGE_EVIDENCE_CHALLENGE") {
        checklist.push(
            {
                item: "Photograph all signage at the site (or lack thereof)",
                completed: false,
                importance: "critical"
            },
            {
                item: "Check if terms and conditions were clearly displayed",
                completed: false,
                importance: "critical"
            },
            {
                item: "Verify signage meets BPA/IPC Code of Practice standards",
                completed: false,
                importance: "important"
            }
        );
    } else if (strategy === "EVIDENCE_REQUEST_FIRST") {
        checklist.push(
            {
                item: "Request proof of operator's authority and landowner contract",
                completed: false,
                importance: "critical"
            },
            {
                item: "Request photographic evidence of the alleged contravention",
                completed: false,
                importance: "critical"
            },
            {
                item: "Request proof of BPA/IPC membership and compliance",
                completed: false,
                importance: "important"
            }
        );
    } else {
        checklist.push(
            {
                item: "Provide detailed explanation of your circumstances",
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

    // Common items for all strategies
    checklist.push(
        {
            item: "Complete all required charge notice details (number, operator, dates)",
            completed: missingInfo.length === 0,
            importance: "critical"
        },
        {
            item: "Submit appeal promptly to avoid escalation",
            completed: false,
            importance: "important"
        },
        {
            item: "Keep proof of all correspondence and submission",
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
    strategy: ChallengeStrategy,
    signal: StrengthSignal,
    facts: CaseFacts,
    rawAnswers: Record<string, any>
): Promise<DraftDocumentSection> {
    // TODO: Integrate with NotebookLM API
    // For now, return a placeholder structure
    // NotebookLM will receive ONLY: confirmed facts, chosen_strategy, strength_signal, key evidence flags
    // NotebookLM will NOT decide strategy or strength
    
    const placeholder = `[Draft appeal letter will be generated here]

This section will contain:
- Explanation of the ${strategy} approach
- Reference to confirmed facts from your case
- Calm, factual, and polite language
- No legal threats or guarantees
- Structured argument based on your evidence

NotebookLM will generate this content based on:
- Strategy: ${strategy}
- Strength: ${signal}
- Charge Notice Number: ${facts.pcnNumber.value || "[Not provided]"}
- Operator: ${facts.issuer.value || "[Not provided]"}
- Event Date: ${facts.eventDate.value || "[Not provided]"}
- Your summary: ${rawAnswers.summary || "[Not provided]"}`;

    return {
        title: "Draft Appeal Document",
        content: placeholder,
        disclaimer: "This is a draft for your review. You should verify all facts and customize the language before submission. This is not legal advice."
    };
}

function renderTimeline(facts: CaseFacts): TimelineSection {
    const deadlines: TimelineSection["deadlines"] = [];

    const issueDate = facts.issueDate.value ? new Date(facts.issueDate.value) : null;
    const today = new Date();

    if (issueDate) {
        // Private parking typically has different timelines than council PCNs
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

        // Appeal deadline (typically 28 days from notice)
        const appealDeadline = new Date(issueDate);
        appealDeadline.setDate(appealDeadline.getDate() + 28);
        const appealDaysRemaining = Math.floor((appealDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        deadlines.push({
            label: "Submit Appeal Promptly",
            date: appealDeadline.toISOString().split('T')[0],
            daysRemaining: appealDaysRemaining,
            status: appealDaysRemaining <= 5 ? "urgent" : appealDaysRemaining <= 14 ? "upcoming" : "unknown"
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
        KEEPER_LIABILITY_CHALLENGE: {
            alternatives: [
                "If keeper liability challenge fails, consider signage or evidence issues",
                "Request full evidence pack from operator",
                "Escalate to POPLA (Parking on Private Land Appeals) if operator is BPA member",
                "Consider IAS (Independent Appeals Service) if operator is IPC member"
            ],
            nextSteps: [
                "Verify exact dates: parking event, NTK issue, NTK receipt",
                "Check DVLA keeper request timing and compliance",
                "If challenge rejected, assess whether to pay or escalate to independent adjudication"
            ]
        },
        SIGNAGE_EVIDENCE_CHALLENGE: {
            alternatives: [
                "If signage challenge fails, look for keeper liability or procedural issues",
                "Request site visit or independent assessment",
                "Escalate to POPLA/IAS with photographic evidence"
            ],
            nextSteps: [
                "Gather comprehensive photographic evidence of signage (or lack thereof)",
                "Research BPA/IPC Code of Practice signage requirements",
                "If rejected, consider whether to pay or appeal to independent adjudicator"
            ]
        },
        EVIDENCE_REQUEST_FIRST: {
            alternatives: [
                "If operator provides weak evidence, pivot to specific challenges (signage, keeper liability)",
                "If operator fails to respond, escalate complaint",
                "Consider formal appeal once you have full evidence pack"
            ],
            nextSteps: [
                "Submit formal evidence request to operator",
                "Review all provided documentation carefully",
                "Identify specific weaknesses in operator's case",
                "If evidence is insufficient, proceed with targeted challenge"
            ]
        },
        DISCRETIONARY_MITIGATION_PP: {
            alternatives: [
                "If discretionary appeal fails, look for procedural or evidence issues",
                "Request reconsideration with additional supporting documentation",
                "Escalate to POPLA/IAS if operator is accredited"
            ],
            nextSteps: [
                "Gather supporting evidence for your circumstances",
                "Obtain medical or emergency service records if relevant",
                "If rejected, assess risk of escalation vs. paying to stop further action"
            ]
        },
        // Council PCN strategies (not used in private parking but required for type completeness)
        EVIDENCE_FIRST: {
            alternatives: ["Not applicable to private parking cases"],
            nextSteps: ["Not applicable to private parking cases"]
        },
        PROCEDURAL_TIMING: {
            alternatives: ["Not applicable to private parking cases"],
            nextSteps: ["Not applicable to private parking cases"]
        },
        DISCRETIONARY_MITIGATION: {
            alternatives: ["Not applicable to private parking cases"],
            nextSteps: ["Not applicable to private parking cases"]
        }
    };

    const { alternatives, nextSteps } = fallbackMap[strategy];

    return {
        title: "If This Doesn't Work",
        alternativeApproaches: alternatives,
        nextSteps
    };
}
