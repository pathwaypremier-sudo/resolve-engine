# VPS Update Procedure

How to safely update the production application on your Hetzner VPS.

## 🚀 Standard Update

Run these commands to pull the latest code and deploy:

```bash
# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart container
# This minimizes downtime by building before stopping the old container
docker compose up -d --build

# 3. Verify health
docker compose exec app wget -qO- http://localhost:3000/api/health
```

## 🛡️ Safe Update Script

Create a script named `update.sh` in your project folder for one-command updates:

```bash
#!/bin/bash
set -e

echo "⬇️  Pulling latest changes..."
git pull origin main

echo "🛡️  Running preflight check..."
npm run preflight

echo "🏗️  Building image..."
docker compose build

echo "🔄 Deploying new container..."
docker compose up -d

echo "✅ Update complete!"
echo "Current logs:"
docker compose logs --tail 20 app
```

Make it executable:
```bash
chmod +x update.sh
```

Run it:
```bash
./update.sh
```

## ⏪ Rollback

If a new deployment is broken, you can quickly roll back to the previous commit.

### Method 1: Revert to previous commit
```bash
# 1. Checkout previous commit (HEAD^) or specific hash
git checkout HEAD^

# 2. Redeploy
docker compose up -d --build
```

### Method 2: Revert explicit bad commit
```bash
# 1. Create a revert commit (preserves history)
git revert HEAD

# 2. Deploy the revert
docker compose up -d --build
```

### Emergency Restore
If the database is corrupted, restore from your latest backup:
```bash
# Example restore (requires downtime)
docker compose down
rm -rf .re_storage/*
tar -xzvf re_storage_backup_LATEST.tar.gz
docker compose up -d
```
