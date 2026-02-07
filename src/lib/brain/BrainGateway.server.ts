/**
 * Brain Gateway Server Module
 * Abstraction layer for Brain providers (Local vs NotebookLM).
 */

import { upsertCaseBrainLink, upsertBrainSource, getCaseBrainLink, countSources } from "./brainStore.server";
import { createHash } from "node:crypto";
import { auditLog } from "@/lib/ops/auditLog.server";
import { getBaseUrl } from "@/lib/ops/baseUrl.server";

// Interfaces
export interface BrainSource {
    sourceKey: string;
    sourceType: "text" | "pdf" | "url";
    content: string | Buffer; // text content or file buffer
    contentHash?: string; // optional, computed if missing
}

export interface BrainStatus {
    linked: boolean;
    provider: string;
    notebookUrl?: string;
    packVersion: string;
    sourcesCount: number;
}

export interface BrainGateway {
    bootstrapCase(caseId: string): Promise<{ notebookId?: string; notebookUrl: string }>;
    syncSources(caseId: string, sources: BrainSource[]): Promise<{ addedCount: number }>;
    getStatus(caseId: string): Promise<BrainStatus>;
}

// ------------------------------------------------------------
// 1. Local Gateway (No external calls)
// ------------------------------------------------------------
class LocalBrainGateway implements BrainGateway {
    private baseUrl: string;

    constructor() {
        // Use getBaseUrl helper (prefers env, falls back to localhost in dev)
        this.baseUrl = getBaseUrl();
    }

    async bootstrapCase(caseId: string) {
        // Deterministic local URL
        const notebookUrl = `${this.baseUrl}/dev/brain/${caseId}`;
        const packVersion = process.env.BRAIN_PACK_VERSION || "v1";

        upsertCaseBrainLink({
            caseId,
            provider: "local",
            notebookUrl,
            packVersion
        });

        auditLog({ eventType: "BRAIN_BOOTSTRAPPED_LOCAL", caseId });
        return { notebookUrl };
    }

    async syncSources(caseId: string, sources: BrainSource[]) {
        let addedCount = 0;

        for (const source of sources) {
            const hash = source.contentHash || computeHash(source.content);
            const result = upsertBrainSource({
                caseId,
                sourceKey: source.sourceKey,
                sourceType: source.sourceType,
                contentHash: hash
            });
            if (result.inserted) addedCount++;
        }

        if (addedCount > 0) {
            auditLog({ eventType: "BRAIN_SOURCES_SYNCED_LOCAL", caseId, count: addedCount });
        }
        return { addedCount };
    }

    async getStatus(caseId: string) {
        const link = getCaseBrainLink(caseId);
        const count = countSources(caseId);

        return {
            linked: !!link,
            provider: link?.provider || "local",
            notebookUrl: link?.notebookUrl || undefined,
            packVersion: link?.packVersion || process.env.BRAIN_PACK_VERSION || "v1",
            sourcesCount: count
        };
    }
}

// ------------------------------------------------------------
// 2. NotebookLM Gateway (Stub / Skeleton)
// ------------------------------------------------------------
class NotebookLMGateway implements BrainGateway {
    private projectId: string;
    private location: string;
    private baseUrl: string;

    constructor() {
        // Enforce config presence
        const projectId = process.env.NOTEBOOKLM_PROJECT_ID;
        const location = process.env.NOTEBOOKLM_LOCATION;

        if (!projectId || !location) {
            throw new Error("Misconfigured: NOTEBOOKLM_PROJECT_ID or NOTEBOOKLM_LOCATION missing");
        }

        this.projectId = projectId;
        this.location = location;
        this.baseUrl = process.env.NOTEBOOKLM_NOTEBOOK_BASE_URL || "https://notebooklm.google.com/notebook";
    }

    async bootstrapCase(caseId: string) {
        // TODO: Real API call to create notebook
        // For now, simulate by creating a deterministic ID based on caseId hash
        const notebookId = createHash("md5").update(caseId).digest("hex").slice(0, 12);
        const notebookUrl = `${this.baseUrl}/${notebookId}`;
        const packVersion = process.env.BRAIN_PACK_VERSION || "v1";

        upsertCaseBrainLink({
            caseId,
            provider: "notebooklm",
            notebookId,
            notebookUrl,
            packVersion
        });

        auditLog({ eventType: "BRAIN_BOOTSTRAPPED_NOTEBOOKLM", caseId, notebookId });
        return { notebookId, notebookUrl };
    }

    async syncSources(caseId: string, sources: BrainSource[]) {
        // TODO: Real API call to upload sources
        // For now, just track them in our DB
        let addedCount = 0;

        for (const source of sources) {
            const hash = source.contentHash || computeHash(source.content);
            const result = upsertBrainSource({
                caseId,
                sourceKey: source.sourceKey,
                sourceType: source.sourceType,
                contentHash: hash,
                providerSourceId: `stub_${hash.slice(0, 8)}`
            });
            if (result.inserted) addedCount++;
        }

        if (addedCount > 0) {
            auditLog({ eventType: "BRAIN_SOURCES_SYNCED_NOTEBOOKLM", caseId, count: addedCount });
        }
        return { addedCount };
    }

    async getStatus(caseId: string) {
        const link = getCaseBrainLink(caseId);
        const count = countSources(caseId);

        return {
            linked: !!link,
            provider: link?.provider || "notebooklm",
            notebookUrl: link?.notebookUrl || undefined,
            packVersion: link?.packVersion || process.env.BRAIN_PACK_VERSION || "v1",
            sourcesCount: count
        };
    }
}

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function computeHash(content: string | Buffer): string {
    return createHash("sha256").update(content).digest("hex");
}

/**
 * Factory to get the configured brain gateway.
 */
export function getBrainGateway(): BrainGateway {
    const provider = process.env.BRAIN_PROVIDER || "local";

    if (provider === "notebooklm") {
        return new NotebookLMGateway();
    }
    return new LocalBrainGateway();
}
