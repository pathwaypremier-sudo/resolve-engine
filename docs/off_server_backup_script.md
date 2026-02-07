# Off‑Server Evidence Backups (Daily) — Copy/Paste Guide

**Goal:** Keep evidence files safe even if the VPS is lost or compromised.

This uses a daily `tar.gz` backup uploaded to **S3‑compatible storage**
(Cloudflare R2 / Backblaze B2 / AWS S3).

---

## Prerequisites
- A bucket created in your provider.
- Access keys with write‑only permissions.
- The evidence directory path on VPS (Docker volume), e.g. `/srv/resolve/storage`.

---

## Environment Variables (on VPS)
Add to `.env.production` **or** `/etc/resolve/backup.env`:
```
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=resolve-evidence-backups
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
BACKUP_SOURCE_DIR=/srv/resolve/storage
BACKUP_RETENTION_DAYS=7
```

---

## Backup Script (save as `/usr/local/bin/resolve-backup.sh`)
```bash
#!/usr/bin/env bash
set -euo pipefail

STAMP=$(date +%Y-%m-%d_%H-%M)
TMP=/tmp/resolve_backup_$STAMP.tar.gz

# Load env
source /etc/resolve/backup.env

# Create archive
tar -czf "$TMP" -C "$BACKUP_SOURCE_DIR" .

# Upload (AWS CLI v2 compatible)
AWS_EC2_METADATA_DISABLED=true aws s3 cp "$TMP" "s3://$S3_BUCKET/$STAMP.tar.gz"   --endpoint-url "$S3_ENDPOINT" --region "$S3_REGION"

# Retention cleanup
aws s3 ls "s3://$S3_BUCKET/" --endpoint-url "$S3_ENDPOINT" |   awk '{print $4}' | sort | head -n "-$BACKUP_RETENTION_DAYS" |   while read -r old; do
    aws s3 rm "s3://$S3_BUCKET/$old" --endpoint-url "$S3_ENDPOINT"
  done

rm -f "$TMP"
```

Make executable:
```bash
chmod +x /usr/local/bin/resolve-backup.sh
```

---

## Schedule (Daily at 02:00)
```bash
crontab -e
```
Add:
```
0 2 * * * /usr/local/bin/resolve-backup.sh >> /var/log/resolve-backup.log 2>&1
```

---

## Restore
```bash
aws s3 cp s3://resolve-evidence-backups/<STAMP>.tar.gz restore.tar.gz   --endpoint-url "$S3_ENDPOINT"
tar -xzf restore.tar.gz -C /srv/resolve/storage
```

---

## Notes
- Keep keys **out of Git**.
- Test restore once.
- Combine with Hetzner snapshots for best protection.
