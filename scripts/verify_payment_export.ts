
import { buildCasePacket } from "../src/lib/casePacket/buildCasePacket";

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

// Seed Data
const caseId = "test_case_123";
const events = [
    { type: "INTAKE_SUBMITTED", at: "2023-01-01T00:00:00Z" },
    {
        type: "PAYMENT_CHECKOUT_CREATED",
        at: "2023-01-02T10:00:00Z",
        meta: { provider: "stub", amountPence: 500, currency: "GBP", purpose: "FINAL_EXPORT_PACK", checkoutId: "ch_123" }
    },
    {
        type: "PAYMENT_CHECKOUT_UPDATED",
        at: "2023-01-02T10:05:00Z",
        meta: { checkoutId: "ch_123", status: "PAID" }
    },
    {
        type: "ENTITLEMENT_GRANTED",
        at: "2023-01-02T10:05:01Z",
        meta: { entitlementKey: "FINAL_EXPORT_PACK", scope: "case", caseId, provider: "stub" }
    }
];

const paymentsSlice = {
    checkouts: [
        {
            id: "ch_123",
            provider: "stub",
            status: "PAID",
            amountPence: 500,
            currency: "GBP",
            purpose: "FINAL_EXPORT_PACK",
            createdAtIso: "2023-01-02T10:00:00Z"
        }
    ],
    entitlements: [
        {
            key: "FINAL_EXPORT_PACK",
            grantedAtIso: "2023-01-02T10:05:01Z",
            provider: "stub",
            evidence: { checkoutId: "ch_123" }
        }
    ]
};

mockStorage[`re_case_${caseId}_events`] = JSON.stringify(events);
mockStorage[`re_case_${caseId}_payments`] = JSON.stringify(paymentsSlice);
mockStorage[`re_case_tier_${caseId}`] = "NONE"; // or whatever

console.log("Building packet...");
const packet = buildCasePacket(caseId);

console.log("--- EVENTS EXCERPT ---");
const paymentEvents = packet.events.items.filter(e => e.type.startsWith("PAYMENT") || e.type.startsWith("ENTITLEMENT"));
console.log(JSON.stringify(paymentEvents, null, 2));

console.log("\n--- PAYMENTS SLICE EXCERPT ---");
console.log(JSON.stringify(packet.payments, null, 2));
