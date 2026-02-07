
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    console.log('--- Table: cases ---');
    const res = await pool.query('SELECT * FROM public.cases LIMIT 0');
    console.log('Driver Fields (res.fields):', res.fields.map(f => f.name).join(', '));

    const infoRes = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cases'");
    console.log('SQL Information Schema:', infoRes.rows.map(r => r.column_name).join(', '));

    await pool.end();
}
main();
