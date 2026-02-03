import { PaymentsCaseSlice, PaymentProvider, CheckoutStatus } from "./paymentsContract";

export type ReconcileDecision = "GRANT" | "NOOP" | "BLOCK";

export function reconcileEntitlement(args: {
    casePayments: PaymentsCaseSlice | undefined;
    entitlementKey: string;            // "FINAL_EXPORT_PACK"
    provider: PaymentProvider;         // "stub"|"stripe"
    checkoutId: string;
    checkoutStatus: CheckoutStatus;    // must support "PAID"
}): { decision: ReconcileDecision; reason: string } {
    const { casePayments, entitlementKey, provider, checkoutId, checkoutStatus } = args;

    // 1. Check if casePayments already has an entitlement for this specific checkout
    const alreadyGranted = casePayments?.entitlements.some(e =>
        e.key === entitlementKey &&
        e.provider === provider &&
        e.evidence?.checkoutId === checkoutId
    );

    if (alreadyGranted) {
        return {
            decision: "NOOP",
            reason: "ENTITLEMENT_ALREADY_GRANTED_FOR_CHECKOUT"
        };
    }

    // 2. If checkout is not paid, we cannot grant
    if (checkoutStatus !== "PAID") {
        return {
            decision: "BLOCK",
            reason: "CHECKOUT_NOT_PAID"
        };
    }

    // 3. Otherwise, it's paid and not yet granted for this record
    return {
        decision: "GRANT",
        reason: "PAID_AND_NOT_GRANTED"
    };
}
