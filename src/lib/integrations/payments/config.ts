export type PaymentConfig = {
    provider: "stub" | "stripe";
    stripe: {
        secretKey?: string;
        publishableKey?: string;
    };
};

export function getPaymentConfig(): PaymentConfig {
    const providerStr = process.env.NEXT_PUBLIC_PAYMENTS_PROVIDER || "stub";
    const provider = (providerStr === "stripe" ? "stripe" : "stub") as "stub" | "stripe";

    // Secrets (Server-side only for secret key)
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    return {
        provider,
        stripe: {
            secretKey,
            publishableKey
        }
    };
}

export function validatePaymentConfig(): void {
    const config = getPaymentConfig();

    if (config.provider === "stripe") {
        if (!config.stripe.secretKey) {
            throw new Error("Payment misconfiguration: STRIPE_SECRET_KEY is required when provider is 'stripe'.");
        }
        if (!config.stripe.publishableKey) {
            throw new Error("Payment misconfiguration: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required when provider is 'stripe'.");
        }
    }
}
