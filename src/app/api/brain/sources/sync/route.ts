import { NextRequest, NextResponse } from "next/server";
import { getBrainGateway } from "@/lib/brain/BrainGateway.server";
import { auditLog } from "@/lib/ops/auditLog.server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

// Helper to read core doc
function readCoreDoc(filename: string, key: string) {
    try {
        const filePath = path.join(process.cwd(), "docs", "brain", "core", filename);
        if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, "utf-8");
            return {
                sourceKey: key,
                sourceType: "text",
                content
            };
        }
    } catch (e) {
        console.error(`Failed to read core doc ${filename}`, e);
    }
    return null;
}

export async function POST(req: NextRequest) {
    const body = await req.json();

    if (!body.caseId) {
        return NextResponse.json({ ok: false, error: "missing_case_id" }, { status: 400 });
    }

    try {
        const gateway = getBrainGateway();
        
        // 1. Prepare Sources
        const sources = body.sources || [];

        // 2. Inject Core Bundle (Always)
        const coreDocs = [
            readCoreDoc("motoring_playbook_v1.md", "core_motoring_playbook_v1"),
            readCoreDoc("resolve_operating_principles.md", "core_operating_principles"),
            readCoreDoc("legal_citations_motoring.md", "core_legal_citations_motoring"),
        ].filter(Boolean);

        const allSources = [...coreDocs, ...sources];

        // 3. Sync
        const result = await gateway.syncSources(body.caseId, allSources);
        
        return NextResponse.json({
            ok: true,
            ...result,
            coreDocsSyncCount: coreDocs.length
        });
    } catch (e: any) {
        auditLog({ 
            eventType: "BRAIN_SYNC_ERROR", 
            caseId: body.caseId, 
            reason: e.message 
        });
        return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
    }
}
