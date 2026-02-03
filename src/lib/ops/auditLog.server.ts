// Note: do not use `server-only` here because this module may be imported in legacy pages builds.
// Runtime guard keeps it inert in the browser.

/**
 * Structured Audit Logger (Server-intended)
 * 
 * Records critical system actions in a lean JSON format.
 * No PII, secrets, or raw content should ever be passed to this.
 * 
 * Required env: AUDIT_LOG_ENABLED=1
 */
export function auditLog(entry: {
    eventType: string;
    caseId?: string;
    exportKind?: string;
    exportChecksum?: string;
    provider?: string;
    checkoutId?: string;
    status?: string;
    decision?: string;
    reason?: string;
    targetId?: string;
    idempotencyKey?: string;
    [key: string]: any;
}) {
    if (typeof window !== "undefined") return;
    if (process.env.AUDIT_LOG_ENABLED !== "1") return;

    const logEntry = {
        ...entry,
        atIso: new Date().toISOString(),
    };

    console.log(JSON.stringify(logEntry));
}
