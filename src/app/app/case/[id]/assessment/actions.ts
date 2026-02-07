'use server';

import {
    createUserIfMissing,
    ensureCase,
    saveAssessmentResult as saveRepoResult,
    loadLatestAssessmentResult,
    type AssessmentResult
} from '@/lib/db/repo.server';
import type { AssessmentResult as EngineResult } from '@/lib/assessment/AssessmentResult';

/**
 * Save the assessment result to the database.
 * Ensures the User and Case exist before saving.
 */
export async function saveAssessmentResultAction(
    caseId: string,
    result: EngineResult,
    actorId: string
): Promise<boolean> {
    try {
        // 1. Ensure User exists (using actorId as proxy for now, with dummy email)
        // In a real app, actorId would map to a verified email or we'd have a separate ID.
        const email = `${actorId}@placeholder.local`;
        const user = await createUserIfMissing(email);

        // 2. Ensure Case exists
        // We treat the client-side caseId as the source of truth.
        await ensureCase(caseId, user.id);

        // 3. Save Result
        // Map EngineResult to DB structure (DB expects strict JSON)
        await saveRepoResult(caseId, {
            verdict: result.verdict,
            checks: JSON.stringify(result.checks),
            reasons: JSON.stringify(result.reasons),
            missingInfo: JSON.stringify(result.missingInfo)
        });

        return true;
    } catch (error) {
        console.error('Failed to save assessment result:', error);
        return false;
    }
}

/**
 * Load the latest assessment result from the database.
 */
export async function loadAssessmentResultAction(caseId: string): Promise<EngineResult | null> {
    try {
        const record = await loadLatestAssessmentResult(caseId);
        if (!record) return null;

        // Parse JSON fields back to objects
        return {
            verdict: record.verdict as any,
            checks: typeof record.checks === 'string' ? JSON.parse(record.checks) : record.checks,
            reasons: typeof record.reasons === 'string' ? JSON.parse(record.reasons) : record.reasons,
            missingInfo: typeof record.missingInfo === 'string' ? JSON.parse(record.missingInfo) : record.missingInfo,
            generatedAt: record.generatedAt.toISOString()
            // OR maintain string if the type expects string. 
            // EngineResult definition usually has generatedAt as string (ISO).
            // Let's check AssessmentResult type definition if needed, but safe guess.
        } as EngineResult;
    } catch (error) {
        console.error('Failed to load assessment result:', error);
        return null;
    }
}
