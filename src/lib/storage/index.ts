import { StorageProvider, LocalStorageProvider } from "./providers/local";

export type { StorageProvider };

/**
 * Get the configured storage provider.
 * Reads NEXT_PUBLIC_STORAGE_PROVIDER from environment.
 * Default: local
 */
export function getStorageProvider(): StorageProvider {
    const mode = process.env.NEXT_PUBLIC_STORAGE_PROVIDER || "local";

    switch (mode) {
        case "local":
            return new LocalStorageProvider();
        case "cloud":
            // Stub for future cloud provider
            throw new Error("Cloud storage provider not implemented (V1 stub)");
        default:
            console.warn(`[storage] Unknown provider '${mode}', falling back to local.`);
            return new LocalStorageProvider();
    }
}
