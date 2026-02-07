/**
 * Maintenance Mode Guard
 * 
 * Server-side guard for blocking write operations during maintenance.
 * - Blocks POST/PUT/PATCH/DELETE when maintenance_mode.enabled = true
 * - Reads (GET/HEAD/OPTIONS) are allowed
 * - Admin routes (/admin/*) are exempted
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMaintenanceMode } from '@/lib/ops/settings.server';

export type MaintenanceCheckResult =
    | { ok: true }
    | { ok: false; message: string };

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Check if the current request should be blocked due to maintenance mode.
 * 
 * @param req - The incoming request
 * @returns { ok: true } if request can proceed, { ok: false, message } if blocked
 */
export async function checkMaintenanceMode(req: NextRequest): Promise<MaintenanceCheckResult> {
    // Always allow read methods
    if (!WRITE_METHODS.includes(req.method)) {
        return { ok: true };
    }

    // Always allow admin routes
    const pathname = req.nextUrl.pathname;
    if (pathname.startsWith('/admin')) {
        return { ok: true };
    }

    // Check maintenance mode setting
    const maintenance = await getMaintenanceMode();

    if (!maintenance.enabled) {
        return { ok: true };
    }

    return {
        ok: false,
        message: maintenance.message || 'System is currently in maintenance mode. Please try again later.'
    };
}

/**
 * Create a 503 response for maintenance mode.
 */
export function maintenanceResponse(message: string): NextResponse {
    return NextResponse.json(
        {
            ok: false,
            error: 'Service Unavailable',
            message
        },
        { status: 503 }
    );
}

/**
 * Guard helper for server actions.
 * Call at the start of any mutating server action.
 * 
 * @throws Returns error object if maintenance mode is active
 */
export async function requireWriteAccess(): Promise<MaintenanceCheckResult> {
    const maintenance = await getMaintenanceMode();

    if (maintenance.enabled) {
        return {
            ok: false,
            message: maintenance.message || 'System is currently in maintenance mode. Please try again later.'
        };
    }

    return { ok: true };
}
