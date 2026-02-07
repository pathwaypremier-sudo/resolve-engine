import { NextRequest, NextResponse } from "next/server";
import { updateDomainStatus } from "@/lib/managedDomains/managedDomains.server";

// Ensure Node.js runtime
export const runtime = "nodejs";

/**
 * POST /api/dev/domains/verify
 * DEV-ONLY: Updates domain verification status.
 * 
 * Body: { domain: string, spfOk?: boolean, dkimOk?: boolean, dmarcOk?: boolean, notes?: string }
 */
export async function POST(req: NextRequest) {
    // Production Guard
    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, { status: 404 });
    }

    let body: {
        domain?: string;
        spfOk?: boolean;
        dkimOk?: boolean;
        dmarcOk?: boolean;
        notes?: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
    }

    if (!body.domain || typeof body.domain !== "string") {
        return NextResponse.json({ ok: false, error: "missing_domain" }, { status: 400 });
    }

    updateDomainStatus(body.domain, {
        spfOk: body.spfOk,
        dkimOk: body.dkimOk,
        dmarcOk: body.dmarcOk,
        notes: body.notes
    });

    return NextResponse.json({
        ok: true,
        domain: body.domain,
        updated: true
    });
}
