
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    console.log('Attempting isolate ensureCase...');
    try {
        const caseId = randomUUID();
        const userId = randomUUID(); // Dummy user

        // We need a real user ID if there's a FK.
        // Let's create a user first.
        const userResult = await pool.query(`INSERT INTO users (id, email) VALUES ($1, $2) RETURNING id`, [userId, `test-${Date.now()}@example.com`]);
        console.log('User created:', userResult.rows[0].id);

        const res = await pool.query(
            `INSERT INTO cases (id, "userId", status, "createdAt", "updatedAt")
       VALUES ($1, $2, 'active', NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET "updatedAt" = NOW()
       RETURNING *`,
            [caseId, userId]
        );
        console.log('Success!', res.rows[0]);
    } catch (e: any) {
        console.error('ERROR:', e.message);
        if (e.detail) console.error('Detail:', e.detail);
        if (e.hint) console.error('Hint:', e.hint);
        if (e.code) console.error('Code:', e.code);
    } finally {
        await pool.end();
    }
}
main();
