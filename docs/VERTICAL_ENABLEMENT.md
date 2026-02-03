
# Vertical Enablement Contract

## 1. Definition
- **PUBLIC Vertical**: A dispute type fully exposed to end-users (e.g. `MOTORING_PARKING`).
- **HIDDEN Vertical**: A dispute type that exists in the system registry for planning or development but MUST NOT be visible or usable by end-users.

## 2. Rules for Public Release
A vertical may NOT become PUBLIC without satisfying all of the following:
1. **Constitutional Basis**: Approved guidebook defining the legal/procedural spine.
2. **Question Bank**: Fully implemented logical branch in `questions.ts`.
3. **Trigger Coverage**: Regression test snapshots included in `trigger-harness.ts`.
4. **UX Sign-Off**: Verification of copy and flow.
5. **Registry Change**: `visibility` flag set to `PUBLIC` in `verticals.ts`.

## 3. Usage of Hidden Verticals
Hidden verticals (e.g. `FLIGHT_DELAY`, `UTILITIES_COMPLAINT`):
- **MAY** exist in `verticals.ts` with `visibility: "HIDDEN"`.
- **MAY** have placeholder schemas in `verticalSchemas.ts`.
- **MAY** be referenced in `scripts/` or `docs/` or `src/lib/reasoning/` (for preparation).
- **MUST NOT** be referenced in User Interface components (`src/components/`).
- **MUST NOT** be referenced in copy or routing logic.

## 4. Enforcement
- **Storage Gate**: `CaseStorage` strictly defaults to `MOTORING_PARKING` if a hidden vertical is attempted.
- **CI Guard**: `npm run check:verticals` scans the codebase for leaked identifiers.
