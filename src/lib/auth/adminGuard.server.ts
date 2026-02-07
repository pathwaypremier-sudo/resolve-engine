/**
 * Admin Access Guard
 * 
 * Server-side guard for admin routes.
 * Checks session for actorId, then queries users.is_admin.
 * NO caching of admin status - always fresh from DB for immediate revocability.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getActorIdWithFallback } from '@/lib/auth/session.server';
import { getUserById } from '@/lib/db/repo.server';

export type AdminCheckResult =
    | { ok: true; userId: string; email: string; isAdmin: true }
    | { ok: false; error: string; status: 401 | 403 };

/**
 * Check if the current request is from an admin user.
 * 
 * @param req - The incoming request
 * @returns Admin check result with user info if successful
 */
export async function requireAdmin(req: NextRequest): Promise<AdminCheckResult> {
    // Get actor ID from session
    const actorResult = getActorIdWithFallback(req);

    if (!actorResult) {
        return { ok: false, error: 'Unauthorized: No valid session', status: 401 };
    }

    const { actorId } = actorResult;

    // Query DB for user and admin status (no caching)
    const user = await getUserById(actorId);

    if (!user) {
        return { ok: false, error: 'Unauthorized: User not found', status: 401 };
    }

    if (!user.isAdmin) {
        return { ok: false, error: 'Forbidden: Admin access required', status: 403 };
    }

    return {
        ok: true,
        userId: user.id,
        email: user.email,
        isAdmin: true
    };
}

/**
 * Create an error response for failed admin checks.
 */
export function adminErrorResponse(result: Extract<AdminCheckResult, { ok: false }>): NextResponse {
    return NextResponse.json(
        { ok: false, error: result.error },
        { status: result.status }
    );
}

/**
 * Helper to redirect non-admins (for page routes).
 */
export function adminRedirectUrl(req: NextRequest, message?: string): URL {
    const url = req.nextUrl.clone();
    url.pathname = '/';
    if (message) {
        url.searchParams.set('error', message);
    }
    return url;
}
