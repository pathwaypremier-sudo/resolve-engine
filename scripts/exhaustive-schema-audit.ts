
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    console.log('--- ALL SCHEMAS ---');
    const schemas = await pool.query('SELECT schema_name FROM information_schema.schemata');
    console.log(schemas.rows.map(r => r.schema_name).join(', '));

    console.log('--- ALL CASES TABLES ---');
    const tables = await pool.query(`
    SELECT table_schema, table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name = 'cases'
    ORDER BY table_schema, ordinal_position
  `);

    let currentSchema = '';
    tables.rows.forEach(r => {
        if (r.table_schema !== currentSchema) {
            currentSchema = r.table_schema;
            console.log(`Schema: ${currentSchema}`);
        }
        console.log(`  - ${r.column_name}`);
    });

    await pool.end();
}
main();
