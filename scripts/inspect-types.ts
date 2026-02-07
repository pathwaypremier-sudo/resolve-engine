
import { pool } from '../src/lib/db/pool.server';

async function main() {
    const tables = ['users', 'cases'];
    for (const t of tables) {
        const res = await pool.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = '${t}'
    `);
        console.log(`Table: ${t}`);
        console.log(JSON.stringify(res.rows, null, 2));
    }
    pool.end();
}
main();
