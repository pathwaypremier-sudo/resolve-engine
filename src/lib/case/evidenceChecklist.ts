/**
 * Evidence Checklist Normalisation
 * Maps uploaded docs into canonical categories and checks against typical requirements.
 * Not legal advice. Operational completeness only.
 */

// Data Model Types
export type DisputeType = "COUNCIL_PCN" | "PRIVATE_PARKING" | "CONSUMER_GOODS" | "UNKNOWN";
export type EvidenceItemStatus = "PRESENT" | "MISSING" | "OPTIONAL";
export type CanonicalBucket =
    | "NOTICE"
    | "FOLLOW_UP_NOTICE"
    | "APPEAL_COPY"
    | "RESPONSE"
    | "PHOTOS"
    | "SIGNAGE"
    | "PERMIT_OR_PAYMENT"
    | "VEHICLE_DOCS"
    | "OTHER";

export type MatchedDoc = {
    id: string;
    name: string;
    category?: string | null;
};

export type EvidenceItem = {
    key: string;
    label: string;
    status: EvidenceItemStatus;
    matched_docs: MatchedDoc[];
    notes?: string | null;
};

export type EvidenceChecklist = {
    version: "1.0";
    dispute_type: DisputeType;
    generated_at_iso: string;
    items: EvidenceItem[];
    summary: {
        present: number;
        missing: number;
        optional: number;
    };
    disclaimer: string;
};

// Document type from localStorage
type StorageDoc = {
    id: string;
    name: string;
    type: string;
    size: number;
    category?: string;
};

/**
 * Normalize a user category string to a canonical bucket.
 */
function normalizeBucket(category: string | undefined | null): CanonicalBucket {
    if (!category) return "OTHER";
    const lower = category.toLowerCase().trim();

    if (
        lower.includes("pcn") ||
        lower.includes("parking charge") ||
        lower === "notice" ||
        lower.includes("charge notice")
    ) {
        return "NOTICE";
    }

    if (
        lower.includes("reminder") ||
        lower.includes("nto") ||
        lower.includes("notice to owner") ||
        lower.includes("final notice") ||
        lower.includes("keeper")
    ) {
        return "FOLLOW_UP_NOTICE";
    }

    if (lower.includes("appeal") || lower.includes("representation")) {
        return "APPEAL_COPY";
    }

    if (
        lower.includes("rejection") ||
        lower.includes("response") ||
        lower.includes("decision")
    ) {
        return "RESPONSE";
    }

    if (lower.includes("photo") || lower.includes("evidence") || lower.includes("pic")) {
        return "PHOTOS";
    }

    if (lower.includes("sign")) {
        return "SIGNAGE";
    }

    if (
        lower.includes("permit") ||
        lower.includes("payment") ||
        lower.includes("receipt") ||
        lower.includes("paid")
    ) {
        return "PERMIT_OR_PAYMENT";
    }

    if (
        lower.includes("v5c") ||
        lower.includes("logbook") ||
        lower.includes("vehicle") ||
        lower.includes("registration")
    ) {
        return "VEHICLE_DOCS";
    }

    return "OTHER";
}

/**
 * Read docs from localStorage safely.
 */
