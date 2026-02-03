import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { appendCaseEvent, CaseEvent } from "@/lib/case/events";
import { initPaymentsSlice } from "./initPaymentsSlice";
import type {
    PaymentProvider,
    CheckoutStatus,
    CaseCheckout,
    CaseEntitlement,
    PaymentsCaseSlice
} from "./paymentsContract";

// --- 1. Payloads ---

export type PaymentCheckoutCreatedPayload = {
    provider: PaymentProvider;
    amountPence: number;
    currency: string;
    purpose: string;
    checkoutId: string;
};

export type PaymentCheckoutUpdatedPayload = {
    checkoutId: string;
    status: CheckoutStatus;
};

export type EntitlementGrantedPayload = {
    entitlementKey: string;
    scope: "case";
    caseId: string;
    provider: PaymentProvider;
    evidence?: {
        checkoutId?: string;
        note?: string;
    };
};

// --- 2. Factory Functions ---

export function makePaymentCheckoutCreatedEvent(args: PaymentCheckoutCreatedPayload): CaseEvent {
    // Note: createdAtIso is implicit in event "at", but the checkout object needs one too.
    // The event doesn't carry it in top-level args usually, but uses 'at'.
    return {
        type: "PAYMENT_CHECKOUT_CREATED",
        at: new Date().toISOString(),
        meta: args as unknown as Record<string, unknown>
    };
}

export function makePaymentCheckoutUpdatedEvent(args: PaymentCheckoutUpdatedPayload): CaseEvent {
    return {
        type: "PAYMENT_CHECKOUT_UPDATED",
        at: new Date().toISOString(),
        meta: args as unknown as Record<string, unknown>
    };
}

export function makeEntitlementGrantedEvent(args: EntitlementGrantedPayload): CaseEvent {
    return {
        type: "ENTITLEMENT_GRANTED",
        at: new Date().toISOString(),
        meta: args as unknown as Record<string, unknown>
    };
}

// --- 3. Event Processing (Reducer + Logger) ---

/**
 * Applies a payment event to the case record (updates payments slice)
 * AND appends the event to the timeline.
 */
export function processPaymentEvent(caseId: string, event: CaseEvent): void {
    // 1. Read / Init Slice
    const storageKey = `re_case_${caseId}_payments`;
    let slice = persistence.getJSON<PaymentsCaseSlice>(storageKey);

    if (!slice || !slice.checkouts || !slice.entitlements) {
        slice = initPaymentsSlice();
    }

    // 2. Apply Event (Reducer Logic)
    if (event.type === "PAYMENT_CHECKOUT_CREATED") {
        const meta = event.meta as unknown as PaymentCheckoutCreatedPayload;
        const newCheckout: CaseCheckout = {
            id: meta.checkoutId,
            provider: meta.provider,
            status: "CREATED",
            amountPence: meta.amountPence,
            currency: meta.currency,
            purpose: meta.purpose,
            createdAtIso: event.at,
        };
        slice.checkouts.push(newCheckout);
    }
    else if (event.type === "PAYMENT_CHECKOUT_UPDATED") {
        const meta = event.meta as unknown as PaymentCheckoutUpdatedPayload;
        const checkout = slice.checkouts.find(c => c.id === meta.checkoutId);
        if (checkout) {
            checkout.status = meta.status;
        }
        // If not found, do nothing (audit posture)
    }
    else if (event.type === "ENTITLEMENT_GRANTED") {
        const meta = event.meta as unknown as EntitlementGrantedPayload;

        // Scope check
        if (meta.scope === "case" && meta.caseId === caseId) {
            // State de-dupe for replay/idempotency; event log remains append-only.
            const alreadyExists = slice.entitlements.some(e =>
                e.key === meta.entitlementKey &&
                e.provider === meta.provider &&
                e.evidence?.checkoutId === meta.evidence?.checkoutId
            );

            if (!alreadyExists) {
                const newEntitlement: CaseEntitlement = {
                    key: meta.entitlementKey,
                    grantedAtIso: event.at,
                    provider: meta.provider,
                    evidence: meta.evidence
                };
                slice.entitlements.push(newEntitlement);
            }
        }
    }

    // 3. Write Slice
    persistence.setJSON(storageKey, slice);

    // 4. Append Event
    appendCaseEvent(caseId, event);
}
