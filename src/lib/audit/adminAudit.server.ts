/**
 * Admin Audit Logging
 * 
 * Records all admin actions to the admin_audit_logs table.
 * Never logs secrets, passwords, or evidence content.
 */

import { insertAdminAuditLog } from '@/lib/db/repo.server';

export type AdminAuditEntry = {
    actorUserId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
    ip?: string;
    userAgent?: string;
};

/**
 * Log an admin action to the database.
 * 
 * @param entry - The audit entry to log
 * @returns The created audit log record
 */
export async function logAdminAction(entry: AdminAuditEntry) {
    // Sanitize metadata - never log secrets
    const safeMetadata = entry.metadata ? sanitizeMetadata(entry.metadata) : undefined;

    return insertAdminAuditLog({
        actorUserId: entry.actorUserId,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        metadata: safeMetadata,
        ip: entry.ip,
        userAgent: entry.userAgent
    });
}

/**
 * Extract request context for audit logging.
 */
export function extractRequestContext(req: Request): { ip: string; userAgent: string } {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    return { ip, userAgent };
}

/**
 * Sanitize metadata to remove any potential secrets.
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'secret', 'token', 'key', 'authorization', 'cookie'];
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
            result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeMetadata(value);
        } else {
            result[key] = value;
        }
    }

    return result;
}
