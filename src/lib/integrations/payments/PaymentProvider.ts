import { CheckoutStatus } from "./paymentsContract";

export interface CreateCheckoutParams {
    amountPence: number;
    currency: string;
    purpose: string; // e.g., "FINAL_EXPORT_PACK"
    caseId: string;
    returnUrl?: string;
    cancelUrl?: string;
}

export interface CreateCheckoutResult {
    checkoutId: string;
    providerMetadata?: Record<string, unknown>;
    redirectUrl?: string;
}

export interface PaymentProvider {
    readonly providerName: string;

    /**
     * Creates a new checkout session/intent on the provider.
     * Returns the opaque checkout ID and optional redirect URL.
     */
    createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;

    /**
     * Retrieves the current status of a checkout from the provider.
     */
    getCheckoutStatus(checkoutId: string): Promise<CheckoutStatus>;

    /**
     * Verifies the signature of an incoming webhook payload.
     * Throws if invalid.
     */
    verifyWebhook(payload: string | Buffer, signature?: string): Promise<boolean>;
}
