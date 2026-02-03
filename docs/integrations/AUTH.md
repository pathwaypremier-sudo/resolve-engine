# Auth Integration Contract (V1)

## Goal
Introduce an identity and session boundary for Resolve Engine while preserving:
- no legal advice / no outcome promises
- audit-grade, append-only provenance
- local-first operation (stub mode supported)
- vertical containment (Parking only surfaced)

Auth in Resolve Engine is a *policy gate*, not a trust claim. The product does not imply verification, legitimacy, or authority.

## Non-goals (V1)
- No promises of security guarantees or identity verification
- No complex RBAC administration UI
- No multi-tenant enterprise features
- No SSO/SCIM commitments
- No legal compliance claims (e.g., “GDPR compliant”) in product copy

## Concepts
- Identity: a stable user identifier (may be local-only in stub mode)
- Session: an authenticated context for a request/interaction
- Policy gate: a boolean decision that permits or blocks actions (e.g., export, sync), recorded as facts where relevant
- Actor: the entity that performed an action (user/system), referenced in events where applicable

## Modes
- stub: local dev identity, no external provider
- provider: external identity provider (later), abstracted behind a contract

## Provenance events (append-only)
- AUTH_SESSION_STARTED { actorId, mode: "stub"|"provider", sessionId }
- AUTH_SESSION_ENDED { sessionId, reason }
- AUTH_POLICY_EVALUATED { policyKey, decision: "ALLOW"|"DENY", reasonCode }
- AUTH_ACTOR_BOUND { actorId, caseId } (optional; if actor is attached to a case workspace)

Notes:
- No secrets in events.
- No raw tokens in events.
- reasonCode must be short and non-sensitive (e.g., "MISSING_SESSION", "POLICY_DISABLED", "INSUFFICIENT_ROLE").

## Policy gates (illustrative; not promises)
Policy keys are stable strings. Examples:
- EXPORT_FINAL_PACK
- CRM_SYNC
- REMOTE_PERSISTENCE
- ADMIN_DEV_TOOLS (dev-only)

Gates must be enforceable without implying outcomes or security guarantees.

## Data model (minimal)
- identity: { actorId, mode, createdAtIso }
- session: { sessionId, actorId, startedAtIso, endedAtIso? }
- policy: { policyKey, decision, evaluatedAtIso, reasonCode }

## UI/UX posture
- Auth UI (if present later) must be factual and minimal.
- Never claim “verified”, “secure”, “official”, “guaranteed”.
- When blocking an action, explain factually which gate is missing and how to proceed (without recommendations).

## Security / privacy
- Treat tokens and credentials as secrets: never export, never log in events.
- Avoid collecting additional personal information in V1 unless strictly required.
