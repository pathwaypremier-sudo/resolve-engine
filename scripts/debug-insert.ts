
import { pool } from '../src/lib/db/pool.server';
import { randomUUID } from 'node:crypto';

async function main() {
    console.log('Reproducing smoke test flow...');
    try {
        // 1. Create User
        console.log('1. Creating user...');
        const email = `debug-${Date.now()}@example.com`;
        const userRes = await pool.query(
            `INSERT INTO users (id, email, created_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
       RETURNING *`,
            [randomUUID(), email]
        );
        const user = userRes.rows[0];
        console.log('User created:', user.id);

        // 2. Create Case
        console.log('2. Creating case...');
        const caseId = randomUUID();
        const caseRes = await pool.query(
            `INSERT INTO cases (id, "userId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, 'active', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW()
       RETURNING *`,
            [caseId, user.id]
        );
        const kase = caseRes.rows[0];
        console.log('Case created:', kase.id);

        // 3. Upsert Fact
        console.log('3. Upserting fact...');
        const factRes = await pool.query(
            `INSERT INTO case_facts (id, "caseId", key, value, source, confidence, "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT ("caseId", key) 
       DO UPDATE SET 
         value = EXCLUDED.value,
         source = EXCLUDED.source,
         confidence = EXCLUDED.confidence,
         "updatedAt" = NOW()
       RETURNING *`,
            [randomUUID(), kase.id, 'debug_key', 'debug_value', 'manual', 0.9]
        );
        console.log('Fact upserted:', factRes.rows[0].id);

        console.log('Flow completed successfully!');

    } catch (e: any) {
        console.error('ERROR during flow:');
        console.error('Message:', e.message);
        console.error('Stack:', e.stack);
        if (e.detail) console.error('Detail:', e.detail);
        if (e.hint) console.error('Hint:', e.hint);
        if (e.code) console.error('Code:', e.code);
        if (e.where) console.error('Where:', e.where);
    } finally {
        await pool.end();
    }
}
main();
