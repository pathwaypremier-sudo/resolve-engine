/**
 * Shared SQLite Database Connection (Server-Only)
 * 
 * Single source of truth for database access.
 * All server-side modules should import from here.
 */

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Singleton connection
let dbInstance: Database.Database | null = null;

/**
 * Get the shared database instance.
 * Creates and initializes if not already connected.
 */
export function getDb(): Database.Database {
    if (dbInstance) return dbInstance;

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, "resolve-engine.sqlite");

    dbInstance = new Database(dbPath);
    dbInstance.pragma("journal_mode = WAL"); // Better concurrency

    return dbInstance;
}

/**
 * Export the Database type for type annotations.
 */
export type { Database };
