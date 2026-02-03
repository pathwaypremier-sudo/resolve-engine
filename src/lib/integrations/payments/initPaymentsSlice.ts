import type { PaymentsCaseSlice } from "./paymentsContract";

export function initPaymentsSlice(): PaymentsCaseSlice {
    return { entitlements: [], checkouts: [] };
}
