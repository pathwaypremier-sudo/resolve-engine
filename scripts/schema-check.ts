import { pool } from '../src/lib/db/pool.server';

async function main() {
    console.log('[schema-check] Checking database schema...\n');

    try {
        // List tables first
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('Tables in public schema:');
        console.log(tables.rows.map(r => r.table_name).join(', '));
        console.log('');

        // Check app_settings columns
        const appSettings = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'app_settings' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        if (appSettings.rows.length === 0) {
            console.log('[app_settings] TABLE NOT FOUND');
        } else {
            console.log('[app_settings] Columns:');
            for (const row of appSettings.rows) {
                console.log('  ' + row.column_name + ' (' + row.data_type + ')');
            }
        }
        console.log('');

        // Check admin_audit_logs columns
        const auditLogs = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'admin_audit_logs' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        if (auditLogs.rows.length === 0) {
            console.log('[admin_audit_logs] TABLE NOT FOUND');
        } else {
            console.log('[admin_audit_logs] Columns:');
            for (const row of auditLogs.rows) {
                console.log('  ' + row.column_name + ' (' + row.data_type + ')');
            }
        }
        console.log('');

        // Check users columns (specifically is_admin)
        const users = await pool.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public'
            ORDER BY ordinal_position
        `);
        if (users.rows.length === 0) {
            console.log('[users] TABLE NOT FOUND in public schema');
        } else {
            console.log('[users] Columns:');
            for (const row of users.rows) {
                console.log('  ' + row.column_name + ' (' + row.data_type + ')');
            }
            // Check specifically for is_admin
            const hasIsAdmin = users.rows.some(r => r.column_name === 'is_admin');
            console.log('');
            console.log('  has is_admin column: ' + hasIsAdmin);
        }

        console.log('\n[schema-check] Done.');
    } catch (error) {
        console.error('[schema-check] Error:', error);
    } finally {
        await pool.end();
    }
}

main();
