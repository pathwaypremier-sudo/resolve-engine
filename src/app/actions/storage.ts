"use server";

import { getStorageProvider } from "@/lib/storage";
import { isUploadsEnabled } from "@/lib/ops/settings.server";
import { requireWriteAccess } from "@/lib/ops/maintenanceGuard.server";

type UploadResult =
    | { ok: true; uri: string; checksumSha256: string; sizeBytes: number; storedAtIso: string }
    | { ok: false; error: string; status: 503 };

export async function uploadFileAction(formData: FormData): Promise<UploadResult> {
    // Check maintenance mode first
    const maintenanceCheck = await requireWriteAccess();
    if (!maintenanceCheck.ok) {
        return {
            ok: false,
            error: maintenanceCheck.message,
            status: 503
        };
    }

    // Check if uploads are enabled
    const uploadsEnabled = await isUploadsEnabled();
    if (!uploadsEnabled) {
        return {
            ok: false,
            error: "File uploads are temporarily disabled. Please try again later.",
            status: 503
        };
    }

    const caseId = formData.get("caseId") as string;
    const docId = formData.get("docId") as string;
    const file = formData.get("file") as File;

    if (!caseId || !docId || !file) {
        throw new Error("Missing required fields: caseId, docId, file");
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Pass metadata
    const meta = {
        filename: file.name,
        mime: file.type,
        sizeBytes: file.size
    };

    const provider = getStorageProvider();

    // Put to storage (emits events locally on server)
    const result = await provider.put(caseId, docId, buffer, meta);

    // Return the result for client state
    return {
        ok: true,
        uri: result.uri,
        checksumSha256: result.checksumSha256,
        sizeBytes: result.sizeBytes,
        storedAtIso: result.storedAtIso
    };
}
