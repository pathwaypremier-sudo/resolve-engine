
import { NextResponse } from "next/server";
import { getSafeNotebookLMOutput } from "@/lib/brain/notebookLMAdapter.server";
import type { EnforcementResult } from "@/lib/notebooklm-contract";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { rawText, caseId } = body;

        if (!rawText || typeof rawText !== "string") {
            return NextResponse.json({ error: "Missing or invalid 'rawText'" }, { status: 400 });
        }

        // Pass untrusted input through the safety adapter
        const result: EnforcementResult = getSafeNotebookLMOutput(rawText, {
            caseId: typeof caseId === "string" ? caseId : undefined,
        });

        // Return the validated result (potentially fallback)
        return NextResponse.json(result);

    } catch (error) {
        console.error("Error processing NotebookLM validation", error);
        return NextResponse.json({ error: "Internal processing error" }, { status: 500 });
    }
}
