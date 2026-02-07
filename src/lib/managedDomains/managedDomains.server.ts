/**
 * Managed Domains Server Module
 * Handles domain pool allocation for Managed tier cases.
 * 
 * Tables:
 * - managed_domain_allocations: case_id -> domain mapping (immutable once set)
 * - managed_domain_status: domain deliverability verification status
 */

import { getDb } from "@/lib/persistence/db.server";
import { auditLog } from "@/lib/ops/auditLog.server";

/**
 * Ensure managed domains schema exists.
 */
export function ensureManagedDomainsSchema(): void {
    const db = getDb();

    // Domain allocations: case_id -> domain (one domain per case, immutable)
    db.exec(`
        CREATE TABLE IF NOT EXISTS managed_domain_allocations (
            case_id TEXT PRIMARY KEY,
            domain TEXT NOT NULL,
            allocated_at_iso TEXT NOT NULL
        )
    `);

    // Domain status: deliverability verification
    db.exec(`
        CREATE TABLE IF NOT EXISTS managed_domain_status (
            domain TEXT PRIMARY KEY,
            spf_ok INTEGER NOT NULL DEFAULT 0,
            dkim_ok INTEGER NOT NULL DEFAULT 0,
            dmarc_ok INTEGER NOT NULL DEFAULT 0,
            verified_at_iso TEXT,
            notes TEXT
        )
    `);

    // Index for reverse lookup
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_allocations_domain
        ON managed_domain_allocations(domain)
    `);
}

/**
 * Simple domain validation regex.
 * Conservative: allows standard domain characters.
 */
function isValidDomain(domain: string): boolean {
    // Basic domain pattern: letters, numbers, hyphens, dots
    // Must have at least one dot and end with letters
    const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
    return pattern.test(domain);
}

/**
 * Get domain pool from environment.
 * Normalizes: split, trim, lowercase, dedupe, filter invalid.
 */
export function getDomainPool(): string[] {
    const pool = process.env.MANAGED_DOMAIN_POOL;
    if (!pool) return [];

    const domains = pool
        .split(",")
        .map(d => d.trim().toLowerCase())
        .filter(d => d.length > 0);

    // Dedupe using Set
    const unique = [...new Set(domains)];

    // Filter out obviously invalid domains
    return unique.filter(isValidDomain);
}

/**
 * Get default case email domain from environment.
 */
export function getDefaultEmailDomain(): string {
    return process.env.CASE_EMAIL_DOMAIN || "resolveapp.com";
}

/**
 * Get existing domain allocation for a case.
 */
export function getDomainForCase(caseId: string): string | null {
    ensureManagedDomainsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        SELECT domain FROM managed_domain_allocations WHERE case_id = ?
    `);
    const row = stmt.get(caseId) as { domain: string } | undefined;

    return row?.domain || null;
}

/**
 * Count allocations per domain.
 */
function getAllocationCounts(): Map<string, number> {
    const db = getDb();
    const stmt = db.prepare(`
        SELECT domain, COUNT(*) as cnt FROM managed_domain_allocations GROUP BY domain
    `);
    const rows = stmt.all() as Array<{ domain: string; cnt: number }>;

    const counts = new Map<string, number>();
    for (const row of rows) {
        counts.set(row.domain, row.cnt);
    }
    return counts;
}

/**
 * Allocate a domain for a case.
 * Uses round-robin allocation (picks domain with fewest allocations).
 * 
 * @returns allocated domain or null if pool is empty
 */
export function allocateDomainForCase(caseId: string): string | null {
    ensureManagedDomainsSchema();
    const db = getDb();

    // Check existing allocation
    const existing = getDomainForCase(caseId);
    if (existing) {
        return existing; // Immutable - return existing
    }

    const pool = getDomainPool();
    if (pool.length === 0) {
        auditLog({ eventType: "MANAGED_DOMAIN_POOL_EMPTY", caseId });
        return null;
    }

    // Get allocation counts
    const counts = getAllocationCounts();

    // Pick domain with fewest allocations
    let selectedDomain = pool[0];
    let minCount = counts.get(selectedDomain) || 0;

    for (const domain of pool) {
        const count = counts.get(domain) || 0;
        if (count < minCount) {
            minCount = count;
            selectedDomain = domain;
        }
    }

    // Insert with transaction for safety
    const insertStmt = db.prepare(`
        INSERT INTO managed_domain_allocations (case_id, domain, allocated_at_iso)
        VALUES (?, ?, ?)
    `);

    try {
        insertStmt.run(caseId, selectedDomain, new Date().toISOString());

        auditLog({
            eventType: "MANAGED_DOMAIN_ALLOCATED",
            caseId,
            domain: selectedDomain
        });

        // Ensure domain status row exists
        ensureDomainStatusRow(selectedDomain);

        return selectedDomain;
    } catch (e) {
        // UNIQUE constraint violation means concurrent insert
        // Re-read the allocation
        const retryExisting = getDomainForCase(caseId);
        if (retryExisting) return retryExisting;
        throw e;
    }
}

/**
 * Ensure a domain status row exists.
 */
function ensureDomainStatusRow(domain: string): void {
    const db = getDb();
    const stmt = db.prepare(`
        INSERT OR IGNORE INTO managed_domain_status (domain, spf_ok, dkim_ok, dmarc_ok)
        VALUES (?, 0, 0, 0)
    `);
    stmt.run(domain);
}

