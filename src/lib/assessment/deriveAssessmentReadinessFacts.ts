export type ReadinessStatus = "recorded" | "not_recorded" | "partial";

export type ReadinessFact = {
    label: string;
    status: ReadinessStatus;
    detail?: string;
};

export function deriveAssessmentReadinessFacts(caseId: string): ReadinessFact[] {
    if (typeof window === "undefined") return [];

    const facts: ReadinessFact[] = [];
    const getVal = (k: string) => localStorage.getItem(`re_case_${caseId}_${k}`);

    // 1. Dispute Type
    const disputeType = getVal("dispute_type");
    if (disputeType && disputeType !== "NOT_SURE" && disputeType !== "null") {
        facts.push({ label: "Dispute type identified", status: "recorded", detail: disputeType });
    } else {
        facts.push({ label: "Dispute type identified", status: "not_recorded" });
    }

    // 2. Reference Number (Intake "reference" or Paper Trail "ref_check"="YES")
    const ref = getVal("reference");
    const refCheck = getVal("ref_check");
    const hasRef = (ref && ref.trim().length > 0) || refCheck === "YES";

    if (hasRef) {
        facts.push({ label: "Reference number", status: "recorded" });
    } else {
        facts.push({ label: "Reference number", status: "not_recorded" });
    }

    // 3. Copies Kept "copies_kept"
    const copiesKept = getVal("copies_kept");
    if (copiesKept === "YES") {
        facts.push({ label: "Copies of correspondence", status: "recorded" });
    } else if (copiesKept === "PARTLY") {
        facts.push({ label: "Copies of correspondence", status: "partial", detail: "Some missing" });
    } else if (copiesKept === "NO") {
        facts.push({ label: "Copies of correspondence", status: "not_recorded", detail: "Discarded or lost" });
    } else {
        facts.push({ label: "Copies of correspondence", status: "not_recorded" });
    }

    // 4. Contact Status
    const contactStatus = getVal("contact_status");
    if (contactStatus === "YES_WRITING") {
        facts.push({ label: "Prior contact", status: "recorded", detail: "In writing" });
    } else if (contactStatus === "YES_PHONE") {
        facts.push({ label: "Prior contact", status: "partial", detail: "By phone (weak trail)" });
    } else if (contactStatus === "NO") {
        facts.push({ label: "Prior contact", status: "recorded", detail: "None yet" }); // Recording "No" is a recorded fact
    } else {
        facts.push({ label: "Prior contact", status: "not_recorded" });
    }

    // 5. Answer Copies (if contacted)
    if (contactStatus === "YES_WRITING") {
        const contactCopy = getVal("contact_copy");
        if (contactCopy === "YES") {
            facts.push({ label: "Copy of sent message", status: "recorded" });
        } else if (contactCopy === "NO") {
            facts.push({ label: "Copy of sent message", status: "not_recorded", detail: "Missing" });
        } else {
            facts.push({ label: "Copy of sent message", status: "not_recorded" });
        }
    }

    // 6. Documents
    const docsJson = getVal("docs");
    let hasDocs = false;
    if (docsJson) {
        try {
            const docs = JSON.parse(docsJson);
            if (Array.isArray(docs) && docs.length > 0) hasDocs = true;
        } catch { }
    }

    if (hasDocs) {
        facts.push({ label: "Evidence documents", status: "recorded" });
    } else {
        facts.push({ label: "Evidence documents", status: "not_recorded" });
    }

    // 7. Key Dates
    const noticeDate = getVal("notice_date");
    const eventDate = getVal("event_date");
    if (noticeDate && eventDate) {
        facts.push({ label: "Key timeline dates", status: "recorded" });
    } else if (noticeDate || eventDate) {
        facts.push({ label: "Key timeline dates", status: "partial" });
    } else {
        facts.push({ label: "Key timeline dates", status: "not_recorded" });
    }

    return facts;
}

export type DeliverableReadiness = {
    isBlocking: boolean;
    issues: {
        label: string;
        severity: "BLOCKING" | "WARNING";
        href?: string;
    }[];
};

export function deriveDeliverableReadiness(caseId: string): DeliverableReadiness {
    if (typeof window === "undefined") return { isBlocking: true, issues: [] };

    const issues: DeliverableReadiness["issues"] = [];
    const getVal = (k: string) => localStorage.getItem(`re_case_${caseId}_${k}`);

    // 1. Critical: Dispute Type
    const dt = getVal("dispute_type");
    if (!dt || dt === "NOT_SURE" || dt === "null") {
        issues.push({
            label: "Dispute type not identified",
            severity: "BLOCKING",
            href: `/app/case/${caseId}/assessment` // Anchor if possible
        });
    }

    // 2. Critical: Issuer
    const issuer = getVal("issuer");
    if (!issuer || issuer === "NOT_SURE") {
        issues.push({
            label: "Issuer not identified",
            severity: "BLOCKING",
            href: `/app/case/${caseId}/assessment`
        });
    }

    // 3. Critical: Basic Facts (Summary) - anchored anchor of letter
    const summary = getVal("summary");
    if (!summary || summary === "NOT_SURE") {
        issues.push({
            label: "Summary of events missing",
            severity: "BLOCKING",
            href: `/app/case/${caseId}/assessment`
        });
    }

    // 4. Warning: Reference
    const ref = getVal("reference");
    if (!ref || ref === "NOT_SURE") {
        issues.push({
            label: "Reference number not recorded",
            severity: "WARNING",
            href: `/app/case/${caseId}/assessment`
        });
    }

    // 5. Warning: Dates
    const noticeDate = getVal("notice_date");
    if (!noticeDate || noticeDate === "NOT_SURE") {
        issues.push({
            label: "Notice date not recorded",
            severity: "WARNING",
            href: `/app/case/${caseId}/assessment`
        });
    }

    // 6. Integrity: Evidence Mismatch
    const evidenceStatus = getVal("evidence_status");
    const docsJson = getVal("docs");
    let hasDocs = false;
    try {
        if (docsJson) {
            const d = JSON.parse(docsJson);
            if (Array.isArray(d) && d.length > 0) hasDocs = true;
        }
    } catch { }

    if (evidenceStatus === "PROVIDED" && !hasDocs) {
        issues.push({
            label: "Evidence marked as PROVIDED but no files found",
            severity: "WARNING", // Not blocking generation, but confusing
            href: `/intake?case=${caseId}`
        });
    }
    if (evidenceStatus === "NONE_DECLARED" && hasDocs) {
        // confusing but benign
    }

    const isBlocking = issues.some(i => i.severity === "BLOCKING");

    return { isBlocking, issues };
}
