
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    const searchPath = await pool.query('SHOW search_path');
    console.log('Search Path:', searchPath.rows[0].search_path);

    const currentSchema = await pool.query('SELECT current_schema()');
    console.log('Current Schema:', currentSchema.rows[0].current_schema);

    const tables = await pool.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_name = 'cases'
  `);
    console.log('All "cases" tables:', JSON.stringify(tables.rows));

    await pool.end();
}
main();
