
// @ts-nocheck
// Disaster Recovery Proof
// Verifies deterministic rebuild of Case Packet from Event Log + Storage Snapshot

import { buildCasePacket } from "../src/lib/casePacket/buildCasePacket";
import type { CasePacket } from "../src/lib/casePacket/buildCasePacket";

// ... (Environment mocks omitted for brevity, keeping existing)
// 1. Mock Browser Environment
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

// Polyfill crypto if needed
if (!global.crypto) {
    try {
        global.crypto = require('crypto').webcrypto;
    } catch (e) {
        (global as any).crypto = { randomUUID: () => "mock-uuid-" + Math.random() };
    }
}

// 2. Setup / Seeding
const CASE_ID = process.argv[2] || "dr_proof_case";

function seedData(caseId: string) {
    for (const k in mockStorage) delete mockStorage[k];

    const events = [
        { type: "CASE_CREATED", at: "2023-01-01T10:00:00Z" },
        { type: "INTAKE_SUBMITTED", at: "2023-01-01T10:05:00Z" },
        // ... (Events kept same)
        { type: "TIER_SELECTED", at: "2023-01-01T10:10:00Z", meta: { tier: "PREMIUM" } },
        { type: "PAYMENT_CHECKOUT_CREATED", at: "2023-01-01T10:15:00Z", meta: { purpose: "FINAL_EXPORT_PACK", amountPence: 2900 } },
        { type: "ENTITLEMENT_GRANTED", at: "2023-01-01T10:16:00Z", meta: { entitlementKey: "FINAL_EXPORT_PACK", provider: "stripe" } },
        { type: "CRM_SYNC_REQUESTED", at: "2023-01-01T11:00:00Z", meta: { targetId: "remote_crm", scope: "case" } },
        { type: "CRM_SYNC_SUCCEEDED", at: "2023-01-01T11:01:00Z", meta: { resultSummary: "Synced OK" } },
        { type: "CASE_EMAIL_ASSIGNED", at: "2023-01-01T10:01:00Z", meta: { email: "case.123@resolve.co" } }
    ];
    mockStorage[`re_case_${caseId}_events`] = JSON.stringify(events);

    mockStorage[`re_case_${caseId}_dispute_type`] = "COUNCIL_PCN";
    mockStorage[`re_case_${caseId}_issuer`] = "Lambeth Council";
    mockStorage[`re_case_${caseId}_payments`] = JSON.stringify({
        checkouts: [{ id: "ch_1", status: "paid" }],
        entitlements: [{ key: "FINAL_EXPORT_PACK", grantedAtIso: "2023-01-01T10:16:00Z" }]
    });
    mockStorage[`re_case_${caseId}_docs`] = JSON.stringify([
        {
            name: "pcn.jpg",
            storage: { uri: "re-local://doc/1", checksumSha256: "abc123hash", sizeBytes: 1024, storedAtIso: "2023-01-01T10:00:00Z" }
        }
    ]);
}

// 3. Execution
console.log(`\n--- DISASTER RECOVERY PROOF: Case ${CASE_ID} ---\n`);

seedData(CASE_ID);
const packet1 = buildCasePacket(CASE_ID);

seedData(CASE_ID);
const packet2 = buildCasePacket(CASE_ID);

// 4. Assertions
const assertions = [
    {
        label: "Vertical is Parking (via Dispute Type)",
        check: () => packet1.case.dispute_type === "COUNCIL_PCN"
    },
    {
        label: "Provenance Index (Events) exists",
        check: () => packet1.events && packet1.events.count > 0
    },
    {
        label: "Storage Metadata preserved",
        check: () => packet1.docs.items[0].storage?.checksumSha256 === "abc123hash"
    },
    {
        label: "CRM Sync Events included",
        check: () => packet1.events.items.some(e => e.type === "CRM_SYNC_SUCCEEDED")
    },
    {
        label: "Entitlements restored",
        check: () => packet1.payments?.entitlements.some(e => e.key === "FINAL_EXPORT_PACK")
    }
];

let allPass = true;
assertions.forEach(a => {
    let pass = false;
    try { pass = a.check(); } catch (e) { }
    console.log(`[${pass ? "PASS" : "FAIL"}] ${a.label}`);
    if (!pass) allPass = false;
});

// Determinism Check
function normalize(p: any) {
    const copy = JSON.parse(JSON.stringify(p));
    // Normalize creation timestamps
    copy.generated_at_iso = "NORMALIZED";
    if (copy.derived_dates) copy.derived_dates.generated_at_iso = "NORMALIZED";

    // Normalize timeline facts update time (if not seeded fixed)
    if (copy.timeline_facts) copy.timeline_facts.updated_at_iso = "NORMALIZED";

    // Normalize evidence checklist generation time
    if (copy.evidence_checklist) copy.evidence_checklist.generated_at_iso = "NORMALIZED";

    // Normalize integrity stats which might rely on real FS vs mock
    // If validateCaseStorage returns differing stats (e.g. read time?)
    // Actually, validateCaseStorage likely checks file existence.
    // Since we don't seed FS, it checks real FS.
    // Real FS state is constant between run 1 and 2 (unless changed externally).
    // EXCEPT if validateCaseStorage includes a timestamp?
    return copy;
}

const norm1 = normalize(packet1);
const norm2 = normalize(packet2);
const s1 = JSON.stringify(norm1);
const s2 = JSON.stringify(norm2);
const determinism = s1 === s2;

console.log(`[${determinism ? "PASS" : "FAIL"}] Determinism (Identical Output)`);
if (!determinism) {
    allPass = false;
    // Simple diff
    for (let i = 0; i < s1.length; i++) {
        if (s1[i] !== s2[i]) {
            console.log(`Diff at char ${i}: '${s1.slice(i, i + 20)}...' vs '${s2.slice(i, i + 20)}...'`);
            break;
        }
    }
}

console.log("\nOVERALL STATUS: " + (allPass ? "PASS" : "FAIL"));
if (!allPass) process.exit(1);
