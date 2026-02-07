#!/usr/bin/env npx tsx
/**
 * Admin Bootstrap Script
 * 
 * Creates or promotes a user to admin status.
 * Usage: npx tsx scripts/make-admin.ts <email>
 * 
 * This script can:
 * - Create a new admin user if the email doesn't exist
 * - Promote an existing user to admin status
 * 
 * All actions are logged to the admin_audit_logs table.
 */

import { pool } from '../src/lib/db/pool.server';
import {
    getUserByEmail,
    createUserWithAdmin,
    setUserAdmin,
    insertAdminAuditLog
} from '../src/lib/db/repo.server';

async function main() {
    const email = process.argv[2];

    if (!email) {
        console.error('Usage: npx tsx scripts/make-admin.ts <email>');
        console.error('Example: npx tsx scripts/make-admin.ts owner@company.com');
        process.exit(1);
    }

    // Validate email format
    if (!email.includes('@')) {
        console.error('Error: Invalid email format');
        process.exit(1);
    }

    console.log(`[make-admin] Processing: ${email}`);

    try {
        // Check if user exists
        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            if (existingUser.isAdmin) {
                console.log(`[make-admin] User ${email} is already an admin.`);
            } else {
                // Promote existing user
                await setUserAdmin(existingUser.id, true);

                // Log the action
                await insertAdminAuditLog({
                    actorUserId: 'system',
                    action: 'user.admin.granted.bootstrap',
                    targetType: 'user',
                    targetId: existingUser.id,
                    metadata: { email, method: 'make-admin script' }
                });

                console.log(`[make-admin] ✓ Promoted existing user ${email} to admin.`);
            }
        } else {
            // Create new admin user
            const newUser = await createUserWithAdmin(email, true);

            // Log the action
            await insertAdminAuditLog({
                actorUserId: 'system',
                action: 'user.created.admin.bootstrap',
                targetType: 'user',
                targetId: newUser.id,
                metadata: { email, method: 'make-admin script' }
            });

            console.log(`[make-admin] ✓ Created new admin user: ${email} (ID: ${newUser.id})`);
        }

        console.log('[make-admin] Done.');

    } catch (error) {
        console.error('[make-admin] Error:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
