
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const tables = ['users', 'cases', 'case_facts', 'evidence_docs', 'assessment_results'];

    console.log('--- START SCHEMA AUDIT ---');
    const res = await pool.query(`
    SELECT table_schema, table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name = ANY($1)
    ORDER BY table_schema, table_name, ordinal_position
  `, [tables]);

    res.rows.forEach(r => {
        console.log(`${r.table_schema}.${r.table_name}.${r.column_name}`);
    });
    console.log('--- END SCHEMA AUDIT ---');
    await pool.end();
}
main();
