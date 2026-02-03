# Payments Integration Contract (V1)

## Goal
Provide a payment boundary for paid exports/checkout while preserving:
- no outcome promises
- audit-grade provenance
- local-first operation (stub mode)

## Non-goals
- No Stripe account required for V1 contract + stub
- No subscription complexity in V1
- No refunds automation promises

## Concepts
- Entitlement: a case-level capability flag that permits gated actions (e.g., “Generate final export pack”)
- Checkout session: an external provider session (Stripe later), represented as a record with status

## Provenance events (append-only)
- PAYMENT_CHECKOUT_CREATED { provider: "stub"|"stripe", amountPence, currency, purpose }
- PAYMENT_CHECKOUT_UPDATED { status }
- ENTITLEMENT_GRANTED { entitlementKey, scope: "case", caseId }
- ENTITLEMENT_REVOKED (optional, V2)

## States
Checkout status: CREATED | PENDING | PAID | FAILED | CANCELED

## Stub mode (V1)
- A “Simulate payment” action exists only in dev mode.
- It grants entitlement via ENTITLEMENT_GRANTED with provider "stub".
- No claims of real payment processing.

## Export gating rule
- If a gated export is requested without entitlement:
  - block with factual UI panel
  - allow generating a non-final preview export if currently supported (optional)

## Data model (minimal)
- case.entitlements: [{ key, grantedAtIso, provider, evidence }]
- case.checkouts: [{ id, provider, status, amountPence, currency, createdAtIso }]
