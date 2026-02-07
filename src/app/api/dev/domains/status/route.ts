import { NextResponse } from "next/server";
import {
    getDomainPool,
    getAllAllocations,
    getAllDomainStatuses
} from "@/lib/managedDomains/managedDomains.server";

// Ensure Node.js runtime
export const runtime = "nodejs";

/**
 * GET /api/dev/domains/status
 * DEV-ONLY: Returns domain pool, allocations, and status flags.
 */
export async function GET() {
    // Production Guard
    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, { status: 404 });
    }

    const pool = getDomainPool();
    const allocations = getAllAllocations();
    const statuses = getAllDomainStatuses();

    // Count allocations per domain
    const allocationCounts: Record<string, number> = {};
    for (const alloc of allocations) {
        allocationCounts[alloc.domain] = (allocationCounts[alloc.domain] || 0) + 1;
    }

    return NextResponse.json({
        ok: true,
        pool,
        allocationCounts,
        statuses,
        recentAllocations: allocations.slice(0, 20)
    });
}
