
import { getDb } from "./db.server";

// Ensure schema exists
function ensureKVSchema() {
    const db = getDb();
    db.exec(`
        CREATE TABLE IF NOT EXISTS kv_store (
            k TEXT PRIMARY KEY,
            v TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    `);
}

export const sqliteDb = {
    get(key: string): { value: string; updated_at: string } | null {
        ensureKVSchema();
        const db = getDb();
        const stmt = db.prepare("SELECT v, updated_at FROM kv_store WHERE k = ?");
        const row = stmt.get(key) as { v: string; updated_at: string } | undefined;
        if (!row) return null;
        return { value: row.v, updated_at: row.updated_at };
    },

    set(key: string, value: string): void {
        ensureKVSchema();
        const db = getDb();
        const stmt = db.prepare(`
            INSERT INTO kv_store (k, v, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(k) DO UPDATE SET v = excluded.v, updated_at = excluded.updated_at
        `);
        stmt.run(key, value, new Date().toISOString());
    },

    del(key: string): void {
        ensureKVSchema();
        const db = getDb();
        const stmt = db.prepare("DELETE FROM kv_store WHERE k = ?");
        stmt.run(key);
    }
};
