
import { pool } from '../src/lib/db/pool.server';
import {
    createUserIfMissing,
    ensureCase,
    upsertCaseFact,
    addEvidenceDoc,
    saveAssessmentResult,
    loadCaseById,
    loadCaseFacts,
    loadEvidenceDocs,
    loadLatestAssessmentResult
} from '../src/lib/db/repo.server';
import { randomUUID } from 'node:crypto';

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    let host = 'unknown';
    try {
        if (dbUrl) {
            host = new URL(dbUrl).host;
        }
    } catch (e) { }

    console.log(`Starting DB smoke test (pg) for host: ${host}...`);
    const testEmail = `smoke-test-${Date.now()}@example.com`;

    try {
        // 1. Create User
        console.log('Creating user...');
        const user = await createUserIfMissing(testEmail);
        console.log('User created:', user.id);

        // 2. Create Case (MUST be a valid UUID if column type is uuid)
        const caseId = randomUUID();
        console.log('Creating case...', caseId);
        const kase = await ensureCase(caseId, user.id);
        console.log('Case created:', kase.id);

        // 3. Upsert Facts
        console.log('Upserting facts...');
        await upsertCaseFact(kase.id, 'smoke_test_key', 'test_value', 'manual', 0.9);
        console.log('Fact upserted');

        // 4. Add Evidence Doc
        console.log('Adding evidence doc...');
        await addEvidenceDoc(kase.id, {
            filename: 'test.pdf',
            storagePath: 'test/path/test.pdf',
            mimeType: 'application/pdf',
            sizeBytes: 1234
        });
        console.log('Evidence doc added');

        // 5. Save Assessment Result
        console.log('Saving assessment result...');
        await saveAssessmentResult(kase.id, {
            verdict: 'Pass',
            checks: { test: true },
            reasons: ['Smoke test'],
            missingInfo: []
        });
        console.log('Assessment result saved');

        // 6. Read back
        console.log('Reading back data...');
        const loadedCase = await loadCaseById(kase.id);
        const loadedFacts = await loadCaseFacts(kase.id);
        const loadedDocs = await loadEvidenceDocs(kase.id);
        const loadedResult = await loadLatestAssessmentResult(kase.id);

        if (!loadedCase) throw new Error('Case not found');
        if (loadedCase.userId !== user.id) throw new Error('User ID mismatch');
        if (loadedFacts.length !== 1) throw new Error('Facts count mismatch');
        if (loadedFacts[0].value !== 'test_value') throw new Error('Fact value mismatch');
        if (loadedDocs.length !== 1) throw new Error('Docs count mismatch');
        if (!loadedResult) throw new Error('Result not found');

        console.log('Result checks:', loadedResult.checks);
        // @ts-ignore
        if (!loadedResult.checks.test) throw new Error('Result checks mismatch');

        console.log('Data verified successfully');

    } catch (error) {
        console.error('Smoke test failed:', error);
        process.exit(1);
    } finally {
        // Clean up
        console.log('Cleaning up...');
        try {
            await pool.query('DELETE FROM users WHERE email = $1', [testEmail]);
            console.log('Cleanup successful');
        } catch (cleanupError) {
            console.error('Cleanup failed:', cleanupError);
        }
        await pool.end();
    }
}

main();
