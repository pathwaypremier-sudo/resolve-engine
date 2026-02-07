import { Pool } from 'pg';
import { log } from '@/lib/telemetry/log';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env and .env.local
dotenv.config(); // .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    throw new Error("[DB] DATABASE_URL missing; refusing localhost fallback. Ensure .env or .env.local is present.");
}

// Log hostname once on module load
try {
    const host = new URL(DATABASE_URL).host;
    log.info(`[DB] Initializing Pool with host: ${host}`);
} catch (e) {
    log.error("[DB] Invalid DATABASE_URL format");
}

// Singleton pattern to prevent exhausting database connections in dev (hot reload)
const globalForPg = global as unknown as { pgPool: Pool };

export const pool = globalForPg.pgPool || new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = pool;
