
import { NextRequest, NextResponse } from "next/server";
import { buildReasoningPack } from "@/lib/reasoning/buildReasoningPack";

export async function GET(req: NextRequest, { params }: { params: { caseId: string } }) {
    // 1. Gate Access
    const isDev = process.env.NODE_ENV !== "production";
    const allowSelfTest = process.env.NEXT_PUBLIC_SELF_TEST === "1";

    if (!isDev && !allowSelfTest) {
        return NextResponse.json(
            { error: "Reasoning Pack export is restricted to development or self-test environments." },
            { status: 403 }
        );
    }

    try {
        // 2. Build Pack
        const pack = buildReasoningPack(params.caseId);

        // 3. Defense in Depth: Content Scan
        // Recursively check for accidentally included raw text fields
        const disallowedKeys = ["nativeText", "ocrText", "preferredText", "rawText", "text"];

        function scan(obj: any): boolean {
            if (!obj || typeof obj !== "object") return false;

            for (const key of Object.keys(obj)) {
                if (disallowedKeys.includes(key)) {
                    // Check if value is non-trivial string? 
                    // To be safe, any presence of these keys is suspicious in a deterministic logic pack.
                    // Exception: 'text' might be used for UI labels? 
                    // ReasoningPack spec said "No document text".
                    // 'text' key is common. Let's be specific about blob keys.
                    // 'nativeText', 'ocrText', 'preferredText' are the dangerous ones.
                    // Let's refine the list.
                    if (["nativeText", "ocrText", "preferredText", "rawText"].includes(key)) {
                        return true;
                    }
                }
                if (scan(obj[key])) return true;
            }
            return false;
        }

        if (scan(pack)) {
            console.error("[ReasoningPack] Disallowed content detected.");
            return NextResponse.json(
                { error: "Export failed: Reasoning pack contains disallowed text fields." },
                { status: 500 }
            );
        }

        // 4. Return Download
        return new NextResponse(JSON.stringify(pack, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="reasoning-pack_${params.caseId}.json"`
            }
        });

    } catch (e: any) {
        console.error("[ReasoningPack] Build error", e);
        return NextResponse.json({ error: "Failed to generate pack." }, { status: 500 });
    }
}
