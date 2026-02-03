"use client";

type FileRef = {
    id: string;
    path: string; // Not used here but part of the shape
    name: string;
    type?: string;
    size?: number;
    text?: string;
};

export type DocTextRecord = {
    docId: string;
    filename: string;
    mime?: string;
    preferredText: string;
    preferredSource: "NATIVE" | "OCR" | "NONE";
    nativeText?: string;
    ocrText?: string;
};

export async function getCaseDocumentText(caseId: string): Promise<DocTextRecord[]> {
    if (typeof window === "undefined") return [];

    const records: DocTextRecord[] = [];

    try {
        // 1. Read from Intake Data (Primary source for V1 user uploads)
        // Note: Intake data typically stores "ref.text" which is native text (extracted from PDF layer)
        const intakeJson = localStorage.getItem(`re_case_${caseId}_intake_data`);
        if (intakeJson) {
            const data = JSON.parse(intakeJson);
            if (data.fileRefs && Array.isArray(data.fileRefs)) {
                data.fileRefs.forEach((ref: FileRef) => {
                    const r: DocTextRecord = {
                        docId: ref.id || "unknown",
                        filename: ref.name || "Unknown File",
                        mime: ref.type,
                        preferredText: "",
                        preferredSource: "NONE",
                        nativeText: ref.text
                    };

                    if (r.nativeText && r.nativeText.trim().length > 0) {
                        r.preferredText = r.nativeText;
                        r.preferredSource = "NATIVE";
                    }
                    if (r.preferredSource !== "NONE") records.push(r);
                });
            }
        }

        // 2. Read from Case Docs (Legacy or built packets) AND OCR storage
        const docsJson = localStorage.getItem(`re_case_${caseId}_docs`);
        if (docsJson) {
            const docs = JSON.parse(docsJson);
            if (Array.isArray(docs)) {
                docs.forEach((doc: any) => {
                    // Check if we already have a record for this docId
                    let record = records.find(r => r.docId === doc.id);
                    if (!record) {
                        record = {
                            docId: doc.id || "unknown",
                            filename: doc.name,
                            mime: doc.type,
                            preferredText: "",
                            preferredSource: "NONE"
                        };
                        records.push(record);
                    }

                    // Populate Native Text if present and not already set
                    if (doc.text && doc.text.trim().length > 0) {
                        record.nativeText = doc.text;
                    }

                    // Populate OCR Text
                    if (doc.ocrText && doc.ocrText.trim().length > 0) {
                        record.ocrText = doc.ocrText;
                    }

                    // Determine Preferred Source
                    if (record.nativeText && record.nativeText.trim().length > 0) {
                        record.preferredText = record.nativeText;
                        record.preferredSource = "NATIVE";
                    } else if (record.ocrText && record.ocrText.trim().length > 0) {
                        record.preferredText = record.ocrText;
                        record.preferredSource = "OCR";
                    } else {
                        record.preferredText = "";
                        record.preferredSource = "NONE";
                    }
                });
            }
        }

    } catch (e) {
        console.warn("Failed to read case document text from storage", e);
    }

    // Filter out completely empty records if desired, or keep them to show they exist but have no text
    return records.filter(r => r.preferredSource !== "NONE");
}
