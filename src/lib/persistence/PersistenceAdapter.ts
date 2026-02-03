/**
 * Persistence Adapter (Local-First)
 * Centralizes all storage access to prepare for backend persistence.
 * Currently wraps localStorage but provides safe access boundaries.
 */

import { RemoteAdapter } from "./RemoteAdapter";

export interface PersistenceAdapter {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
    clear(): void;
    // Helper for JSON
    getJSON<T>(key: string): T | null;
    setJSON<T>(key: string, value: T): void;
}

class LocalStorageAdapter implements PersistenceAdapter {
    private get store(): Storage | null {
        if (typeof window === "undefined") return null;
        try {
            return window.localStorage;
        } catch {
            return null; // Safe fallback if blocked
        }
    }

    get(key: string): string | null {
        return this.store?.getItem(key) || null;
    }

    set(key: string, value: string): void {
        this.store?.setItem(key, value);
    }

    remove(key: string): void {
        this.store?.removeItem(key);
    }

    clear(): void {
        this.store?.clear();
    }

    getJSON<T>(key: string): T | null {
        const val = this.get(key);
        if (!val) return null;
        try {
            return JSON.parse(val) as T;
        } catch {
            return null;
        }
    }

    setJSON<T>(key: string, value: T): void {
        try {
            if (typeof window === "undefined") return;
            // The original instruction provided a line that used undefined variables (caseId, events)
            // and hardcoded a key. To make the code syntactically correct and functional
            // within the context of this method, the original `this.set` call is retained,
            // but now guarded by the `typeof window === "undefined"` check.
            // The `this.set` method itself already uses the `this.store` getter which handles
            // `localStorage` access safely.
            this.set(key, JSON.stringify(value));
        } catch {
            // Ignore stringify errors
        }
    }
}

function createAdapter(): PersistenceAdapter {
    if (typeof window === "undefined") {
        const { getServerPersistenceAdapter } = require("./PersistenceAdapter.server");
        return getServerPersistenceAdapter();
    }

    const mode = process.env.NEXT_PUBLIC_PERSISTENCE_MODE;
    if (mode === "remote") {
        return new RemoteAdapter();
    }
    return new LocalStorageAdapter();
}

export const persistence: PersistenceAdapter = createAdapter();