function readDocs(caseId: string): StorageDoc[] {
    const raw = persistence.get(`re_case_${caseId}_docs`);
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/**
 * Detect dispute type from localStorage or infer UNKNOWN.
 * Strictly uses existing keys or inference, no new keys invented.
 */
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { readDisputeType } from "./disputeType";

/**
 * Build the checklist based on dispute type and docs.
 */
export function buildEvidenceChecklist(caseId: string): EvidenceChecklist {
    const dt = readDisputeType(caseId);
    const disputeType = dt ?? "UNKNOWN";
    const docs = readDocs(caseId);

    // Map docs to buckets
    const docsByBucket: Record<CanonicalBucket, MatchedDoc[]> = {
        NOTICE: [],
        FOLLOW_UP_NOTICE: [],
        APPEAL_COPY: [],
        RESPONSE: [],
        PHOTOS: [],
        SIGNAGE: [],
        PERMIT_OR_PAYMENT: [],
        VEHICLE_DOCS: [],
        OTHER: [],
    };

    docs.forEach((doc) => {
        const bucket = normalizeBucket(doc.category);
        docsByBucket[bucket].push({
            id: doc.id,
            name: doc.name,
            category: doc.category,
        });
    });

    const items: EvidenceItem[] = [];

    // Helper to add item
    const addItem = (
        key: string,
        label: string,
        buckets: CanonicalBucket[],
        required: boolean,
        notes?: string
    ) => {
        const matched = buckets.flatMap((b) => docsByBucket[b]);
        let status: EvidenceItemStatus = "OPTIONAL";

        if (matched.length > 0) {
            status = "PRESENT";
        } else if (required) {
            status = "MISSING";
        }

        items.push({
            key,
            label,
            status,
            matched_docs: matched,
            notes: notes || null,
        });
    };

    if (disputeType === "COUNCIL_PCN") {
        addItem("NOTICE", "PCN / Notice", ["NOTICE"], true);
        addItem(
            "FOLLOW_UP_NOTICE",
            "Notice to Owner / follow-up notices (if received)",
            ["FOLLOW_UP_NOTICE"],
            false
        );
        addItem(
            "APPEAL_COPY",
            "Any representations submitted (if applicable)",
            ["APPEAL_COPY"],
            false
        );
        addItem(
            "RESPONSE",
            "Any council response / decision (if received)",
            ["RESPONSE"],
            false
        );
        addItem("PHOTOS", "Photos / evidence (if available)", ["PHOTOS", "SIGNAGE"], false);
        addItem(
            "PERMIT_OR_PAYMENT",
            "Permit / payment proof (if relevant)",
            ["PERMIT_OR_PAYMENT"],
            false
        );
    } else if (disputeType === "PRIVATE_PARKING") {
        addItem("NOTICE", "Parking Charge Notice / Notice", ["NOTICE"], true);
        addItem(
            "FOLLOW_UP_NOTICE",
            "Notice to Keeper / follow-up letters (if received)",
            ["FOLLOW_UP_NOTICE"],
            false
        );
        addItem(
            "APPEAL_COPY",
            "Any appeal submitted (if applicable)",
            ["APPEAL_COPY"],
            false
        );
        addItem(
            "RESPONSE",
            "Operator response / rejection (if received)",
            ["RESPONSE"],
            false
        );
        addItem(
            "PHOTOS_SIGNAGE",
            "Signage / location photos (if available)",
            ["SIGNAGE", "PHOTOS"],
            false
        );
        addItem(
            "PERMIT_OR_PAYMENT",
            "Permit / payment proof (if relevant)",
            ["PERMIT_OR_PAYMENT"],
            false
        );
    } else if (disputeType === "CONSUMER_GOODS") {
        addItem(
            "PURCHASE_PROOF",
            "Proof of purchase (receipt/order confirmation)",
            ["PERMIT_OR_PAYMENT"],
            true
        );
        addItem(
            "PRODUCT_DETAILS",
            "Product listing / description (if available)",
            ["OTHER"],
            false
        );
        addItem(
            "PHOTOS",
            "Photos (if relevant)",
            ["PHOTOS", "SIGNAGE"],
            false
        );
        addItem(
            "CORRESPONDENCE",
            "Correspondence with the seller",
            ["APPEAL_COPY", "RESPONSE"],
            false
        );
        addItem(
            "TERMS",
            "Any terms provided at purchase",
            ["NOTICE"],
            false
        );
    } else {
        // UNKNOWN
        addItem("NOTICE", "Notice / charge document", ["NOTICE"], true);
        addItem("PHOTOS", "Photos / evidence (if available)", ["PHOTOS", "SIGNAGE"], false);
        addItem("RESPONSE", "Any issuer response (if received)", ["RESPONSE"], false);
    }

    // Calculate summary
    const summary = {
        present: items.filter((i) => i.status === "PRESENT").length,
        missing: items.filter((i) => i.status === "MISSING").length,
        optional: items.filter((i) => i.status === "OPTIONAL").length,
    };

    return {
        version: "1.0",
        dispute_type: disputeType,
        generated_at_iso: new Date().toISOString(),
        items,
        summary,
        disclaimer: "Checklist only. Evidence needs vary by issuer and circumstances.",
    };
}
