import { PaymentProvider } from "./PaymentProvider";
import { StubPaymentProvider } from "./providers/StubPaymentProvider";
import { StripePaymentProvider } from "./providers/StripePaymentProvider";
import { getPaymentConfig, validatePaymentConfig } from "./config";

// Singleton instance to avoid re-initialization overhead if providers become heavy
let providerInstance: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
    if (providerInstance) return providerInstance;

    const config = getPaymentConfig();

    // Validate mainly for non-stub, but good practice to check early
    // Note: getPaymentProvider might be called on client or server. 
    // Validation that checks for SECRET keys should probably be server-side only or handle client context gracefully.
    // However, STRIPE_SECRET_KEY is usually not available on client.
    // For now, if code tries to init stripe on client, it might fail validation if secret is missing? 
    // Actually, createCheckout (where secret is used) is usually a server action or API route.
    // Let's rely on the config loader.

    switch (config.provider) {
        case "stub":
            providerInstance = new StubPaymentProvider();
            break;
        case "stripe":
            validatePaymentConfig(); // Will throw if keys missing
            providerInstance = new StripePaymentProvider();
            break;
        default:
            console.warn(`Unknown provider '${config.provider}', falling back to stub.`);
            providerInstance = new StubPaymentProvider();
    }

    return providerInstance;
}
