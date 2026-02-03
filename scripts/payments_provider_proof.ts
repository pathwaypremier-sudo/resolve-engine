import { execSync } from "child_process";
import { reconcileEntitlement } from "../src/lib/integrations/payments/reconcileEntitlement";
import { processPaymentEvent, makeEntitlementGrantedEvent } from "../src/lib/integrations/payments/paymentsEvents";
import { persistence } from "../src/lib/persistence/PersistenceAdapter";
import { initPaymentsSlice } from "../src/lib/integrations/payments/initPaymentsSlice";
import { PaymentsCaseSlice } from "../src/lib/integrations/payments/paymentsContract";

console.log("== PAYMENTS PROVIDER PROOF ==\n");

let failed = false;

function pass(msg: string) {
    console.log(`[PASS] ${msg}`);
}

function fail(msg: string, err?: any) {
    console.error(`[FAIL] ${msg}`);
    if (err) console.error(err);
    failed = true;
}

// A) Provider default test
try {
    const cmd = `npx tsx -e "import { getPaymentProvider } from './src/lib/integrations/payments/getPaymentProvider'; console.log(getPaymentProvider().providerName);"`;
    const output = execSync(cmd, { encoding: "utf-8", env: { ...process.env, NEXT_PUBLIC_PAYMENTS_PROVIDER: undefined } }).trim();
    if (output === "stub") {
        pass("provider defaults to stub");
    } else {
        fail(`provider default mismatch. Expected 'stub', got '${output}'`);
    }
} catch (e) {
    fail("provider default test choked", e);
}

// B) Stripe unconfigured test
try {
    const cmd = `npx tsx -e "import { getPaymentProvider } from './src/lib/integrations/payments/getPaymentProvider'; getPaymentProvider();"`;
    // We expect this to fail
    execSync(cmd, {
        encoding: "utf-8",
        env: { ...process.env, NEXT_PUBLIC_PAYMENTS_PROVIDER: "stripe", STRIPE_SECRET_KEY: "" },
        stdio: "pipe" // Capture stderr 
    });
    fail("stripe provider should have thrown but didn't");
} catch (e: any) {
    // This is expected!
    const stderr = e.stderr?.toString() || "";
    // Config validation throws "Payment misconfiguration...", Provider ctor throws "STRIPE_NOT_CONFIGURED"
    if (stderr.includes("STRIPE_NOT_CONFIGURED") || stderr.includes("Payment misconfiguration")) {
        pass("stripe provider blocked when unconfigured");
    } else {
        fail("stripe provider threw check failed or threw wrong error", stderr);
    }
}

// C) Reconciliation NOOP test (pure)
try {
    const mockSlice: PaymentsCaseSlice = {
        entitlements: [{
            key: "FINAL_EXPORT_PACK",
            grantedAtIso: new Date().toISOString(),
            provider: "stub",
            evidence: { checkoutId: "ch_test" }
        }],
        checkouts: []
    };

    // Attempt to grant again for same checkout
    const result = reconcileEntitlement({
        casePayments: mockSlice,
        entitlementKey: "FINAL_EXPORT_PACK",
        provider: "stub",
        checkoutId: "ch_test",
        checkoutStatus: "PAID"
    });

    if (result.decision === "NOOP" && result.reason === "ENTITLEMENT_ALREADY_GRANTED_FOR_CHECKOUT") {
        pass("reconciliation NOOP for duplicate checkout");
    } else {
        fail(`reconciliation failed. Expected NOOP, got ${result.decision} (${result.reason})`);
    }
} catch (e) {
    fail("reconciliation test choked", e);
}

// D) State de-dupe on replay test
try {
    const caseId = `proof_test_${Date.now()}`;
    // Clear any previous state (unlikely collision but good practice)
    persistence.remove(`re_case_${caseId}_payments`);
    persistence.remove(`re_case_${caseId}_events`); // AppendCaseEvent uses this

    const event = makeEntitlementGrantedEvent({
        entitlementKey: "FINAL_EXPORT_PACK",
        scope: "case",
        caseId,
        provider: "stub",
        evidence: { checkoutId: "ch_replay", note: "proof" }
    });

    // 1. First Process
    processPaymentEvent(caseId, event);
    // 2. Replay
    processPaymentEvent(caseId, event);

    // Assert
    const slice = persistence.getJSON<PaymentsCaseSlice>(`re_case_${caseId}_payments`);

    if (!slice) throw new Error("Slice not created");

    if (slice.entitlements.length === 1) {
        pass("entitlement state de-dupes on replay");
    } else {
        fail(`replay failed. Expected 1 entitlement, got ${slice.entitlements.length}`);
    }

    // Cleanup
    persistence.remove(`re_case_${caseId}_payments`);

} catch (e) {
    fail("state replay test choked", e);
}

console.log("\n");
if (failed) {
    console.log("OVERALL: FAIL");
    process.exit(1);
} else {
    console.log("OVERALL: PASS");
    process.exit(0);
}
