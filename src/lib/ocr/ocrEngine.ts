import type { Worker } from "tesseract.js";

export type OcrResult = {
    text: string;
    engine: string;
    pages?: number;
    warnings?: string[];
    confidence?: number;
};

export type OcrSource = {
    type: "IMAGE" | "PDF_PAGES";
    files?: File[]; // For direct images
    imageUrls?: string[]; // For rendered PDF pages
    onProgress?: (progress: number) => void;
};

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CANVAS_DIMENSION = 4096; // Cap canvas size to prevent crashes

export async function runOcrOnSource(source: OcrSource): Promise<OcrResult> {
    if (typeof window === "undefined") {
        return { text: "", engine: "None", warnings: ["OCR not available server-side"] };
    }

    // Helper: Throttled Progress
    let lastProgress = 0;
    const reportProgress = (p: number) => {
        const now = Date.now();
        if (now - lastProgress > 200 && source.onProgress) { // Max update every 200ms
            source.onProgress(p);
            lastProgress = now;
        }
    };

    if (source.type === "IMAGE") {
        if (!source.files || source.files.length === 0) {
            return { text: "", engine: "None", warnings: ["No image file provided"] };
        }

        const file = source.files[0];
        const warnings: string[] = [];

        if (file.size > MAX_IMAGE_SIZE_BYTES) {
            warnings.push("Large file detected. Processing may take longer.");
        }

        let worker: Worker | null = null;
        try {
            // Lazy load Tesseract
            const Tesseract = await import("tesseract.js");
            worker = await Tesseract.createWorker("eng", 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        reportProgress(m.progress);
                    }
                }
            });

            const result = await worker.recognize(file);
            const text = result.data.text.trim();
            const confidence = result.data.confidence;

            if (text.length === 0) {
                return {
                    text: "",
                    engine: "Tesseract.js/5.x",
                    warnings: [...warnings, "OCR produced no text"]
                };
            }

            if (confidence < 50) {
                warnings.push("Low confidence extraction");
            }

            return {
                text,
                engine: "Tesseract.js/5.x",
                confidence: confidence / 100, // Normalized 0-1
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (e) {
            console.error("OCR Failed:", e);
            return {
                text: "",
                engine: "Tesseract.js/5.x",
                warnings: ["OCR execution failed"]
            };
        } finally {
            if (worker) {
                await worker.terminate();
            }
        }
    }

    if (source.type === "PDF_PAGES") {
        if (!source.files || source.files.length === 0) {
            return { text: "", engine: "None", warnings: ["No PDF file provided"] };
        }

        let worker: Worker | null = null;
        try {
            // 1. Setup PDF.js
            const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
            pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

            const file = source.files[0];
            const arrayBuffer = await file.arrayBuffer();
            const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            // 2. Setup Tesseract
            const Tesseract = await import("tesseract.js");
            worker = await Tesseract.createWorker("eng", 1, {
                logger: () => {
                    // Internal logs silenced for performance in loop
                }
            });

            const maxPages = Math.min(pdf.numPages, 5);
            let fullText = "";
            const accumulatedWarnings: string[] = [];

            if (pdf.numPages > 5) {
                accumulatedWarnings.push("OCR limited to first 5 pages.");
            }

            // 3. Process Pages
            for (let i = 1; i <= maxPages; i++) {
                // Report start of page
                reportProgress(i / maxPages);

                const page = await pdf.getPage(i);

                // Calculate safe scale
                const viewportRaw = page.getViewport({ scale: 1.0 });
                let scale = 2.0;
                if (viewportRaw.width * scale > MAX_CANVAS_DIMENSION || viewportRaw.height * scale > MAX_CANVAS_DIMENSION) {
                    scale = Math.min(
                        MAX_CANVAS_DIMENSION / viewportRaw.width,
                        MAX_CANVAS_DIMENSION / viewportRaw.height
                    );
                }

                const viewport = page.getViewport({ scale });

                // Create canvas
                let canvas: HTMLCanvasElement | null = document.createElement("canvas");
                let context = canvas.getContext("2d");
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (!context) {
                    canvas = null;
                    continue;
                }

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                } as any).promise;

                // Convert to blob
                const blob = await new Promise<Blob | null>(resolve =>
                    canvas ? canvas.toBlob(resolve, 'image/png') : resolve(null)
                );

                if (blob) {
                    const result = await worker.recognize(blob);

                    const pageText = result.data.text.trim();
                    if (pageText.length > 0) {
                        fullText += `\n\n--- Page ${i} ---\n\n` + pageText;
                    }
                }

                // Explicit Cleanup
                context = null;
                if (canvas) {
                    canvas.width = 0;
                    canvas.height = 0;
                    canvas.remove();
                    canvas = null;
                }
            }

            const finalText = fullText.trim();
            if (finalText.length === 0) {
                return {
                    text: "",
                    engine: "Tesseract.js/5.x (PDF)",
                    warnings: ["OCR produced no text from PDF"]
                };
            }

            return {
                text: finalText,
                engine: "Tesseract.js/5.x (PDF)",
                pages: maxPages,
                warnings: accumulatedWarnings.length > 0 ? accumulatedWarnings : undefined
            };

        } catch (e) {
            console.error("PDF OCR Failed:", e);
            return {
                text: "",
                engine: "Tesseract.js/5.x (PDF)",
                warnings: ["PDF OCR execution failed"]
            };
        } finally {
            if (worker) {
                await worker.terminate();
            }
        }
    }

    return {
        text: "",
        engine: "None",
        warnings: ["No valid source provided"]
    };
}
