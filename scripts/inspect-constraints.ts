
import { pool } from '../src/lib/db/pool.server';

async function main() {
    console.log('Inspecting constraints...');
    try {
        const res = await pool.query(`
      SELECT 
        conname as constraint_name, 
        contype as type, 
        (SELECT string_agg(attname, ', ') FROM pg_attribute WHERE attrelid = conrelid AND attnum = ANY(conkey)) as columns
      FROM pg_constraint 
      JOIN pg_class ON pg_class.oid = conrelid 
      WHERE relname IN ('users', 'cases', 'case_facts', 'assessment_results')
    `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('Inspecting indices...');
        const indexRes = await pool.query(`
      SELECT
        t.relname as table_name,
        i.relname as index_name,
        a.attname as column_name
      FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
      WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname IN ('users', 'cases', 'case_facts', 'assessment_results')
      ORDER BY
        t.relname,
        i.relname
    `);
        console.log(JSON.stringify(indexRes.rows, null, 2));

    } catch (e: any) {
        console.error('Error:', e.message);
    } finally {
        await pool.end();
    }
}
main();
