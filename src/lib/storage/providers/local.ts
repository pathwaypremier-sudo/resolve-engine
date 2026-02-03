import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { appendCaseEvent } from '@/lib/case/events';

// Interface matching the contract
export interface StorageProvider {
    put(caseId: string, docId: string, blob: Buffer, meta: Record<string, any>): Promise<{ uri: string; checksumSha256: string; sizeBytes: number; storedAtIso: string }>;
    get(uri: string): Promise<Buffer>;
    stat(uri: string): Promise<{ checksumSha256: string; sizeBytes: number } | null>;
    health(): Promise<{ ok: boolean; detail?: string }>;
}

export class LocalStorageProvider implements StorageProvider {
    private baseDir: string;

    constructor() {
        // "Writes blobs to: ./.re_storage/case/<caseId>/<docId>"
        this.baseDir = path.resolve(process.cwd(), '.re_storage');
    }

    private getPath(caseId: string, docId: string): string {
        return path.join(this.baseDir, 'case', caseId, docId);
    }

    private getUri(caseId: string, docId: string): string {
        return `re-local://case/${caseId}/doc/${docId}`;
    }

    async put(caseId: string, docId: string, blob: Buffer, meta: Record<string, any>): Promise<{ uri: string; checksumSha256: string; sizeBytes: number; storedAtIso: string }> {
        const sizeBytes = blob.length;
        const mime = meta.mime || "application/octet-stream";
        const filename = meta.filename || docId;

        // 1. STORAGE_PUT_REQUESTED
        appendCaseEvent(caseId, {
            type: "STORAGE_PUT_REQUESTED",
            at: new Date().toISOString(),
            meta: { filename, mime, sizeBytes, providerId: "local" }
        });

        try {
            // Ensure dir exists
            const filePath = this.getPath(caseId, docId);
            const dir = path.dirname(filePath);

            // Sync is fine for V1 local dev, but let's use sync methods for simplicity in constructor-less envs or promises
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(filePath, blob);

            // Compute checksum
            const checksumSha256 = createHash('sha256').update(blob).digest('hex');
            const storedAtIso = new Date().toISOString();
            const uri = this.getUri(caseId, docId);

            // 2. STORAGE_PUT_SUCCEEDED
            appendCaseEvent(caseId, {
                type: "STORAGE_PUT_SUCCEEDED",
                at: storedAtIso,
                meta: { uri, checksumSha256, sizeBytes, providerId: "local" }
            });

            return { uri, checksumSha256, sizeBytes, storedAtIso };

        } catch (error: any) {
            // 3. STORAGE_PUT_FAILED
            appendCaseEvent(caseId, {
                type: "STORAGE_PUT_FAILED",
                at: new Date().toISOString(),
                meta: {
                    errorCode: error.code || "UNKNOWN",
                    messageSafe: "Failed to write local file",
                    retryable: false,
                    providerId: "local"
                }
            });
            throw error;
        }
    }

    async get(uri: string): Promise<Buffer> {
        // Parse URI: re-local://case/<caseId>/doc/<docId>
        const match = uri.match(/^re-local:\/\/case\/([^/]+)\/doc\/([^/]+)$/);
        if (!match) throw new Error("Invalid URI format");

        const [, caseId, docId] = match;

        appendCaseEvent(caseId, {
            type: "STORAGE_GET_REQUESTED",
            at: new Date().toISOString(),
            meta: { uri, providerId: "local" }
        });

        try {
            const filePath = this.getPath(caseId, docId);
            if (!fs.existsSync(filePath)) throw new Error("File not found");

            const buf = fs.readFileSync(filePath);

            appendCaseEvent(caseId, {
                type: "STORAGE_GET_SUCCEEDED",
                at: new Date().toISOString(),
                meta: { uri, providerId: "local" }
            });

            return buf;

        } catch (error: any) {
            appendCaseEvent(caseId, {
                type: "STORAGE_GET_FAILED",
                at: new Date().toISOString(),
                meta: { uri, errorCode: error.code || "ReadError", providerId: "local" }
            });
            throw error;
        }
    }

    async stat(uri: string): Promise<{ checksumSha256: string; sizeBytes: number } | null> {
        const match = uri.match(/^re-local:\/\/case\/([^/]+)\/doc\/([^/]+)$/);
        if (!match) return null;

        const [, caseId, docId] = match;
        const filePath = this.getPath(caseId, docId);

        if (!fs.existsSync(filePath)) return null;

        const buf = fs.readFileSync(filePath); // Inefficient for large files but V1 compliant
        const sizeBytes = buf.length;
        const checksumSha256 = createHash('sha256').update(buf).digest('hex');

        return { checksumSha256, sizeBytes };
    }

    async health(): Promise<{ ok: boolean; detail?: string }> {
        try {
            // Check write access to base dir
            if (!fs.existsSync(this.baseDir)) {
                fs.mkdirSync(this.baseDir, { recursive: true });
            }
            const testFile = path.join(this.baseDir, '.health');
            fs.writeFileSync(testFile, 'ok');
            fs.unlinkSync(testFile);
            return { ok: true };
        } catch (e: any) {
            return { ok: false, detail: e.message };
        }
    }
}
