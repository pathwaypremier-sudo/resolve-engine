-- Admin & Operations Controls Migration
-- Apply this in the Supabase SQL Editor to enable admin functionality

-- 1. Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- 2. Create app_settings table for operational toggles
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by TEXT
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- 3. Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    metadata JSONB,
    ip TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);

-- 4. Insert default settings
INSERT INTO app_settings (key, value, updated_by) VALUES 
    ('uploads_enabled', '{"enabled": true}', 'system'),
    ('maintenance_mode', '{"enabled": false, "message": null}', 'system')
ON CONFLICT (key) DO NOTHING;

-- Verify migration
SELECT 'Migration complete' as status;
