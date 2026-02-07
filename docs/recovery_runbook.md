# Resolve — One‑Page Recovery Runbook (Production)

**Purpose:** Restore service quickly and safely after compromise, outage, or data loss.

## What must be recoverable
1. **Source Code** — Git repository (canonical).
2. **Database** — Supabase Postgres (managed backups).
3. **Evidence Files** — Local VPS storage (Docker volume).
4. **Secrets** — DATABASE_URL, WEBHOOK_SECRET, API keys.

---

## Incident Response (First 10 minutes)
1. **Freeze access**
   - Disable public access if possible (firewall / stop container).
2. **Preserve state**
   - Do not delete the server yet; snapshots may be needed.
3. **Assess scope**
   - App outage vs. suspected compromise.

---

## Recovery Paths

### A) App outage (no compromise suspected)
1. SSH to VPS.
2. Check health:
   ```bash
   curl http://<SERVER_IP>/api/health
   ```
3. Restart app:
   ```bash
   docker compose up -d --build
   docker compose logs -f --tail=200
   ```

### B) VPS compromise suspected
1. **Power off VPS** (Hetzner console).
2. **Restore from snapshot** (Hetzner Backups).
3. **Rotate secrets immediately**
   - Supabase DB password.
   - WEBHOOK_SECRET.
   - Any API keys.
4. **Redeploy**
   ```bash
   git pull
   npm run preflight
   docker compose up -d --build
   ```

### C) Data loss (evidence files)
1. Restore VPS from snapshot **or**
2. Restore latest off‑server backup (see backup doc).
3. Verify file integrity and permissions.

---

## Verification Checklist
- `/api/health` returns OK.
- Create a test case.
- Upload/download evidence.
- Run assessment end‑to‑end.
- Smoke test passes.

---

## Preventive Controls
- Hetzner automatic backups: **ON**
- Supabase managed backups: **ON**
- GitHub 2FA: **ON**
- Least‑privilege admin access.
- NotebookLM feature flag default: **OFF**

**Owner:** Engineering Lead  
**Last Reviewed:** <DATE>
