
// @ts-nocheck
// Verification script for RemotePersistence Hardening
// Mocks fetch and crypto to test RemoteAdapter

import { RemoteAdapter } from "../src/lib/persistence/RemoteAdapter";

// Mock Browser Environment
const mockStorage: Record<string, string> = {};
global.window = {} as any;
global.localStorage = {
    getItem: (key: string) => mockStorage[key] || null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { },
    length: 0,
    key: (i: number) => null
};

// Polyfill Node crypto for test environment if needed
if (!global.crypto) {
    global.crypto = require('crypto').webcrypto;
}

// Mock Fetch
let mockPutError = false;
let mockPutReject = false;
let mockGetResult: string | null = null;
let fetchCount = 0;

global.fetch = async (url: string, init?: RequestInit): Promise<Response> => {
    fetchCount++;
    console.log(`FETCH ${init?.method || "GET"} ${url}`);

    if ((init?.method === "GET" || !init?.method) && url.includes("/api/persist/")) {
        if (mockGetResult) {
            return {
                ok: true,
                json: async () => ({ value: mockGetResult })
            } as any;
        }
        return { ok: false, status: 404 } as any;
    }

    if (init?.method === "PUT") {
        if (mockPutError) {
            return { ok: false, status: 500 } as any;
        }
        return { ok: true } as any;
    }

    return { ok: true } as any;
};

// Mock Event System (appendCaseEvent) implies localStorage usage, which we mocked.
// We can spy on localStorage to see events being written.

async function runTest() {
    const adapter = new RemoteAdapter();

    console.log("\n=== TEST 1: Idempotent Success (Remote == Local) ===");
    mockGetResult = JSON.stringify({ "test": "data" }); // Remote has same data
    await new Promise<void>(resolve => {
        adapter.set("re_case_123_idempotent", JSON.stringify({ "test": "data" }));
        // Let async queue process
        setTimeout(() => resolve(), 100);
    });
    // Should NOT have PUT
    // Check logs? We'll rely on fetchCount to infer behavior or console output from adapter events



    console.log("\n=== TEST 2: Conflict Failure (Remote != Local) ===");
    mockGetResult = "different_data";
    fetchCount = 0;
    await new Promise<void>(resolve => {
        adapter.set("re_case_123_conflict", "my_new_data");
        setTimeout(() => resolve(), 100);
    });
    // Should verify STORAGE_PUT_FAILED event in mockStorage logs

    console.log("\n=== TEST 3: Retry Logic (Transient Failure) ===");
    mockGetResult = null; // No conflict
    mockPutError = true; // Fail first
    fetchCount = 0;

    // Helper to toggle success after 1st retry
    const toggleSuccess = () => { mockPutError = false; };
    setTimeout(toggleSuccess, 250); // After first retry (200ms)

    await new Promise<void>(resolve => {
        adapter.set("re_case_123_retry", "retry_data");
        setTimeout(() => resolve(), 1500); // Wait enough for retries
    });

    // Check events in mockStorage
    const eventKey = "re_case_123_retry_events";
    // We can't easily check events as we don't know the exact key unless we guess.
    // The adapter logic extracts caseId from "re_case_123_retry".
    // appendCaseEvent writes to "re_case_<ID>_events".

    console.log("\n--- EVENT LOGS DUMP ---");
    for (const k of Object.keys(mockStorage)) {
        if (k.includes("_events")) {
            console.log(`KEY: ${k}`);
            const events = JSON.parse(mockStorage[k]);
            console.log(events.map((e: any) => `${e.type} (Failure: ${e.meta?.failureClass})`));
        }
    }
}

runTest();
