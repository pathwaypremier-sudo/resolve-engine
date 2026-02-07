
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const tables = ['users', 'cases', 'case_facts', 'evidence_docs', 'assessment_results'];
    for (const t of tables) {
        try {
            // Create a dummy row or just use fields meta
            const res = await pool.query(`SELECT * FROM ${t} LIMIT 0`);
            console.log(`keys_${t}:`, JSON.stringify(res.fields.map(f => f.name)));
        } catch (e: any) {
            console.log(`Error ${t}:`, e.message);
        }
    }
    await pool.end();
}
main();
