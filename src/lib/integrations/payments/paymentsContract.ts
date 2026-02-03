// Payments Integration Contract (V1) — data model + types only (no UI)
// Constitution: no legal advice, no outcome promises, audit-grade posture.

export type PaymentProvider = "stub" | "stripe";

export type CheckoutStatus = "CREATED" | "PENDING" | "PAID" | "FAILED" | "CANCELED";

export type CaseEntitlement = {
    key: string;
    grantedAtIso: string;
    provider: PaymentProvider;
    evidence?: {
        // evidence must be factual metadata only; no secrets; no raw blobs
        checkoutId?: string;
        note?: string;
    };
};

export type CaseCheckout = {
    id: string;
    provider: PaymentProvider;
    status: CheckoutStatus;
    amountPence: number;
    currency: string; // e.g., "GBP"
    purpose: string; // e.g., "FINAL_EXPORT_PACK"
    createdAtIso: string;
};

export type PaymentsCaseSlice = {
    entitlements: CaseEntitlement[];
    checkouts: CaseCheckout[];
};

export const PAYMENTS_V1 = {
    providerStub: "stub" as const,
    statuses: ["CREATED", "PENDING", "PAID", "FAILED", "CANCELED"] as const,
};
