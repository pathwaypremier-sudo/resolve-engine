
import { pool } from '../src/lib/db/pool.server';
import {
    createUserIfMissing,
    ensureCase,
    upsertCaseFact,
    addEvidenceDoc,
    saveAssessmentResult
} from '../src/lib/db/repo.server';
import { randomUUID } from 'node:crypto';

async function main() {
    console.log('--- START DIAGNOSIS ---');
    try {
        const email = `diag-${Date.now()}@example.com`;
        const user = await createUserIfMissing(email);
        console.log('User OK');

        const caseId = randomUUID();
        const kase = await ensureCase(caseId, user.id);
        console.log('Case OK');

        await upsertCaseFact(kase.id, 'diag_key', 'val');
        console.log('Fact OK');

        await addEvidenceDoc(kase.id, {
            filename: 'f.pdf',
            storagePath: 'p/f.pdf',
            mimeType: 'app/pdf',
            sizeBytes: 10
        });
        console.log('Doc OK');

        await saveAssessmentResult(kase.id, {
            verdict: 'V',
            checks: {},
            reasons: [],
            missingInfo: []
        });
        console.log('Result OK');

    } catch (e: any) {
        console.log('DIAGNOSIS_ERROR_START');
        console.log(JSON.stringify({
            message: e.message,
            detail: e.detail,
            hint: e.hint,
            code: e.code,
            column: e.column,
            table: e.table,
            schema: e.schema,
            datatype: e.datatype,
            constraint: e.constraint,
            routine: e.routine,
            stack: e.stack
        }, null, 2));
        console.log('DIAGNOSIS_ERROR_END');
    } finally {
        await pool.end();
    }
}
main();
