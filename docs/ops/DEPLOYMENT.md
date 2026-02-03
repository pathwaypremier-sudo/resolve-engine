# Deployment Guide

This document provides instructions for deploying and operating the Resolve Engine in production.

## Supported deployment targets
- Node server (Standard Next.js standalone or `npm run start`)

## Build and start commands (production)
```bash
# 1. Install dependencies (clean install)
npm ci

# 2. Build for production
npm run build

# 3. Start production server
npm run start -- -p 3000
```

## Environment matrix

| Variable | Dev? | Prod? | Default | Notes / Safety |
| :--- | :--- | :--- | :--- | :--- |
| `PORT` | Opt | Opt | `3000` | Standard Node port. |
| `NEXT_PUBLIC_PERSISTENCE_MODE` | Req | Req | `local` | `local` (localStorage) or `remote` (API). |
| `NEXT_PUBLIC_STORAGE_PROVIDER` | Req | Req | `local-fs` | `local-fs` or `s3`. |
| `NEXT_PUBLIC_PAYMENTS_PROVIDER` | Req | Req | `stub` | Use `stub` for testing, `stripe` for prod. |
| `STRIPE_SECRET_KEY` | No | Opt | — | Required only if stripe enabled. Never commit. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Opt | — | Required only if stripe enabled. |
| `NEXT_PUBLIC_DENY_ALL_POLICIES` | No | No | `false` | Emergency posture: if enabled, access is denied by policy gate. Use intentionally; audit trail required. |
| `NEXT_PUBLIC_SIMULATE_LATENCY` | No | No | `0` | **Dev-only**. Simulates network delay in stubs. |

## Production safety checklist
- **Webhook Stubs**: The `/api/payments/webhook` route is guarded by `NODE_ENV !== "production"` and is inaccessible in prod.
- **Payment Simulation**: The "Simulate payment" tool in `DeliverPage` is excluded from production builds.
- **Vertical Leaks**: Enforcement scripts (`check-vertical-leaks.mjs`) are run during `rc-final`.
- **Secrets**: No secrets are stored in the repository. Provide them via environment only.

## Verification before deploy
1. **Type Check**: `npx tsc --noEmit`
2. **Smoke Test**: `npm run rc-smoke`
3. **E2E Check**: `npm run rc-final`
4. **Local Build**: `npm run build`
5. **Local Start**: `npm run start -- -p 3000`
6. **Connectivity**: `curl.exe -I http://127.0.0.1:3000/app`

## Troubleshooting
- **ERR_CONNECTION_REFUSED**: Usually means the process crashed on start or is bound to the wrong interface. Check `0.0.0.0` vs `127.0.0.1`.
- **better-sqlite3 errors**: Native modules must be isolated. Check `PersistenceAdapter.server.ts` and ensure it's not bundled in the client.
- **Port Conflicts**: Ensure port `3000` (or your configured `PORT`) is not in use by another process.

## Audit logging (optional)
To enable structured audit logging, set `AUDIT_LOG_ENABLED=1`. 
- Logs are emitted to standard output as JSON records.
- Logs include `eventType`, `caseId`, `atIso`, and context-specific metadata.
- **Privacy Safety**: Audit logs never contain PII, raw document content, or secrets. URIs and checksums may be included for traceability.
