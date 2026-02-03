# Real Payments Provider Contract (V2 Constraints)

## Purpose
- Enable real payment processing for gated exports while preserving neutrality and auditability.

## Non-goals
- No subscriptions in V2.
- No outcome-based pricing.
- No “pay to win” framing.
- No refunds automation claims.

## Provider requirements
- Must support:
  - idempotent checkout creation
  - webhook verification
  - deterministic receipt identifiers
- Must allow operation without storing card data.

## UX constraints
- No urgency language (“act now”, “avoid escalation”).
- No success framing (“increase chances”).
- Payments described as “service tier access” only.

## Audit & provenance rules
- Every payment state change emits append-only events.
- Webhooks must map to deterministic events.
- Failed or abandoned checkouts are preserved in logs.
- Entitlements are granted only after verified provider confirmation.

## Entitlement rules
- Entitlements are explicit, scoped, and revocable (future).
- Entitlements do not expire silently.
- Entitlements do not imply outcomes.

## Security & privacy
- No card data in app or logs.
- No secrets in repo.
- Provider secrets via environment only.

## Migration from Stub
- Stub provider remains available in dev.
- V2 provider is feature-flagged.
- Stub and real providers share the same contract interface.
