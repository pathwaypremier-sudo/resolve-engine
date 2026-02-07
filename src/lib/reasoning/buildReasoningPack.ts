
import { ReasoningPack } from "./ReasoningPack";
import { readTimelineFacts } from "@/lib/case/timelineFacts";
import { readDisputeType } from "@/lib/case/disputeType";
import { readCaseEvents, getEffectiveEvents } from "@/lib/case/events";
import { buildEvidenceChecklist } from "@/lib/case/evidenceChecklist";
import { deriveDeliverableReadiness } from "@/lib/assessment/deriveAssessmentReadinessFacts";
import { buildQuestions, Ctx } from "@/lib/assessment/questions";

type CaseEvent = {
    type: string;
    at: string;
    meta?: Record<string, any>;
};

function compareEventsAsc(a: CaseEvent, b: CaseEvent): number {
    const timeA = new Date(a.at).getTime();
    const timeB = new Date(b.at).getTime();
    if (timeA !== timeB) return timeA - timeB;

    const typeCompare = String(a.type).localeCompare(String(b.type));
    if (typeCompare !== 0) return typeCompare;

    const metaA = JSON.stringify(a.meta ?? {});
    const metaB = JSON.stringify(b.meta ?? {});
    return metaA.localeCompare(metaB);
}

// Internal helper to get all answers from storage using QUESTIONS logic
function getLocalAnswers(caseId: string): Record<string, string> {
    if (typeof window === "undefined") return {};
    const answers: Record<string, string> = {};

    // We don't have a list of all possible keys easily unless we check questions.
    // But questions depend on context.
    // Circular dependency? No.
    // We can iterate all localStorage keys starting with re_case_{caseId}_
    // and assume values. But that captures everything.
    // Better: Helper function that knows keys.
    // Let's iterate over ALL POTENTIAL questions.
    // To do that, we need to create a dummy context to get questions?
    // Or just look for known keys.

    // Let's do a best-effort "All known keys" by instantiating questions with broad context
    const dummyCtx: Ctx = { answers: {}, disputeType: "COUNCIL_PCN" }; // get council questions
    const q1 = buildQuestions(dummyCtx);
    const dummyCtx2: Ctx = { answers: {}, disputeType: "PRIVATE_PARKING" }; // get private questions
    const q2 = buildQuestions(dummyCtx2);

    const allKeys = new Set([...q1, ...q2].map(q => q.key));

    for (const key of allKeys) {
        const val = localStorage.getItem(`re_case_${caseId}_${key}`);
        if (val) answers[key] = val;
    }
    return answers;
}

function getTriggerSnapshot(answers: Record<string, string>, disputeType: string | null): string[] {
    // Reconstruct the logic used in AssessmentContext
    const ctx: Ctx = {
        answers,
        disputeType: disputeType || undefined,
        evidenceStatus: localStorage.getItem(`re_case_${disputeType}_evidence_status`) || "NONE_DECLARED" // approximate
    };

    // Get questions relevant to this context
    const questions = buildQuestions(ctx);
    const active: string[] = [];

    for (const q of questions) {
        // `buildQuestions` already filters by `when`, effectively.
        // Wait, buildQuestions returns a list, and `when` is a property on objects in that list.
        // Most use `when` to show/hide.
        if (q.when && !q.when(ctx)) {
            continue;
        }
        active.push(q.id);
    }
    return active;
}

function getEvidenceMeta(caseId: string) {
    if (typeof window === "undefined") return [];
    try {
        const raw = localStorage.getItem(`re_case_${caseId}_docs`);
        if (!raw) return [];
        const docs = JSON.parse(raw);
        if (!Array.isArray(docs)) return [];
        return docs.map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            size: d.size,
            hasNativeText: !!d.text,
            hasOCR: !!d.ocrText
        }));
    } catch {
        return [];
    }
}

export function buildReasoningPack(caseId: string): ReasoningPack {
    const events = readCaseEvents(caseId);
    const sortedEvents = [...events].sort(compareEventsAsc);
    const effectiveEvents = getEffectiveEvents(sortedEvents);
    const generatedAtIso = sortedEvents.length > 0
        ? sortedEvents[sortedEvents.length - 1].at
        : "UNKNOWN";

    // Facts
    const timelineFacts = readTimelineFacts(caseId);
    const factItems: Record<string, { value: unknown; provenance?: string }> = {};
    for (const [k, v] of Object.entries(timelineFacts)) {
        factItems[k] = { value: v, provenance: "INTAKE" };
    }

    // Questionnaire
    const disputeType = readDisputeType(caseId);
    const answers = getLocalAnswers(caseId);
    const triggerSnapshot = getTriggerSnapshot(answers, disputeType);

    // Evidence
    const checklist = buildEvidenceChecklist(caseId);
    const files = getEvidenceMeta(caseId);
    // evidenceStatus is stored in localStorage? readEvidenceStatus doesn't exist?
    // check deriveAssessmentReadinessFacts.ts -> it reads manually.
    const evidenceStatus = typeof window !== "undefined" ? localStorage.getItem(`re_case_${caseId}_evidence_status`) || "NONE_DECLARED" : "NOT_AVAILABLE";

    // Readiness
    const readiness = deriveDeliverableReadiness(caseId);
    const readinessStatus = readiness.isBlocking ? "NOT_READY" : "READY";

    const blocking = readiness.issues.filter(i => i.severity === "BLOCKING").map(i => i.label);
    const warnings = readiness.issues.filter(i => i.severity === "WARNING").map(i => i.label);

    return {
        meta: {
            caseId,
            generatedAt: generatedAtIso,
            schemaVersion: "1.0.0"
        },
        facts: {
            items: factItems
        },
        questionnaire: {
            disputeType,
            answers,
            triggerSnapshot
        },
        evidence: {
            status: evidenceStatus,
            files
        },
        events: effectiveEvents,
        readiness: {
            status: readinessStatus,
            blocking,
            warnings
        }
    };
}
