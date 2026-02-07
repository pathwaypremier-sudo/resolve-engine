
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const tables = ['users', 'cases', 'case_facts', 'evidence_docs', 'assessment_results'];
    const results: any = {};
    for (const t of tables) {
        try {
            const res = await pool.query(`SELECT * FROM ${t} LIMIT 0`);
            results[t] = res.fields.map(f => f.name);
        } catch (e) {
            results[t] = 'Error: ' + e;
        }
    }
    console.log('FINAL_FIELDS_JSON:' + JSON.stringify(results));
    await pool.end();
}
main();
