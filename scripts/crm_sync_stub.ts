
import { performCrmSyncStub } from "../src/lib/integrations/crmSync/performCrmSyncStub";
import { persistence } from "../src/lib/persistence/PersistenceAdapter";
import { readCaseEvents } from "../src/lib/case/events";

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
const caseId = "test_crm_case";
const events = [
    { type: "INTAKE_SUBMITTED", at: "2023-01-01T00:00:00Z" },
    { type: "TIER_SELECTED", at: "2023-01-01T10:00:00Z", meta: { tier: "PREMIUM" } }
];

mockStorage[`re_case_${caseId}_events`] = JSON.stringify(events);
mockStorage[`re_case_${caseId}_dispute_type`] = "COUNCIL_PCN";
mockStorage[`re_case_${caseId}_issuer`] = "Lambeth Council";

console.log("Running CRM Sync Stub...");
performCrmSyncStub({
    caseId,
    scope: "case"
});

console.log("\n--- EVENTS GENERATED ---");
const newEvents = readCaseEvents(caseId);
console.log(JSON.stringify(newEvents.filter(e => e.type.startsWith("CRM_Sync") || e.type.includes("CRM")), null, 2));

console.log("\n--- ARTIFACTS WRITTEN ---");
for (const key in mockStorage) {
    if (key.startsWith("crm-sync/")) {
        console.log(`Key: ${key}`);
        console.log("Content Excerpt (First 15 lines):");
        const val = mockStorage[key];
        const lines = JSON.stringify(JSON.parse(val), null, 2).split("\n").slice(0, 15);
        console.log(lines.join("\n"));
        console.log("...");
    }
}