/**
 * Get domain verification status.
 */
export function getDomainStatus(domain: string): {
    spfOk: boolean;
    dkimOk: boolean;
    dmarcOk: boolean;
    verifiedAtIso: string | null;
    notes: string | null;
} | null {
    ensureManagedDomainsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        SELECT spf_ok, dkim_ok, dmarc_ok, verified_at_iso, notes
        FROM managed_domain_status WHERE domain = ?
    `);
    const row = stmt.get(domain) as {
        spf_ok: number;
        dkim_ok: number;
        dmarc_ok: number;
        verified_at_iso: string | null;
        notes: string | null;
    } | undefined;

    if (!row) return null;

    return {
        spfOk: row.spf_ok === 1,
        dkimOk: row.dkim_ok === 1,
        dmarcOk: row.dmarc_ok === 1,
        verifiedAtIso: row.verified_at_iso,
        notes: row.notes
    };
}

/**
 * Check if domain is fully verified (SPF + DKIM + DMARC).
 */
export function isDomainVerified(domain: string): boolean {
    const status = getDomainStatus(domain);
    if (!status) return false;
    return status.spfOk && status.dkimOk && status.dmarcOk;
}

/**
 * Update domain verification status.
 * Sets verified_at_iso ONLY when all three flags are true, otherwise NULL.
 */
export function updateDomainStatus(
    domain: string,
    updates: {
        spfOk?: boolean;
        dkimOk?: boolean;
        dmarcOk?: boolean;
        notes?: string;
    }
): void {
    ensureManagedDomainsSchema();
    ensureDomainStatusRow(domain);

    const db = getDb();
    const current = getDomainStatus(domain)!;

    const newSpf = updates.spfOk !== undefined ? updates.spfOk : current.spfOk;
    const newDkim = updates.dkimOk !== undefined ? updates.dkimOk : current.dkimOk;
    const newDmarc = updates.dmarcOk !== undefined ? updates.dmarcOk : current.dmarcOk;
    const newNotes = updates.notes !== undefined ? updates.notes : current.notes;

    // Set verified_at_iso ONLY if all three are true
    const isFullyVerified = newSpf && newDkim && newDmarc;
    const verifiedAtIso = isFullyVerified ? new Date().toISOString() : null;

    const stmt = db.prepare(`
        UPDATE managed_domain_status
        SET spf_ok = ?, dkim_ok = ?, dmarc_ok = ?, verified_at_iso = ?, notes = ?
        WHERE domain = ?
    `);

    stmt.run(
        newSpf ? 1 : 0,
        newDkim ? 1 : 0,
        newDmarc ? 1 : 0,
        verifiedAtIso,
        newNotes,
        domain
    );

    auditLog({
        eventType: "MANAGED_DOMAIN_VERIFICATION_UPDATED",
        domain,
        spfOk: newSpf,
        dkimOk: newDkim,
        dmarcOk: newDmarc
    });
}

/**
 * Get case email address.
 * For Managed tier with allocated domain, uses that domain.
 * Otherwise uses default CASE_EMAIL_DOMAIN.
 * 
 * @param caseId - The case ID
 * @param allocatedDomain - Optional pre-fetched domain (for efficiency)
 */
export function getCaseEmailAddress(caseId: string, allocatedDomain?: string | null): string {
    const domain = allocatedDomain ?? getDomainForCase(caseId) ?? getDefaultEmailDomain();

    // Local part: case-{shortId} for readability
    const shortId = caseId.slice(0, 8).toLowerCase();
    const localPart = `case-${shortId}`;

    return `${localPart}@${domain}`;
}

/**
 * Get all domain allocations (for debug).
 */
export function getAllAllocations(): Array<{
    caseId: string;
    domain: string;
    allocatedAtIso: string;
}> {
    ensureManagedDomainsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        SELECT case_id, domain, allocated_at_iso
        FROM managed_domain_allocations
        ORDER BY allocated_at_iso DESC
        LIMIT 100
    `);
    const rows = stmt.all() as Array<{
        case_id: string;
        domain: string;
        allocated_at_iso: string;
    }>;

    return rows.map(row => ({
        caseId: row.case_id,
        domain: row.domain,
        allocatedAtIso: row.allocated_at_iso
    }));
}

/**
 * Get all domain statuses (for debug).
 */
export function getAllDomainStatuses(): Array<{
    domain: string;
    spfOk: boolean;
    dkimOk: boolean;
    dmarcOk: boolean;
    verifiedAtIso: string | null;
}> {
    ensureManagedDomainsSchema();
    const db = getDb();

    const stmt = db.prepare(`
        SELECT domain, spf_ok, dkim_ok, dmarc_ok, verified_at_iso
        FROM managed_domain_status
    `);
    const rows = stmt.all() as Array<{
        domain: string;
        spf_ok: number;
        dkim_ok: number;
        dmarc_ok: number;
        verified_at_iso: string | null;
    }>;

    return rows.map(row => ({
        domain: row.domain,
        spfOk: row.spf_ok === 1,
        dkimOk: row.dkim_ok === 1,
        dmarcOk: row.dmarc_ok === 1,
        verifiedAtIso: row.verified_at_iso
    }));
}
