# Release Checklist (2026-02-02)

## Scope
- **Vertical**: Parking V1 (Motoring/PCN) only.
- **Containment**: Hidden vertical surfaces are strictly contained.

## Constitutional Constraints
- No legal advice provided.
- No outcome promises made.
- Case-based approach maintained.

## Automated Verification
- `npx tsc --noEmit`: PASS
- `npm run rc-smoke`: PASS
- `npm run rc-final`: PASS
- Proof scripts (all PASS): verify_payment_export, crm_sync_stub, auth_stub_check, remote_persistence_hardening_check, disaster_recovery_proof

## Auditability Verification
- [x] Event log is append-only.
- [x] Provenance index is present in exports.
- [x] Exports are reproducible (verified via DR proof).
- [x] No raw binary blobs in events (metadata only).

## Integrations Status
- **Storage**: DONE
- **Email Outbox**: DONE
- **Payments**: DONE (stub entitlement + gating)
- **CRM Sync**: DONE (stub + idempotency)
- **Auth**: DONE (stub + policy evaluation log)
- **Remote Persistence Hardening**: DONE
- **DR Proof**: DONE (verified via `disaster_recovery_proof.ts`)

## Manual Smoke
*Execution status: SKIPPED (LOCALHOST_NOT_ACCESSIBLE)*

### Checkpoints
- [ ] Create new case
- [ ] Intake scan (upload + confirm)
- [ ] Intake docs upload
- [ ] Assessment (questions + dispute type change)
- [ ] Deliver gating (blocked -> unblocked)
- [ ] Final export gating (gated -> stub entitlement -> unblocked)
- [ ] Export Pack JSON verification (verticalId, provenance, metadata)

> **Note**: Manual smoke testing steps were not executed in this CI/Automated environment.
> Browser tool attempted but failed (env var missing).
> Relying on `verify-e2e-rc.ts` and Proof Scripts for assurance.
