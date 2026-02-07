
import { pool } from '../src/lib/db/pool.server';

async function main() {
    try {
        const res = await pool.query(`SELECT * FROM assessment_results LIMIT 0`);
        console.log(`assessment_results fields JSON:`, JSON.stringify(res.fields.map(f => f.name)));
    } catch (e: any) {
        console.log(`Error:`, e.message);
    }
    pool.end();
}
main();
