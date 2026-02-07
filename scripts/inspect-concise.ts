
import { pool } from '../src/lib/db/pool.server';
async function main() {
    const res = await pool.query(`SELECT table_name, column_name, udt_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, column_name`);
    res.rows.forEach(r => console.log(`${r.table_name}.${r.column_name}: ${r.udt_name}`));
    pool.end();
}
main();
