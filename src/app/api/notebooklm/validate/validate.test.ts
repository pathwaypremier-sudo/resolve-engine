
import { describe, it, expect, vi, beforeEach } from "vitest";

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
import * as auth from "@/lib/auth/session.server";
import * as rateLimit from "@/lib/rateLimit";
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

vi.mock("@/lib/auth/session.server", () => ({
    getActorIdFromRequest: vi.fn(),
    unauthorizedResponse: vi.fn(() => ({
        json: async () => ({ error: "Unauthorized" }),
        status: 401,
        ok: false,
    })),
}));


vi.mock("@/lib/rateLimit", () => ({
    enforceValidateRateLimit: vi.fn(),
    rateLimitResponse: vi.fn(() => ({
        json: async () => ({
            ok: false,
            error: "too_many_requests",
            title: "Please wait a moment",
            explanation: "We've received several requests...",
            nextStep: "Please wait a minute and try again."
        }),
        status: 429,
        ok: false,
    })),
}));

vi.mock("@/lib/telemetry/log", () => ({
    log: {
        warn: vi.fn(),
        info: vi.fn(),
        error: vi.fn(),
    },
}));

describe("POST /api/notebooklm/validate", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: authenticated user, rate limit OK
        vi.spyOn(auth, "getActorIdFromRequest").mockReturnValue("test-actor-123");
        vi.spyOn(rateLimit, "enforceValidateRateLimit").mockReturnValue({
            ok: true,
            ip: "127.0.0.1",
            bucket: "12345",
            count: 1,
        });
    });

    it("should return 401 if user is not authenticated in production", async () => {
        vi.stubEnv("NODE_ENV", "production");
        vi.spyOn(auth, "getActorIdFromRequest").mockReturnValue(null);

        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ rawText: "test" }),
        }) as any;

        const res: any = await POST(req);
        expect(res.status).toBe(401);
        expect(await res.json()).toEqual({ error: "Unauthorized" });

        vi.unstubAllEnvs();
    });

    it("should return 429 if rate limit is exceeded", async () => {
        vi.spyOn(rateLimit, "enforceValidateRateLimit").mockReturnValue({
            ok: false,
            ip: "127.0.0.1",
            bucket: "12345",
            count: 21,
        });

        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ rawText: "test" }),
        }) as any;

        const res: any = await POST(req);
        expect(res.status).toBe(429);
        const json = await res.json();
        expect(json.ok).toBe(false);
        expect(json.error).toBe("too_many_requests");
        expect(json.title).toBeDefined();
        expect(json.explanation).toBeDefined();
    });

    it("should return 400 if rawText exceeds maximum length", async () => {
        const longText = "a".repeat(40001); // Exceeds MAX_RAWTEXT_CHARS (40000)

        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ rawText: longText }),
        }) as any;

        const res: any = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.title).toBe("Input is too long");
        expect(json.error).toBe("Input is too long");
        expect(json.explanation).toBeDefined();
        expect(json.nextStep).toBeDefined();
    });

    it("should return 400 if caseId is not a string", async () => {
        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({ rawText: "test", caseId: 123 }),
        }) as any;

        const res: any = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.title).toBe("Case reference issue");
        expect(json.error).toBe("Case reference issue");
        expect(json.explanation).toBeDefined();
        expect(json.nextStep).toBeDefined();
    });


    it("should return 400 if rawText is missing", async () => {
        const req = new Request("http://localhost", {
            method: "POST",
            body: JSON.stringify({}),
        }) as any;

        const res: any = await POST(req);
        expect(res.status).toBe(400);
        const json = await res.json();
        expect(json.title).toBe("Input required");
        expect(json.error).toBe("Input required");
        expect(json.explanation).toBeDefined();
        expect(json.nextStep).toBeDefined();
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
        }) as any;

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
        }) as any;

        const res: any = await POST(req);
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.safe_mode_used).toBe(true);
        expect(json.reason).toBe("forbidden_language");
        expect(adapter.getSafeNotebookLMOutput).toHaveBeenCalledWith('BAD CONTENT', { caseId: "123" });
    });
});
