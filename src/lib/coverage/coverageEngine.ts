/**
 * Coverage Engine
 * Computes case completeness and roadmap based on CaseState and QuestionBank.
 */

import { CaseState } from "./caseStateAdapter";
import { getApplicableQuestions, QuestionDef } from "./questionBank";

export interface CoverageResult {
    isComplete: boolean;
    completeness: number; // 0-100
    missingRequired: Array<{
        id: string;
        label: string;
        path: string;
    }>;
    nextQuestion: QuestionDef | null;
    roadmap: {
        stage: string;
        nextDeadline: string | null;
        action: string;
    };
}

// Access nested property by dot path
function getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((o, i) => (o ? o[i] : undefined), obj);
}

// Check if value is "answered" (not null/empty)
function isAnswered(val: any): boolean {
    if (val === null || val === undefined) return false;
    if (typeof val === "string" && val.trim() === "") return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
}

export function computeCoverage(state: CaseState): CoverageResult {
    const questions = getApplicableQuestions(state);

    let requiredCount = 0;
    let answeredCount = 0;
    const missing: CoverageResult["missingRequired"] = [];
    let nextQ: QuestionDef | null = null;

    for (const q of questions) {
        if (q.required) {
            requiredCount++;
            const val = getValueByPath(state, q.path);

            // Check legacy raw answers if not found in normalized state path (fallback)
            const isSet = isAnswered(val) || isAnswered(state.rawAnswers[q.id]);

            if (isSet) {
                answeredCount++;
            } else {
                missing.push({
                    id: q.id,
                    label: q.label,
                    path: q.path
                });
                if (!nextQ) nextQ = q;
            }
        }
    }

    const completeness = requiredCount === 0 ? 0 : Math.round((answeredCount / requiredCount) * 100);

    // Compute Roadmap
    // This is a simplified deterministic logic based on state
    let stage = "Unknown Stage";
    let action = "Complete Intake";
    let nextDeadline = null;

    if (state.disputeType === "COUNCIL_PCN") {
        if (state.stage.council === "PCN_WINDSCREEN") {
            stage = "Informal Challenge Period";
            action = "Submit Informal Challenge (usually 14/28 days)";
        } else if (state.stage.council === "NTO" || state.stage.council === "PCN_POSTAL") {
            stage = "Formal Representation Period";
            action = "Submit Formal Representation (28 days)";
        } else if (state.stage.council?.includes("REJECTION")) {
            stage = "Appeal / Adjudication";
            action = "Prepare Appeal for Tribunal";
        }
    } else if (state.disputeType === "PRIVATE_PARKING") {
        if (state.stage.private === "NOTICE_INITIAL") {
            stage = "Initial Appeal Period";
            action = "Appeal to Operator (28 days)";
        } else if (state.stage.private === "DEBT_RECOVERY") {
            stage = "Debt Recovery";
            action = "Do NOT ignore. deny debt if disputed. Check 'Letter Before Claim'.";
        }
    }

    return {
        isComplete: missing.length === 0,
        completeness,
        missingRequired: missing,
        nextQuestion: nextQ,
        roadmap: {
            stage,
            nextDeadline,
            action
        }
    };
}
