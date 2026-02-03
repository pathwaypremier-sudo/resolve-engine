
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Singleton connection to avoid multiple handles
let dbInstance: Database.Database | null = null;

function getDb() {
    if (dbInstance) return dbInstance;

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, "resolve-engine.sqlite");

    dbInstance = new Database(dbPath);
    dbInstance.pragma("journal_mode = WAL"); // Better concurrency

    // Init table
    dbInstance.exec(`
        CREATE TABLE IF NOT EXISTS kv_store (
            k TEXT PRIMARY KEY,
            v TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);

    return dbInstance;
}

export const sqliteDb = {
    get(key: string): { value: string; updated_at: string } | null {
        const db = getDb();
        const stmt = db.prepare("SELECT v, updated_at FROM kv_store WHERE k = ?");
        const row = stmt.get(key) as { v: string; updated_at: string } | undefined;
        if (!row) return null;
        return { value: row.v, updated_at: row.updated_at };
    },

    set(key: string, value: string): void {
        const db = getDb();
        const stmt = db.prepare(`
            INSERT INTO kv_store (k, v, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at
        `);
        stmt.run(key, value, new Date().toISOString());
    },

    del(key: string): void {
        const db = getDb();
        const stmt = db.prepare("DELETE FROM kv_store WHERE k = ?");
        stmt.run(key);
    }
};
