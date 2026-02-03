import { PaymentProvider, CreateCheckoutParams, CreateCheckoutResult } from "../PaymentProvider";
import { CheckoutStatus } from "../paymentsContract";
import { getPaymentConfig } from "../config";

export class StripePaymentProvider implements PaymentProvider {
    readonly providerName = "stripe";

    constructor() {
        const config = getPaymentConfig();
        // Validation should have occurred in the factory, but ensure safety here.
        if (config.provider === "stripe" && !config.stripe.secretKey) {
            throw new Error("STRIPE_NOT_CONFIGURED: Missing secret key");
        }
    }

    async createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult> {
        // Skeleton only
        throw new Error("NOT_IMPLEMENTED_STRIPE_PROVIDER_V0");
    }

    async getCheckoutStatus(checkoutId: string): Promise<CheckoutStatus> {
        // Skeleton only
        throw new Error("NOT_IMPLEMENTED_STRIPE_PROVIDER_V0");
    }

    async verifyWebhook(payload: string | Buffer, signature?: string): Promise<boolean> {
        // Skeleton only - refuse all
        return false;
    }
}
