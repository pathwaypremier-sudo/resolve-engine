
# Release Candidate Checklist: Motoring/Parking V1

**Target**: `project-resolve-engine-v1`
**Active Vertical**: `MOTORING_PARKING`
**Hidden Verticals**: `FLIGHT_DELAY`, `UTILITIES_COMPLAINT`, `TELECOMS_COMPLAINT`, `HOUSING_HMO` (Must stay HIDDEN)

---

## 1. Automated Checks (Stop-Ship)
Run the smoke script `npm run rc-smoke` which executes:
- [ ] **Type Check**: `npx tsc --noEmit` (Must be clean)
- [ ] **Copy Compliance**: `npm run check:copy` (No "advice" words)
- [ ] **Trigger Regressions**: `npm run check:triggers` (Snapshots match)
- [ ] **Vertical Containment**: `npm run check:verticals` (No hidden vertical leaks)

## 2. Manual Smoke Tests
Perform these steps in a clean local environment or staging build.

### A. Intaking & OCR
- [ ] **Scan First**: Upload a sample PCN image. Verify partial field extraction.
- [ ] **PDF Support**: Upload a single-page PDF. Verify generic placeholder or extraction if enabled.
- [ ] **No Evidence**: select "I don't have it handy" -> ensure manual entry form loads.

### B. Assessment Flow
- [ ] **Questionnaire**: Complete the flow for a "Council" PCN.
- [ ] **Dynamic Gating**: Verify that `ref_check` only appears if Reference Number is missing/ambiguous.
- [ ] **Vertical Default**: Verify no options for "Flight Delay" or other verticals appear in the UI.

### C. Gating & Readiness
- [ ] **Not Ready State**: Leave "Summary" blank -> Verify "Drafting Unavailable" on Assessment page.
- [ ] **Ready State**: Fill all required fields -> Verify "View Draft" button is active.

### D. Export Pack (JSON)
- [ ] **Download**: Generate JSON pack from `/reasoning` or dev-route (if enabled).
- [ ] **Schema Check**:
    - `verticalId` is "MOTORING_PARKING".
    - No PII in `notes` or `summary`.
    - No `rawText` or `ocrText` fields (Privacy Scrub).

### E. Remote Persistence (Optional / if Configured)
- [ ] **Durability**: 
    - Set `NEXT_PUBLIC_PERSISTENCE_MODE=remote`.
    - Create a case.
    - Restart server.
    - Verify case data exists.
    - **Note**: This is critical if deploying with the SQLite stub.

---

## 3. Data Handling & Security
- **Local-First**: Default mode relies on `localStorage`. Clearing browser data wipes cases.
- **Privacy**: No raw text sent to remote unless `NEXT_PUBLIC_PERSISTENCE_MODE=remote`.
- **Hidden Verticals**: Must remain in `src/lib/verticals/verticals.ts` with `visibility: "HIDDEN"`.

## 4. Versioning Notes
- This is **V1 (RC)**.
- Schema version: `2026-01-31-01` (Questionnaire).
- Breaking changes to `questions.ts` or `exports` require a major version bump.
