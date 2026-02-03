# Email Outbox Integration Contract (V1)

## Goal
Allow users to generate an email-ready “send pack” (subject/body/attachments references)
without requiring a configured email domain/provider.

## Non-goals
- No automatic sending in V1
- No claims of delivery
- No legal advice

## Output artifact
An outbox item contains:
- id
- caseId
- createdAtIso
- to (string | null)
- subject (string)
- bodyText (string)
- attachments: [{ name, uri, checksumSha256, mime, sizeBytes }]
- status: DRAFT | READY | SENT | FAILED (SENT only when a real provider exists)

## Provenance events
- EMAIL_OUTBOX_CREATED
- EMAIL_OUTBOX_UPDATED
- EMAIL_SEND_REQUESTED (future)
- EMAIL_SEND_SUCCEEDED / FAILED (future)

Rules:
- attachments reference stored URIs only (no inline blobs)
- bodyText factual; no promises/advice

## UI placement (later step)
- Deliver page: “Create email draft” button that generates an outbox item.
