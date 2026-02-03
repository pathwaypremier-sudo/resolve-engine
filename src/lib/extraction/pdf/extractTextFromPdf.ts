
export type ExtractionResult = {
    text: string;
    pageCount: number;
    textAvailable: boolean;
};

export async function extractTextFromPdf(file: File): Promise<ExtractionResult> {
    // 1. Client-side guard
    if (typeof window === "undefined") {
        return { text: "", pageCount: 0, textAvailable: false };
    }

    try {
        // 2. Dynamic import of legacy build
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

        // 3. Configure worker
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;

        let fullText = "";

        for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            // Extract strings from items
            // pdfjs items can be TextItem | TextMarkedContent. TextItem has 'str'.
            const strings = content.items
                .filter((item: any) => typeof item.str === "string")
                .map((item: any) => item.str);

            fullText += strings.join(" ") + "\n\n";
        }

        const trimmed = fullText.trim();
        const textAvailable = trimmed.length > 0;

        return {
            text: textAvailable ? trimmed : "",
            pageCount,
            textAvailable
        };

    } catch (error) {
        console.error("PDF Extraction failed:", error);
        // Fallback: treat as no text available rather than crashing flow
        return {
            text: "",
            pageCount: 0,
            textAvailable: false
        };
    }
}

