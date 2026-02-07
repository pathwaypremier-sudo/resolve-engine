/**
 * Brain Store Server Module
 * SQLite persistence for Brain linkage and sources.
 * 
 * Tables:
 * - case_brain_links: case_id -> provider/notebook mapping
 * - brain_sources: tracked sources per case
 */

import { getDb } from "@/lib/persistence/db.server";

/**
 * Ensure brain schema exists.
 */
export function ensureBrainSchema(): void {
    const db = getDb();

    // Link table
    db.exec(`
        CREATE TABLE IF NOT EXISTS case_brain_links (
            case_id TEXT PRIMARY KEY,
            provider TEXT NOT NULL,
            notebook_id TEXT,
            notebook_url TEXT,
            pack_version TEXT NOT NULL,
            updated_at_iso TEXT NOT NULL
        )
    `);

    // Sources table
    db.exec(`
        CREATE TABLE IF NOT EXISTS brain_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            source_key TEXT NOT NULL,
            source_type TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            provider_source_id TEXT,
            added_at_iso TEXT NOT NULL,
            UNIQUE(case_id, source_key, content_hash)
        )
    `);

    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_brain_sources_case
        ON brain_sources(case_id)
    `);
}

/**
 * Upsert a brain link for a case.
 */
export function upsertCaseBrainLink(data: {
    caseId: string;
    provider: string;
    notebookId?: string;
    notebookUrl?: string;
    packVersion: string;
}): void {
    ensureBrainSchema();
    const db = getDb();

    const stmt = db.prepare(`
        INSERT INTO case_brain_links (case_id, provider, notebook_id, notebook_url, pack_version, updated_at_iso)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(case_id) DO UPDATE SET
            provider = excluded.provider,
            notebook_id = excluded.notebook_id,
            notebook_url = excluded.notebook_url,
            pack_version = excluded.pack_version,
            updated_at_iso = excluded.updated_at_iso
    `);

    stmt.run(
        data.caseId,
        data.provider,
        data.notebookId || null,
        data.notebookUrl || null,
        data.packVersion,
        new Date().toISOString()
    );
}

/**
 * Get brain link for a case.
 */
export function getCaseBrainLink(caseId: string): {
    provider: string;
    notebookId: string | null;
    notebookUrl: string | null;
    packVersion: string;
    updatedAtIso: string;
} | null {
    ensureBrainSchema();
    const db = getDb();

    const stmt = db.prepare(`
        SELECT provider, notebook_id, notebook_url, pack_version, updated_at_iso
        FROM case_brain_links WHERE case_id = ?
    `);

    const row = stmt.get(caseId) as {
        provider: string;
        notebook_id: string | null;
        notebook_url: string | null;
        pack_version: string;
        updated_at_iso: string;
    } | undefined;

    if (!row) return null;

    return {
        provider: row.provider,
        notebookId: row.notebook_id,
        notebookUrl: row.notebook_url,
        packVersion: row.pack_version,
        updatedAtIso: row.updated_at_iso
    };
}

/**
 * Upsert a brain source.
 * Returns true if inserted, false if already exists (deduped by content hash).
 */
export function upsertBrainSource(data: {
    caseId: string;
    sourceKey: string;
    sourceType: string;
    contentHash: string;
    providerSourceId?: string;
}): { inserted: boolean } {
    ensureBrainSchema();
    const db = getDb();

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO brain_sources 
        (case_id, source_key, source_type, content_hash, provider_source_id, added_at_iso)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        data.caseId,
        data.sourceKey,
        data.sourceType,
        data.contentHash,
        data.providerSourceId || null,
        new Date().toISOString()
    );

    return { inserted: result.changes > 0 };
}

/**
 * Count sources for a case.
 */
export function countSources(caseId: string): number {
    ensureBrainSchema();
    const db = getDb();

    const stmt = db.prepare("SELECT COUNT(*) as cnt FROM brain_sources WHERE case_id = ?");
    const row = stmt.get(caseId) as { cnt: number };
    return row.cnt;
}
