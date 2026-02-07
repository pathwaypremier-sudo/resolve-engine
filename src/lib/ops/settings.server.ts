/**
 * App Settings Management
 * 
 * Manages application-wide settings stored in app_settings table.
 * Includes light in-memory caching (30s) to reduce DB load.
 */

import { getAppSetting, setAppSetting as dbSetAppSetting } from '@/lib/db/repo.server';
import { logAdminAction, extractRequestContext } from '@/lib/audit/adminAudit.server';

// --- Types ---

export type SettingValue = {
    enabled: boolean;
    message?: string;
    [key: string]: any;
};

// --- Cache ---

type CacheEntry = {
    value: SettingValue | null;
    expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function getCached(key: string): SettingValue | null | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
    }
    return entry.value;
}

function setCache(key: string, value: SettingValue | null): void {
    cache.set(key, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS
    });
}

function invalidateCache(key: string): void {
    cache.delete(key);
}

// --- Public API ---

/**
 * Get a setting value by key.
 * Uses in-memory cache with 30s TTL.
 */
export async function getSetting(key: string): Promise<SettingValue | null> {
    // Check cache first
    const cached = getCached(key);
    if (cached !== undefined) {
        return cached;
    }

    // Fetch from DB
    const setting = await getAppSetting(key);
    const value = setting?.value ?? null;
    setCache(key, value);
    return value;
}

/**
 * Set a setting value with audit logging.
 * 
 * @param key - Setting key
 * @param value - Setting value (will be stored as JSONB)
 * @param actorUserId - ID of the user making the change
 * @param req - Optional request for extracting IP/user-agent
 */
export async function setSetting(
    key: string,
    value: SettingValue,
    actorUserId: string,
    req?: Request
): Promise<void> {
    // Get old value for audit log
    const oldSetting = await getAppSetting(key);
    const oldValue = oldSetting?.value ?? null;

    // Update in DB
    await dbSetAppSetting(key, value, actorUserId);

    // Invalidate cache
    invalidateCache(key);

    // Extract request context if available
    const context = req ? extractRequestContext(req) : { ip: 'system', userAgent: 'system' };

    // Log the change
    await logAdminAction({
        actorUserId,
        action: `setting.${key}.updated`,
        targetType: 'app_setting',
        targetId: key,
        metadata: {
            oldValue,
            newValue: value
        },
        ip: context.ip,
        userAgent: context.userAgent
    });
}

// --- Helper Functions ---

/**
 * Check if file uploads are enabled.
 * Defaults to true if setting doesn't exist.
 */
export async function isUploadsEnabled(): Promise<boolean> {
    const setting = await getSetting('uploads_enabled');
    if (!setting) return true; // Default: uploads enabled
    return setting.enabled !== false;
}

/**
 * Get maintenance mode status.
 * Returns { enabled: false } if setting doesn't exist.
 */
export async function getMaintenanceMode(): Promise<{ enabled: boolean; message?: string }> {
    const setting = await getSetting('maintenance_mode');
    if (!setting) return { enabled: false };
    return {
        enabled: setting.enabled === true,
        message: setting.message
    };
}

/**
 * Clear the settings cache (useful for testing).
 */
export function clearSettingsCache(): void {
    cache.clear();
}
