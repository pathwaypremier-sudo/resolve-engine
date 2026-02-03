import { PersistenceAdapter } from "./PersistenceAdapter";
import { appendCaseEvent } from "@/lib/case/events";

/**
 * Remote Persistence Adapter (Hardened)
 * 
 * Implicates:
 * - Local storage as synchronous write-through cache (Local First).
 * - Async remote synchronization with retry and conflict detection.
 * - Idempotency checks via checksum matching.
 * - Audit logging via STORAGE_* events (skipping event log keys to avoid loops).
 */

async function sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function extractCaseId(key: string): string | null {
    // Expected format: re_case_<ID>_<suffix> or re_case_<ID>
    const match = key.match(/^re_case_([^_]+)/);
    return match ? match[1] : null;
}

export class RemoteAdapter implements PersistenceAdapter {
    private cache: Storage | null;
    private writeQueues = new Map<string, Promise<void>>();
    private pendingSyncKeys = new Set<string>();

    constructor() {
        this.cache = typeof window !== "undefined" ? window.localStorage : null;
    }

    get(key: string): string | null {
        return this.cache?.getItem(key) || null;
    }

    set(key: string, value: string): void {
        // 1. Optimistic write (Sync source of truth)
        this.cache?.setItem(key, value);
        this.pendingSyncKeys.add(key);

        // 2. Queue Remote Write
        this.enqueue(key, async () => {
            if (typeof window === "undefined") return;

            const caseId = extractCaseId(key);
            const isEventLog = key.endsWith("_events") || key.includes("re_auth_events");

            // Helper to emit events safely (no loop)
            const emit = (type: string, meta: Record<string, any>) => {
                if (caseId && !isEventLog) {
                    // We must avoid calling persistence.set -> RemoteAdapter.set recursively
                    // appendCaseEvent calls localStorage.setItem which is intercepted by PersistenceAdapter? 
                    // No, appendCaseEvent uses 'persistence' adapter.
                    // If persistence IS RemoteAdapter, it loops.
                    // BREAK: appendCaseEvent reads events, pushes, writes events.
                    // writing events triggers set(events_key). isEventLog=true prevents logic here. OK.
                    appendCaseEvent(caseId, {
                        type,
                        at: new Date().toISOString(),
                        meta: { ...meta, key }
                    });
                }
            };

            const attemptId = crypto.randomUUID();
            emit("STORAGE_PUT_REQUESTED", { attemptId, providerId: "remote" });

            try {
                // Checksum computation
                const localChecksum = await sha256(value);

                // Conflict Strategy: Check remote first
                let remoteValue: string | null = null;
                try {
                    const checkRes = await fetch(`/api/persist/${encodeURIComponent(key)}`);
                    if (checkRes.ok) {
                        const json = await checkRes.json();
                        remoteValue = json.value ?? null;
                    }
                } catch {
                    // Ignore check errors, treat as not found or network retry later
                }

                if (remoteValue !== null) {
                    const remoteChecksum = await sha256(remoteValue);
                    if (remoteChecksum === localChecksum) {
                        // Idempotent success
                        emit("STORAGE_PUT_SUCCEEDED", { attemptId, providerId: "remote", note: "idempotent" });
                        this.pendingSyncKeys.delete(key);
                        return;
                    }
                    if (remoteValue !== value) {
                        // Conflict / Mismatch
                        // In "Hardened" mode, we block overwrite if different.
                        emit("STORAGE_PUT_FAILED", {
                            attemptId,
                            providerId: "remote",
                            failureClass: "CHECKSUM_MISMATCH",
                            retryable: false
                        });
                        // We do NOT overwrite. Data in LS remains "dirty" vs remote.
                        return;
                    }
                }

                // If no conflict, perform PUT with Retry
                await this.putWithRetry(key, value, attemptId, emit);

                this.pendingSyncKeys.delete(key);
                emit("STORAGE_PUT_SUCCEEDED", { attemptId, providerId: "remote" });

            } catch (e: any) {
                // Final failure after retries
                emit("STORAGE_PUT_FAILED", {
                    attemptId,
                    providerId: "remote",
                    failureClass: "ExhaustedRetries",
                    retryable: false
                });
                console.error(`[RemoteAdapter] Write failed for ${key}`, e);
            }
        });
    }

    private async putWithRetry(key: string, value: string, attemptId: string, emit: (t: string, m: any) => void) {
        const MAX_ATTEMPTS = 3;
        let attempt = 0;

        while (attempt < MAX_ATTEMPTS) {
            attempt++;
            try {
                const res = await fetch(`/api/persist/${encodeURIComponent(key)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ value })
                });

                if (res.ok) return; // Success

                if (res.status >= 400 && res.status < 500) {
                    // Client error, likely not retryable (except 429?)
                    throw new Error(`HTTP ${res.status}`);
                }
                throw new Error(`HTTP ${res.status}`);
            } catch (e: any) {
                const isLast = attempt === MAX_ATTEMPTS;
                if (!isLast) {
                    // Emit failure for this attempt
                    emit("STORAGE_PUT_FAILED", {
                        attemptId,
                        attempt,
                        providerId: "remote",
                        failureClass: "Transient",
                        retryable: true
                    });
                    // Backoff: 200ms, 800ms
                    await new Promise(r => setTimeout(r, attempt === 1 ? 200 : 800));
                } else {
                    throw e;
                }
            }
        }
    }

    remove(key: string): void {
        this.cache?.removeItem(key);
        this.pendingSyncKeys.add(key);

        this.enqueue(key, async () => {
            if (typeof window === "undefined") return;
            try {
                const res = await fetch(`/api/persist/${encodeURIComponent(key)}`, { method: "DELETE" });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                this.pendingSyncKeys.delete(key);
            } catch (e) {
                console.error(`[RemoteAdapter] Delete failed for ${key}`, e);
            }
        });
    }

    private enqueue(key: string, operation: () => Promise<void>) {
        const current = this.writeQueues.get(key) || Promise.resolve();
        const next = current.then(operation).catch(() => { });
        this.writeQueues.set(key, next);
    }

    clear(): void {
        this.cache?.clear();
    }

    getJSON<T>(key: string): T | null {
        const val = this.get(key);
        if (!val) return null;
        try { return JSON.parse(val) as T; } catch { return null; }
    }

    setJSON<T>(key: string, value: T): void {
        try {
            this.set(key, JSON.stringify(value));
        } catch { }
    }
}
