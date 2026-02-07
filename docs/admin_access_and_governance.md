# Admin Access & Governance (Production)

**Purpose:** Ensure business‑grade control, auditability, and continuity.

---

## Roles
- **Owner (2 max):**
  - Full access (infra, DB, billing).
- **Admin:**
  - App management, user support, no billing.
- **Operator (optional):**
  - Read‑only logs/metrics.

---

## Access Controls

### Infrastructure (Hetzner)
- SSH keys only (no passwords).
- Separate admin SSH keys per person.
- Disable root login after setup.
- Enable automatic backups.

### Application
- Admin users flagged in DB (`users.is_admin`).
- Admin routes guarded server‑side.
- No client‑side admin trust.

### Database (Supabase)
- Use primary DB role only on server.
- Rotate DB password on staff changes.
- Never expose service role keys to client.

---

## Secrets Management
- Store all secrets in a password manager.
- Never email or Slack secrets.
- Rotate on:
  - staff change
  - suspected compromise
  - quarterly (recommended)

---

## Audit & Logging
- Structured logs only (no evidence text).
- Retain logs 14–30 days.
- Monitor:
  - auth failures
  - pack downloads
  - admin actions

---

## Business Continuity
- At least **two owners** with access.
- One printed emergency checklist (offline).
- Monthly restore drill (15 minutes).

**Approved By:** <NAME>  
**Last Reviewed:** <DATE>
