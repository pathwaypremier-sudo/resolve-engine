#!/usr/bin/env npx tsx
/**
 * Admin Smoke Test
 * 
 * Verifies admin infrastructure is working correctly:
 * - Creates test admin user
 * - Sets/reads app settings
 * - Logs admin actions
 * - Reads back audit logs
 * - Cleans up test data
 */

import { pool } from '../src/lib/db/pool.server';
import {
    createUserWithAdmin,
    getUserById,
    getUserByEmail,
    setUserAdmin,
    countAdmins,
    getAppSetting,
    setAppSetting,
    insertAdminAuditLog,
    loadAdminAuditLogs
} from '../src/lib/db/repo.server';
import { randomUUID } from 'node:crypto';

const TEST_EMAIL = `admin-smoke-test-${Date.now()}@test.local`;

async function main() {
    console.log('[admin-smoke] Starting admin infrastructure smoke test...');
    console.log(`[admin-smoke] Test email: ${TEST_EMAIL}`);

    let testUserId: string | null = null;
    let settingKey: string | null = null;

    try {
        // 1. Create admin user
        console.log('\n[1] Creating test admin user...');
        const user = await createUserWithAdmin(TEST_EMAIL, true);
        testUserId = user.id;
        console.log(`    ✓ Created user: ${user.id}`);
        console.log(`    ✓ isAdmin: ${user.isAdmin}`);

        if (!user.isAdmin) {
            throw new Error('User should be admin');
        }

        // 2. Verify user lookup
        console.log('\n[2] Verifying user lookups...');
        const byId = await getUserById(user.id);
        const byEmail = await getUserByEmail(TEST_EMAIL);

        if (!byId || byId.id !== user.id) throw new Error('getUserById failed');
        if (!byEmail || byEmail.id !== user.id) throw new Error('getUserByEmail failed');
        console.log('    ✓ getUserById works');
        console.log('    ✓ getUserByEmail works');

        // 3. Count admins
        console.log('\n[3] Counting admins...');
        const adminCount = await countAdmins();
        console.log(`    ✓ Admin count: ${adminCount}`);
        if (adminCount < 1) throw new Error('Should have at least 1 admin');

        // 4. Set/get app setting
        console.log('\n[4] Testing app settings...');
        settingKey = `test_setting_${Date.now()}`;
        const testValue = { enabled: true, message: 'Test maintenance', testId: randomUUID() };

        await setAppSetting(settingKey, testValue, user.id);
        console.log('    ✓ Setting saved');

        const readBack = await getAppSetting(settingKey);
        if (!readBack) throw new Error('Setting not found');
        if (readBack.value.testId !== testValue.testId) throw new Error('Setting value mismatch');
        console.log('    ✓ Setting read back correctly');

        // 5. Insert audit log
        console.log('\n[5] Testing audit logging...');
        const auditEntry = await insertAdminAuditLog({
            actorUserId: user.id,
            action: 'test.smoke.action',
            targetType: 'test',
            targetId: 'smoke-test',
            metadata: { testRun: true },
            ip: '127.0.0.1',
            userAgent: 'admin-smoke-test'
        });
        console.log(`    ✓ Audit log created: ${auditEntry.id}`);

        // 6. Read audit logs
        console.log('\n[6] Reading audit logs...');
        const logs = await loadAdminAuditLogs(10, 0);
        const foundLog = logs.find(l => l.id === auditEntry.id);
        if (!foundLog) throw new Error('Audit log not found in list');
        console.log(`    ✓ Found ${logs.length} recent logs`);
        console.log(`    ✓ Test log entry verified`);

        // 7. Test admin revocation
        console.log('\n[7] Testing admin status changes...');
        await setUserAdmin(user.id, false);
        const demoted = await getUserById(user.id);
        if (demoted?.isAdmin !== false) throw new Error('Admin revocation failed');
        console.log('    ✓ Admin revoked');

        await setUserAdmin(user.id, true);
        const restored = await getUserById(user.id);
        if (restored?.isAdmin !== true) throw new Error('Admin restoration failed');
        console.log('    ✓ Admin restored');

        console.log('\n========================================');
        console.log('[admin-smoke] ✓ All tests passed!');
        console.log('========================================\n');

    } catch (error) {
        console.error('\n[admin-smoke] ✗ Test failed:', error);
        process.exit(1);
    } finally {
        // Cleanup
        console.log('[admin-smoke] Cleaning up test data...');
        try {
            if (testUserId) {
                await pool.query('DELETE FROM admin_audit_logs WHERE actor_user_id = $1', [testUserId]);
                await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
                console.log('    ✓ Test user and logs deleted');
            }
            if (settingKey) {
                await pool.query('DELETE FROM app_settings WHERE key = $1', [settingKey]);
                console.log('    ✓ Test setting deleted');
            }
        } catch (cleanupError) {
            console.error('    Cleanup warning:', cleanupError);
        }
        await pool.end();
    }
}

main();
