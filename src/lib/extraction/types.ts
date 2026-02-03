/**
 * Extraction types for Cloud Run–ready seam.
 * POC uses stub provider; future adapters can add real extraction.
 */

import type { ExtractedFacts } from "./extractFactsFromText";

export type ExtractedCaseFields = {
    issuer?: string | null;
    reference?: string | null;
    notice_date?: string | null; // ISO yyyy-mm-dd
};

export type ExtractCaseFieldsResult = {
    extracted: ExtractedCaseFields;
    confidence?: {
        issuer?: number;
        reference?: number;
        notice_date?: number;
    } | null;
    warnings?: string[];
    provider: "stub" | "cloud_run" | "regex-v1";
    version: string;
    detected?: ExtractedFacts;
};
