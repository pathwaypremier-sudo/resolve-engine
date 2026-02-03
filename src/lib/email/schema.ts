
export type EmailOutboxAttachment = {
    name: string;
    uri: string;
    checksumSha256: string;
    mime: string;
    sizeBytes: number;
};

export type EmailOutboxItem = {
    id: string;
    caseId: string;
    createdAtIso: string;
    to: string | null;
    subject: string;
    bodyText: string;
    attachments: EmailOutboxAttachment[];
    status: "DRAFT" | "READY" | "SENT" | "FAILED";
};

export type EmailOutbox = {
    items: EmailOutboxItem[];
};
