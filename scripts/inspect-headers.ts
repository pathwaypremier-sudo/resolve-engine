
import { pool } from '../src/lib/db/pool.server';

async function main() {
    const tables = ['users', 'cases', 'case_facts', 'evidence_docs', 'assessment_results'];
    for (const t of tables) {
        try {
            const res = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${t}' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
      `);
            console.log(`JSON_OUTPUT [${t}]:`, JSON.stringify(res.rows.map(r => r.column_name)));
        } catch (e: any) {
            console.log(`Table ${t} error:`, e.message);
        }
    }
    pool.end();
}
main();
