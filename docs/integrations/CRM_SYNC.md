# CRM Sync Integration Contract (V1)

## Goal
Provide an outbound-only synchronization boundary for case records and export packs while preserving:
- no legal advice / no outcome promises
- audit-grade, append-only event provenance
- local-first operation (stub mode supported)
- vertical containment (Parking only surfaced)

## Non-goals (V1)
- No inbound sync (no remote mutations of a case)
- No bidirectional conflict resolution
- No promises of delivery, acceptance, or processing by third parties
- No PII enrichment or data brokerage

## Concepts
- Sync target: a configured destination descriptor (e.g., webhook endpoint, CRM object type) stored as metadata, not secrets
- Sync payload: a deterministic, minimal representation of the case record and/or export pack index
- Idempotency key: a stable identifier derived from (caseId + exportChecksum or eventCursor) to ensure replay safety
- Delivery attempt: a single outbound attempt with captured result metadata

## Provenance events (append-only)
- CRM_SYNC_CONFIGURED { targetId, mode: "stub"|"webhook", notes? }
- CRM_SYNC_REQUESTED { targetId, scope: "case"|"export_pack", idempotencyKey }
- CRM_SYNC_ATTEMPTED { targetId, attemptId, atIso }
- CRM_SYNC_SUCCEEDED { targetId, attemptId, resultSummary? }
- CRM_SYNC_FAILED { targetId, attemptId, failureClass, retryable: boolean }

Notes:
- No raw payload blobs in events.
- No secrets in events.
- failureClass is a short, non-sensitive classifier (e.g., "NETWORK", "AUTH", "INVALID_CONFIG", "UNKNOWN").

## Stub mode (V1)
- Stub mode performs no network calls.
- It writes a deterministic payload to a local artifact (e.g., file or console) and emits SUCCEEDED with resultSummary indicating stub output location.
- Used only for development and CI verification; never claims real delivery.

## Payload (minimal)
Two allowed payload scopes:

### Case scope
- caseId
- verticalId (must be MOTORING_PARKING)
- lastEventAtIso
- key facts summary (already used in exports)
- evidence status
- storage metadata index (URIs + checksums only; no blobs)

### Export pack scope
- caseId
- exportPackId or export checksum
- generatedAtIso
- storage URI + checksum for the export pack artifact(s)

## Idempotency
- For case scope: idempotencyKey = "case:" + caseId + ":" + lastEventId (or equivalent stable cursor)
- For export pack scope: idempotencyKey = "export:" + caseId + ":" + exportChecksum
- Replays must not create duplicates beyond additional ATTEMPTED events; SUCCEEDED should be recorded once per idempotencyKey per targetId.

## UI/UX posture (later)
- UI may offer an optional “Sync to CRM (optional)” action.
- UI copy must be factual, calm, and avoid promises about outcomes or third-party processing.

## Security / privacy
- Do not transmit raw document contents via CRM sync in V1.
- Do not include any credentials in export packs or event logs.
- Prefer explicit user action (manual sync) over background sync in V1.
