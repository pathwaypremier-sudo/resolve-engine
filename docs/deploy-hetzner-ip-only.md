# Hetzner VPS Deployment Guide (IP-Only, No Domain)

Deploy Resolve Engine to a Hetzner Cloud VPS accessible via IP address.

## Prerequisites

- Hetzner Cloud VPS (Ubuntu 22.04 LTS, minimum 2GB RAM)
- SSH access to the server
- Supabase Postgres `DATABASE_URL`

---

## 1. Server Setup

### Create Non-Root User

```bash
ssh root@YOUR_SERVER_IP
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
exit
ssh deploy@YOUR_SERVER_IP
```

### Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

---

## 2. Install Docker

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg

# Add Docker repository
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. Deploy Application

### Clone and Configure

```bash
cd ~
git clone https://github.com/YOUR_ORG/resolve-engine.git
cd resolve-engine

cp .env.production.example .env.production
nano .env.production

### Preflight Check (Recommended)
Validate your configuration before deploying:

```bash
npm run preflight
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Postgres connection string |
| `SESSION_SECRET` | 32+ char secret (generate: `openssl rand -base64 32`) |

> [!TIP]
> `APP_BASE_URL` is optional. The system auto-detects the correct URL from request headers.

### Build and Start

```bash
docker compose up -d --build
```

---

## 4. Smoke Check

```bash
curl http://localhost/api/health
```

**Expected response:**
```json
{"ok":true,"env":"production","timeIso":"...","webhookEnabled":false}
```

> [!TIP]
> If you see `{"ok":false,"error":"misconfigured"}`, check that `SESSION_SECRET` and `APP_BASE_URL` are set in `.env.production`.

---

## 5. Operations

### Logs
```bash
docker compose logs -f app        # Live logs
docker compose logs --tail 100 app # Last 100 lines
```

### Restart
```bash
docker compose restart app
```

### Update
```bash
git pull origin main
docker compose up -d --build
```

### Database Migrations
```bash
docker compose exec app npx prisma migrate deploy
```

---

## 6. Storage Paths

Evidence files and exports are stored in `.re_storage/` on the host:

```
.re_storage/
├── case/
│   └── <caseId>/
│       └── <docId>       # Uploaded evidence files
└── .health               # Health check marker (transient)
```

This directory is mounted as a Docker volume and persists across container restarts.

### Verify Storage

```bash
# Run storage smoke test inside container
docker compose exec app npx tsx scripts/storage-smoke-test.ts

# Or check directly on host
ls -la .re_storage/
```

### Backup

```bash
# Backup storage directory
tar -czvf re_storage_backup_$(date +%Y%m%d).tar.gz .re_storage/
```

---

## 7. Next Steps

1. **Add Domain** — Point DNS A record to server IP
2. **Enable HTTPS** — Add Caddy or nginx-proxy with Let's Encrypt
3. **Enable Payments** — Fill Stripe keys, set `WEBHOOK_ENABLED=1`
