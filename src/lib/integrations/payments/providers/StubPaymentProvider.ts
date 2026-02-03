import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult } from "../PaymentProvider";
import { CheckoutStatus } from "../paymentsContract";

export class StubPaymentProvider implements PaymentProvider {
    readonly providerName = "stub";

    async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
        // Deterministic stub ID generation based on time, but safe to auto-run
        const checkoutId = `stub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        return {
            checkoutId,
            providerMetadata: {
                stub_note: "This is a simulated checkout.",
                original_params: params
            },
            redirectUrl: `http://localhost:3000/app/case/${params.caseId}/checkout/stub-confirm?cid=${checkoutId}`
        };
    }

    async getCheckoutStatus(checkoutId: string): Promise<CheckoutStatus> {
        // In a real stub environment, we might check an in-memory store or always return PENDING/CREATED.
        // For simple logical flows, assume CREATED until updated by event.
        return "CREATED";
    }

    async verifyWebhook(payload: string | Buffer, signature?: string): Promise<boolean> {
        // Stub always accepts
        return true;
    }
}
