
# Release Readiness Checklist

## Production Build Verification
- [x] Webpack/Next.js Build (`npm run build`) succeeds.
- [x] Client-side hydration works (Suspense wrappers added).
- [x] CSS tokens and layout structure validated.

## Persistence
- [x] **Local Storage**: Default mode. Tested and robust.
- [x] **Remote Adapter (Beta)**:
   ### 3. Backend Persistence (Stub Mode)
- **Status**: Enabled via `NEXT_PUBLIC_PERSISTENCE_MODE=remote`.
- **Implementation**: `/api/persist` backed by SQLite (`better-sqlite3`).
- **Durability**:
    - Data persists across server restarts in `./data/resolve-engine.sqlite`.
    - NOT intended for production-scale (no auth, no multi-user isolation yet).
- **Hardening**:
    - Write serialization (Prevent race conditions).
    - Payload size limits enforced.
- **Privacy**: No raw document text is sent to remote; only metadata + confirmed facts.

## Audit Logging
- [x] Event history is append-only.
- [x] PII redacted in export packs.
- [x] Scan-first events recorded with factual metadata (no raw values).

## Known Limits
- **PDF OCR**: Limited to first 5 pages using browser-based Tesseract.js.
- **Remote Persistence**: See above. Durability is tied to server process lifetime.
