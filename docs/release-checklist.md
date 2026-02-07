# Release Checklist

## Pre-Flight Checks
- [ ] **Build**: Run `npm run build` locally. Must pass with no errors.
- [ ] **Tests**: Run `scripts/verify-assessment-logic.ts`. Must pass.
- [ ] **Environment**: Verify `.env` or injected environment variables match `env.server.ts` requirements.
    - `SESSION_SECRET`
    - `APP_BASE_URL`
    - `STRIPE_SECRET_KEY` (if checkout enabled)

## Deployment Steps
1. **Configure Flags**: Ensure `NEXT_PUBLIC_NOTEBOOKLM_ENABLED` is `false` (default) for initial rollout.
2. **Deploy**: Push to production environment (e.g., Vercel, Docker).
3. **Health Check**: Curl `https://<host>/api/health`.
   - Expect `200 OK`
   - Check `timestamp` is fresh.

## Post-Flight Verification
- [ ] **Logs**: Check configured log destination (e.g., CloudWatch) for immediate startup errors.
- [ ] **Smoke Test**: 
    - Log in as test user.
    - Create new case.
    - Upload 1 dummy document.
    - Navigate to Assessment.
    - Verify Verdict appears (even if UNCERTAIN).
- [ ] **Analytics**: Verify "Assessment Input Loaded" event appeared in logs.

## Rollback Plan
- If core flow breaks (500 errors), revert to previous commit immediately.
- If minor UI issue, fix forward using feature flags if applicable.
