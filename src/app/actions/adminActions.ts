"use server";

/**
 * Admin Server Actions
 * 
 * Server actions for admin settings management.
 * All actions require admin privileges and are audited.
 */

import { headers } from 'next/headers';
import { setSetting, getSetting } from '@/lib/ops/settings.server';
import { logAdminAction } from '@/lib/audit/adminAudit.server';
import { getUserById, setUserAdmin } from '@/lib/db/repo.server';

// Note: These actions should only be called from admin pages
// The admin layout handles access control

type ActionResult =
    | { ok: true; message?: string }
    | { ok: false; error: string };

/**
 * Update the uploads_enabled setting.
 */
export async function updateUploadsSetting(
    enabled: boolean,
    actorUserId: string
): Promise<ActionResult> {
    try {
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        await setSetting(
            'uploads_enabled',
            { enabled },
            actorUserId,
            // Create a mock request for audit context
            new Request('http://localhost', {
                headers: { 'x-forwarded-for': ip, 'user-agent': userAgent }
            })
        );

        return { ok: true, message: `Uploads ${enabled ? 'enabled' : 'disabled'}` };
    } catch (error) {
        console.error('Failed to update uploads setting:', error);
        return { ok: false, error: 'Failed to update setting' };
    }
}

/**
 * Update the maintenance_mode setting.
 */
export async function updateMaintenanceMode(
    enabled: boolean,
    message: string | undefined,
    actorUserId: string
): Promise<ActionResult> {
    try {
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        await setSetting(
            'maintenance_mode',
            { enabled, message: message || undefined },
            actorUserId,
            new Request('http://localhost', {
                headers: { 'x-forwarded-for': ip, 'user-agent': userAgent }
            })
        );

        return {
            ok: true,
            message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`
        };
    } catch (error) {
        console.error('Failed to update maintenance mode:', error);
        return { ok: false, error: 'Failed to update setting' };
    }
}

/**
 * Update a user's admin status (admin-only, audited).
 */
export async function updateUserAdminStatus(
    targetUserId: string,
    isAdmin: boolean,
    actorUserId: string
): Promise<ActionResult> {
    try {
        // Verify actor is admin
        const actor = await getUserById(actorUserId);
        if (!actor?.isAdmin) {
            return { ok: false, error: 'Forbidden: Admin access required' };
        }

        // Get target user info for audit
        const targetUser = await getUserById(targetUserId);
        if (!targetUser) {
            return { ok: false, error: 'User not found' };
        }

        // Update admin status
        await setUserAdmin(targetUserId, isAdmin);

        // Audit log
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
        const userAgent = headersList.get('user-agent') || 'unknown';

        await logAdminAction({
            actorUserId,
            action: isAdmin ? 'user.admin.granted' : 'user.admin.revoked',
            targetType: 'user',
            targetId: targetUserId,
            metadata: {
                targetEmail: targetUser.email,
                newAdminStatus: isAdmin
            },
            ip,
            userAgent
        });

        return {
            ok: true,
            message: `Admin status ${isAdmin ? 'granted to' : 'revoked from'} ${targetUser.email}`
        };
    } catch (error) {
        console.error('Failed to update user admin status:', error);
        return { ok: false, error: 'Failed to update admin status' };
    }
}
