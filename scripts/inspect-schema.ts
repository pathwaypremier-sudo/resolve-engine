
import { pool } from '../src/lib/db/pool.server';

async function main() {
    console.log('Inspecting schema...');
    try {
        const res = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}
main();
