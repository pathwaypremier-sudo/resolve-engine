# Storage Integration Contract (V1)

## Goal
Provide a pluggable storage provider for case documents/evidence that:
- preserves local-first behavior
- supports a future cloud provider without changing app flows
- emits append-only provenance events for every storage action
- is exportable/auditable

## Non-goals
- No user accounts/auth changes
- No legal advice or outcome promises
- No background sync claims

## Provider interface (normative)
A StorageProvider MUST implement:
- put(caseId, docId, blob, meta) -> { uri, checksumSha256, sizeBytes, storedAtIso }
- get(uri) -> blob
- stat(uri) -> { checksumSha256, sizeBytes } | null
- delete(uri) -> { deletedAtIso } | null  (optional for V1)
- health() -> { ok: boolean, detail?: string }

## Modes
- local (default): stores blobs on disk in dev, referenced by file:// style URI or local opaque URI
- cloud (stub): interface only; no runtime usage until configured

## Provenance events (append-only)
All events include:
- caseId, docId (where applicable), atIso, actor ("user" | "system"), providerId

Events:
1) STORAGE_PUT_REQUESTED
   meta: { filename, mime, sizeBytes }
2) STORAGE_PUT_SUCCEEDED
   meta: { uri, checksumSha256, sizeBytes }
3) STORAGE_PUT_FAILED
   meta: { errorCode, messageSafe, retryable: boolean }
4) STORAGE_GET_REQUESTED
5) STORAGE_GET_FAILED / STORAGE_GET_SUCCEEDED
6) STORAGE_HEALTH_CHECK (optional)

Rules:
- never store raw blob bytes in the event log
- messageSafe must be factual and non-sensitive
- checksum used for integrity only

## Export expectations
Export pack MUST include:
- document index with storage URIs (when stored)
- OCR provenance unchanged
- provenance_index includes storage provider + checksum for docs (when present)

## Failure posture
- If storage put fails: doc is still recorded in case state as "NOT_STORED" with reason, and Deliver/export must remain factual.
- No automatic retries unless explicitly implemented with logged retry events.

## Local implementation note (V1)
Local provider writes blobs under:
- ./.re_storage/case/<caseId>/<docId>
and returns URI:
- re-local://case/<caseId>/doc/<docId>
