import { Pool } from 'pg';
import { log } from '@/lib/telemetry/log';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env and .env.local (used in scripts and dev)
dotenv.config(); // .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

// Singleton pattern to prevent exhausting database connections in dev (hot reload)
const globalForPg = global as unknown as { pgPool: Pool | null; poolInitialized: boolean };

let _pool: Pool | null = globalForPg.pgPool || null;
let _poolInitialized = globalForPg.poolInitialized || false;

/**
 * Get the database pool, initializing lazily on first access.
 * This allows the build to succeed without DATABASE_URL set.
 * @throws Error if DATABASE_URL is not set when pool is actually needed.
 */
function getPool(): Pool {
    if (_poolInitialized && _pool) {
        return _pool;
    }

    const DATABASE_URL = process.env.DATABASE_URL;

    if (!DATABASE_URL) {
        throw new Error(
            "[DB] DATABASE_URL missing; refusing localhost fallback. " +
            "Ensure DATABASE_URL is set in environment variables."
        );
    }

    // Log hostname once on first access
    try {
        const host = new URL(DATABASE_URL).host;
        log.info(`[DB] Initializing Pool with host: ${host}`);
    } catch (e) {
        log.error("[DB] Invalid DATABASE_URL format");
    }

    _pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    _poolInitialized = true;

    // Cache in global for dev hot reload
    if (process.env.NODE_ENV !== 'production') {
        globalForPg.pgPool = _pool;
        globalForPg.poolInitialized = true;
    }

    return _pool;
}

/**
 * Lazy pool accessor - use this instead of direct pool access.
 * The pool is only initialized when first accessed at runtime.
 */
export const pool = new Proxy({} as Pool, {
    get(_target, prop) {
        const realPool = getPool();
        const value = (realPool as any)[prop];
        if (typeof value === 'function') {
            return value.bind(realPool);
        }
        return value;
    }
});

