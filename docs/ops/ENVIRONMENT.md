# Environment Configuration

## Supported Environments
- **dev**: Local development (mocked services, local storage).
- **ci**: CI/CD pipeline (strict checks, mocked persistence).
- **production**: Live deployment (remote storage, strict security).

## Required Environment Variables

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_PERSISTENCE_MODE` | Persistence strategy. Set to `local` for dev/ci, `remote` for production. |
| `NEXT_PUBLIC_STORAGE_PROVIDER` | Storage backend. Defaults to `local-fs` if unset. |

## Optional / Dev-Only Variables

| Variable | Description |
| :--- | :--- |
| `NEXT_PUBLIC_DENY_ALL_POLICIES` | If `true`, locally rejects all authorization policies (dev testing). |
| `NEXT_PUBLIC_SIMULATE_LATENCY` | Milliseconds to simulate network delay in stubs (dev only). |

## Security & Secrets
> **NO SECRETS IN REPO.**

This repository is configured to **never** track `.env` files.
Store real secrets (API keys, credentials) in the deployment platform's secure environment variable manager (e.g., Vercel, AWS Secrets Manager).

## Defaults
If `NEXT_PUBLIC_PERSISTENCE_MODE` is unset, the system defaults to `local` (safe).
