// server-side only logic for sqlite persistence
import { sqliteDb } from "./sqliteDb";
import { PersistenceAdapter } from "./PersistenceAdapter";
import { validateProductionGuards } from "@/lib/ops/productionGuards.server";

// Run safety checks once on module load in server context
validateProductionGuards();

class SqlitePersistenceAdapter implements PersistenceAdapter {
    get(key: string): string | null {
        return sqliteDb.get(key)?.value || null;
    }
    set(key: string, value: string): void {
        sqliteDb.set(key, value);
    }
    remove(key: string): void {
        sqliteDb.del(key);
    }
    clear(): void {
        // Not implemented for sqlite kv store for safety
        console.warn("[SqlitePersistenceAdapter] clear() not implemented");
    }
    getJSON<T>(key: string): T | null {
        const val = this.get(key);
        if (!val) return null;
        try { return JSON.parse(val) as T; } catch { return null; }
    }
    setJSON<T>(key: string, value: T): void {
        try { this.set(key, JSON.stringify(value)); } catch { }
    }
}

export function getServerPersistenceAdapter(): PersistenceAdapter {
    return new SqlitePersistenceAdapter();
}
