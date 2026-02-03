# Payments Webhook Contract (V1 Provider Mode)

## Goal
- Accept provider webhook notifications to update checkout status and grant entitlements deterministically.

## Non-goals
- No promises of delivery, receipt, or processing by provider.
- No refunds automation.
- No subscription events.

## Verification requirement
- Webhooks must be verified using provider signature verification.
- Unverified webhooks must be rejected and logged as failed attempts (without secrets).

## Accepted webhook categories (generic)
- checkout.session.completed (or equivalent)
- payment.succeeded (or equivalent)
- checkout.session.expired / canceled (or equivalent)
*Note: Provider naming differs but categories map here.*

## Mapping to Resolve Engine events (existing only)
- On verified “paid/succeeded”:
  - PAYMENT_CHECKOUT_UPDATED { status: "PAID" }
  - Entitlement grant must go through reconciliation (Step 49) -> may emit ENTITLEMENT_GRANTED or NOOP
- On verified “failed”:
  - PAYMENT_CHECKOUT_UPDATED { status: "FAILED" }
- On verified “canceled/expired”:
  - PAYMENT_CHECKOUT_UPDATED { status: "CANCELED" }

## Idempotency
- Webhook deliveries may be retried.
- Idempotency key must include:
  - provider name
  - provider event id
  - checkoutId
- Replays must not duplicate entitlement state (ref Step 49).
- Event log remains append-only; state de-dupe allowed.

## Audit trail rules
- No raw webhook payloads stored in event log.
- Do not log secrets or full signatures.
- failureClass for verification failures: "UNVERIFIED_WEBHOOK" or "INVALID_SIGNATURE"

## Security & privacy
- No card data stored.
- No PII enrichment.
- Secrets only via environment variables.
