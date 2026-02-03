# CI/Ops Runbook

## Local Development (Quickstart)

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

## Verification Commands (CI)
These commands are enforced in the CI pipeline.

### 1. Type Check
```bash
npx tsc --noEmit
```
Ensures strict TypeScript compliance. No strictness flags are disabled.

### 2. Smoke Tests
```bash
npm run rc-smoke
```
Runs a fast set of unit/integration checks (stubbed auth, CRM sync, basic logic).

### 3. Release Candidate (Final)
```bash
npm run rc-final
```
High-level verification suite:
- Validates build integrity.
- Checks copy compliance (grep).
- Runs end-to-end flows (e.g., Intake -> Assessment -> Deliver).
- Verifies disaster recovery proof (determinism).

## Deployment
For detailed deployment instructions and environment configuration, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Production Build & Start
```bash
npm ci
npm run build
npm run start -- -p 3000
```

## Troubleshooting
- **`rc-final` fails**: Check `build_err.txt` or the console output. Common causes: copy violations ("guarantee"), missing mock data in tests.
- **Persistence errors**: Verify `NEXT_PUBLIC_PERSISTENCE_MODE`. If `remote`, ensure backend API is reachable.
- **Determinism failures**: Ensure `generated_at` timestamps are mocked or normalized in the DR proof script.
- **Bundling errors**: If `fs` or `better-sqlite3` errors appear in the browser, verify server-side isolation in `PersistenceAdapter.ts`.
