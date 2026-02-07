/**
 * Payments Ledger and Entitlements Server-Only Module
 * SQLite-backed, using shared db.server.ts singleton.
 * 
 * Tables:
 * - payments_events: Immutable ledger of all payment events
 * - entitlements: Current entitlement state per actor
 */

import { getDb } from "@/lib/persistence/db.server";
import { createHash } from "node:crypto";

/**
 * Ensure payments schema exists.
 * Safe to call multiple times (idempotent).
 */
export function ensurePaymentsSchema(): void {
    const db = getDb();

    db.exec(`
        CREATE TABLE IF NOT EXISTS payments_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            provider_event_id TEXT NOT NULL UNIQUE,
            session_id TEXT,
            case_id TEXT,
            actor_id TEXT,
            tier TEXT,
            status TEXT NOT NULL,
            received_at_iso TEXT NOT NULL,
            raw_hash TEXT
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS entitlements (
            actor_id TEXT PRIMARY KEY,
            tier TEXT NOT NULL,
            active INTEGER NOT NULL,
            source_event_id TEXT NOT NULL,
            updated_at_iso TEXT NOT NULL
        )
    `);

    // Index for faster lookups
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_payments_events_actor
        ON payments_events(actor_id)
    `);
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_payments_events_case
        ON payments_events(case_id)
    `);
}

/**
 * Payment event status types.
 */
export type PaymentEventStatus = "PAID" | "FAILED" | "CANCELED" | "REFUNDED" | "DISPUTED";

/**
 * Payment event row shape.
 */
export type PaymentEventRow = {
    provider: string;
    providerEventId: string;
    sessionId: string | null;
    caseId: string | null;
    actorId: string | null;
    tier: string | null;
    status: PaymentEventStatus;
    receivedAtIso: string;
    rawHash: string | null;
};

/**
 * Insert a payment event if it doesn't already exist.
 * Uses UNIQUE constraint on provider_event_id for idempotency.
 * @returns { inserted: true } if new, { inserted: false } if already exists.
 */
export function insertPaymentEventIfNew(event: PaymentEventRow): { inserted: boolean } {
    ensurePaymentsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        INSERT OR IGNORE INTO payments_events
        (provider, provider_event_id, session_id, case_id, actor_id, tier, status, received_at_iso, raw_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
        event.provider,
        event.providerEventId,
        event.sessionId,
        event.caseId,
        event.actorId,
        event.tier,
        event.status,
        event.receivedAtIso,
        event.rawHash
    );

    return { inserted: result.changes > 0 };
}

/**
 * Grant or update an entitlement for an actor.
 * Sets tier, active=1.
 */
export function upsertEntitlementGrant(
    actorId: string,
    tier: string,
    sourceEventId: string
): void {
    ensurePaymentsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        INSERT INTO entitlements (actor_id, tier, active, source_event_id, updated_at_iso)
        VALUES (?, ?, 1, ?, ?)
        ON CONFLICT(actor_id) DO UPDATE SET
            tier = excluded.tier,
            active = 1,
            source_event_id = excluded.source_event_id,
            updated_at_iso = excluded.updated_at_iso
    `);

    stmt.run(actorId, tier, sourceEventId, new Date().toISOString());
}

/**
 * Revoke an entitlement for an actor.
 * Sets tier=NONE, active=0.
 */
export function upsertEntitlementRevoke(
    actorId: string,
    sourceEventId: string
): void {
    ensurePaymentsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        INSERT INTO entitlements (actor_id, tier, active, source_event_id, updated_at_iso)
        VALUES (?, 'NONE', 0, ?, ?)
        ON CONFLICT(actor_id) DO UPDATE SET
            tier = 'NONE',
            active = 0,
            source_event_id = excluded.source_event_id,
            updated_at_iso = excluded.updated_at_iso
    `);

    stmt.run(actorId, sourceEventId, new Date().toISOString());
}

/**
 * Get current entitlement for an actor.
 */
export function getEntitlement(actorId: string): {
    tier: string;
    active: boolean;
    sourceEventId: string;
    updatedAtIso: string;
} | null {
    ensurePaymentsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        SELECT tier, active, source_event_id, updated_at_iso
        FROM entitlements WHERE actor_id = ?
    `);

    const row = stmt.get(actorId) as {
        tier: string;
        active: number;
        source_event_id: string;
        updated_at_iso: string;
    } | undefined;

    if (!row) return null;

    return {
        tier: row.tier,
        active: row.active === 1,
        sourceEventId: row.source_event_id,
        updatedAtIso: row.updated_at_iso
    };
}

/**
 * Get recent payment events for an actor (for debugging).
 */
export function getPaymentEventsForActor(
    actorId: string,
    limit: number = 10
): Array<{
    id: number;
    provider: string;
    providerEventId: string;
    sessionId: string | null;
    caseId: string | null;
    tier: string | null;
    status: string;
    receivedAtIso: string;
}> {
    ensurePaymentsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        SELECT id, provider, provider_event_id, session_id, case_id, tier, status, received_at_iso
        FROM payments_events
        WHERE actor_id = ?
        ORDER BY id DESC
        LIMIT ?
    `);

    const rows = stmt.all(actorId, limit) as Array<{
        id: number;
        provider: string;
        provider_event_id: string;
        session_id: string | null;
        case_id: string | null;
        tier: string | null;
        status: string;
        received_at_iso: string;
    }>;

    return rows.map(row => ({
        id: row.id,
        provider: row.provider,
        providerEventId: row.provider_event_id,
        sessionId: row.session_id,
        caseId: row.case_id,
        tier: row.tier,
        status: row.status,
        receivedAtIso: row.received_at_iso
    }));
}

/**
 * Compute SHA256 hash of raw body bytes.
 */
export function computeRawHash(rawBody: Buffer): string {
    return createHash("sha256").update(rawBody).digest("hex");
}
