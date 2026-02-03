"use server";

import { getStorageProvider } from "@/lib/storage";

export async function uploadFileAction(formData: FormData) {
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
        uri: result.uri,
        checksumSha256: result.checksumSha256,
        sizeBytes: result.sizeBytes,
        storedAtIso: result.storedAtIso
    };
}
