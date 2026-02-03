
import { buildQuestions, type Ctx, type Question } from '../src/lib/assessment/questions';

export type ScenarioResult = {
    scenarioId: string;
    description: string;
    input: Ctx;
    activeQuestionIds: string[];
};

export const SCENARIOS: { id: string; desc: string; ctx: Ctx }[] = [
    {
        id: "S1",
        desc: "Council + PROVIDED + Strong extraction (simulated)",
        ctx: {
            verticalId: "MOTORING_PARKING",
            disputeType: "COUNCIL_PCN",
            evidenceStatus: "PROVIDED",
            answers: {
                // Strong extraction implies we have these answers populated (e.g. user accepted or manual entry)
                issuer: "London Borough of Camden",
                reference: "CU12345678",
                notice_date: "2023-10-01",
                event_date: "2023-10-01",
                summary: "Parked on yellow line",
                contact_status: "NO",
            }
        }
    },
    {
        id: "S2",
        desc: "Council + NONE_DECLARED + Manual (no extraction)",
        ctx: {
            verticalId: "MOTORING_PARKING",
            disputeType: "COUNCIL_PCN",
            evidenceStatus: "NONE_DECLARED",
            answers: {
                // Minimal answers, reference missing
                issuer: "Camden",
                // reference missing -> should trigger ref_check
            }
        }
    },
    {
        id: "S3",
        desc: "Private + PROVIDED + Partial extraction",
        ctx: {
            verticalId: "MOTORING_PARKING",
            disputeType: "PRIVATE_PARKING",
            evidenceStatus: "PROVIDED",
            answers: {
                issuer: "Parking Eye",
                // reference present
                reference: "123456",
            }
        }
    },
    {
        id: "S4",
        desc: "Not sure + PROVIDED + Conflicting hints",
        ctx: {
            verticalId: "MOTORING_PARKING",
            disputeType: "NOT_SURE",
            evidenceStatus: "PROVIDED",
            answers: {
                // Ambiguous state
                summary: "Received a ticket",
            }
        }
    },
    {
        id: "S5",
        desc: "Not sure + NONE_DECLARED + Minimal",
        ctx: {
            verticalId: "MOTORING_PARKING",
            disputeType: "NOT_SURE",
            evidenceStatus: "NONE_DECLARED",
            answers: {}
        }
    }
];

export function runScenarios(): ScenarioResult[] {
    return SCENARIOS.map(s => {
        const questions = buildQuestions(s.ctx);
        const activeQs = questions.filter(q => {
            if (!q.when) return true;
            return q.when(s.ctx);
        });

        return {
            scenarioId: s.id,
            description: s.desc,
            input: s.ctx,
            activeQuestionIds: activeQs.map(q => q.id).sort() // Stable sort
        };
    });
}
