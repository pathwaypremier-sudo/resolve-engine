
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const tables = ['users', 'cases', 'case_facts', 'evidence_docs', 'assessment_results'];

    console.log('--- START AUDIT ---');
    for (const t of tables) {
        try {
            const res = await pool.query(`SELECT * FROM public.${t} LIMIT 0`);
            console.log(`Table: public.${t} -> Fields: [${res.fields.map(f => f.name).join(', ')}]`);
        } catch (e: any) {
            console.log(`Error public.${t}:`, e.message);
        }
    }
    console.log('--- END AUDIT ---');
    await pool.end();
}
main();
