import { NextRequest, NextResponse } from "next/server";
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import {
    processPaymentEvent,
    makePaymentCheckoutUpdatedEvent,
    makeEntitlementGrantedEvent
} from "@/lib/integrations/payments/paymentsEvents";
import { reconcileEntitlement } from "@/lib/integrations/payments/reconcileEntitlement";
import { PaymentsCaseSlice, CheckoutStatus } from "@/lib/integrations/payments/paymentsContract";
import { auditLog } from "@/lib/ops/auditLog.server";

export async function POST(req: NextRequest) {
    // 1. Production Guard: Ensure dev stub is inaccessible in production.
    if (process.env.NODE_ENV === "production") {
        return new NextResponse(null, { status: 404 });
    }

    try {
        const body = await req.json();

        // 2. Validation
        const { caseId, provider, checkoutId, providerEventId, category } = body;
        if (!caseId || !provider || !checkoutId || !providerEventId || !category) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 3. Map status
        let status: CheckoutStatus;
        if (category === "PAID") status = "PAID";
        else if (category === "FAILED") status = "FAILED";
        else if (category === "CANCELED") status = "CANCELED";
        else {
            return NextResponse.json({ error: "Invalid category" }, { status: 400 });
        }

        const eventsApplied: string[] = [];

        // 4. Emit PAYMENT_CHECKOUT_UPDATED
        const updateEvent = makePaymentCheckoutUpdatedEvent({
            checkoutId,
            status
        });
        processPaymentEvent(caseId, updateEvent);
        auditLog({ eventType: "PAYMENT_CHECKOUT_UPDATED", caseId, provider, checkoutId, status });
        eventsApplied.push("PAYMENT_CHECKOUT_UPDATED");

        // 5. Entitlement Reconciliation (If PAID)
        let decision: string | undefined;
        let reason: string | undefined;

        if (status === "PAID") {
            const storageKey = `re_case_${caseId}_payments`;
            const casePayments = persistence.getJSON<PaymentsCaseSlice>(storageKey) || undefined;

            const reconciliation = reconcileEntitlement({
                casePayments,
                entitlementKey: "FINAL_EXPORT_PACK",
                provider: provider,
                checkoutId,
                checkoutStatus: "PAID"
            });

            decision = reconciliation.decision;
            reason = reconciliation.reason;

            if (decision === "GRANT") {
                const grantedEvent = makeEntitlementGrantedEvent({
                    entitlementKey: "FINAL_EXPORT_PACK",
                    scope: "case",
                    caseId,
                    provider,
                    evidence: {
                        checkoutId,
                        note: `webhook simulation (${providerEventId})`
                    }
                });
                processPaymentEvent(caseId, grantedEvent);
                auditLog({ eventType: "ENTITLEMENT_RECONCILED", caseId, provider, checkoutId, decision, reason });
                eventsApplied.push("ENTITLEMENT_GRANTED");
            } else {
                auditLog({ eventType: "ENTITLEMENT_RECONCILED", caseId, provider, checkoutId, decision, reason });
                eventsApplied.push("NOOP");
            }
        }

        return NextResponse.json({
            ok: true,
            applied: eventsApplied,
            decision,
            reason
        });

    } catch (e) {
        console.error("[Webhook API] Parse error", e);
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
}
