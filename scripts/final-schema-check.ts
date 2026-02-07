
import { pool } from '../src/lib/db/pool.server';

async function main() {
    const tables = ['users', 'cases', 'case_facts', 'evidence_docs', 'assessment_results'];
    for (const t of tables) {
        try {
            const res = await pool.query(`SELECT * FROM ${t} LIMIT 0`);
            console.log(`Table: ${t}`);
            res.fields.forEach(f => console.log(`  - ${f.name}`));
        } catch (e: any) {
            console.log(`Table ${t} error:`, e.message);
        }
    }
    pool.end();
}
main();
