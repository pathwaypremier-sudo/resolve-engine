
import { getOrCreateStubIdentity, startStubSession, endStubSession, getActiveSession } from "../src/lib/integrations/auth/stubAuth";
import { evaluatePolicy } from "../src/lib/integrations/auth/evaluatePolicy";
import { persistence } from "../src/lib/persistence/PersistenceAdapter";

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

// 1. Identity
console.log("1. Get/Create Identity");
const id = getOrCreateStubIdentity();
console.log("Identity:", id);

// 2. Start Session
console.log("2. Start Session");
const sess = startStubSession();
console.log("Session:", sess);

// 3. Evaluate Policy (Allowed)
console.log("3. Evaluate Policy (Default)");
const result = evaluatePolicy({ policyKey: "ADMIN_DEV_TOOLS" });
console.log("Result:", result);

// 4. End Session
console.log("4. End Session");
endStubSession("dev_check");
console.log("Active Session:", getActiveSession());

// 5. Evaluate Policy (Denied)
console.log("5. Evaluate Policy (No Session)");
const result2 = evaluatePolicy({ policyKey: "ADMIN_DEV_TOOLS" });
console.log("Result:", result2);


// Damp logs
console.log("\n--- AUTH LOGS ---");
const logs = persistence.getJSON("re_auth_events_v1");
console.log(JSON.stringify(logs, null, 2));
