
import { describe, it, expect, vi } from "vitest";

// Mock NextResponse
const mockNextResponse = {
    json: (body: any, init?: any) => ({
        body,
        status: init?.status || 200,
        ok: !init || (init.status >= 200 && init.status < 300),
    }),
};

import { POST } from "./route";
import * as adapter from "@/lib/brain/notebookLMAdapter.server";
import type { EnforcementResult } from "@/lib/notebooklm-contract";

vi.mock("next/server", () => ({
    NextResponse: {
        json: (body: any, init?: any) => ({
            json: async () => body,
            status: init?.status || 200,
            ok: !init || (init.status >= 200 && init.status < 300),
        }),
    },
}));

vi.mock("@/lib/brain/notebookLMAdapter.server", () => ({
    getSafeNotebookLMOutput: vi.fn(),
}));

describe("POST /api/notebooklm/validate", () => {
    it("should return 400 if rawText is missing", async () => {
        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({}),
        });

        const res: any = await POST(req);
        expect(res.status).toBe(400);
        expect(await res.json()).toEqual({ error: "Missing or invalid 'rawText'" });
    });

    it("should return validated result when rawText is valid", async () => {
        const mockResult: EnforcementResult = {
            output: {
                metadata: { contract_version: "v1", generated_at_iso: "now", safe_mode_used: false },
                section_1_summary: "test",
                section_2_position: "test",
                section_3_reasoning: "test",
                section_4_evidence_requests: "test",
                section_5_next_steps: "test",
                section_6_risks_and_limits: "test",
            },
            safe_mode_used: false,
            reason: undefined,
        };

        vi.spyOn(adapter, "getSafeNotebookLMOutput").mockReturnValue(mockResult);

        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ rawText: '{"some":"json"}' }),
        });

        const res: any = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.safe_mode_used).toBe(false);
        expect(json.output.section_1_summary).toBe("test");
        expect(adapter.getSafeNotebookLMOutput).toHaveBeenCalledWith('{"some":"json"}', { caseId: undefined });
    });

    it("should return fallback result (safe mode) when validation fails", async () => {
        const mockFallback: EnforcementResult = {
            output: {
                metadata: { contract_version: "v1", generated_at_iso: "now", safe_mode_used: true },
                section_1_summary: "Fallback",
                section_2_position: "Fallback",
                section_3_reasoning: "Fallback",
                section_4_evidence_requests: "Fallback",
                section_5_next_steps: "Fallback",
                section_6_risks_and_limits: "Fallback",
            },
            safe_mode_used: true,
            reason: "forbidden_language",
        };

        vi.spyOn(adapter, "getSafeNotebookLMOutput").mockReturnValue(mockFallback);

        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ rawText: 'BAD CONTENT', caseId: "123" }),
        });

        const res: any = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.safe_mode_used).toBe(true);
        expect(json.reason).toBe("forbidden_language");
        expect(adapter.getSafeNotebookLMOutput).toHaveBeenCalledWith('BAD CONTENT', { caseId: "123" });
    });
});
