"use client";

import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { appendCaseEvent } from "@/lib/case/events";
import { EmailOutboxItem, EmailOutboxAttachment } from "@/lib/email/schema";

// Helper to get unified case object key
const getCaseKey = (caseId: string) => `re_case_${caseId}`;

export async function createEmailOutbox(
    caseId: string,
    payload: {
        to?: string | null;
        subject: string;
        bodyText: string;
        attachments?: EmailOutboxAttachment[];
    }
): Promise<EmailOutboxItem> {
    const key = getCaseKey(caseId);

    // Generate ID
    const id = `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const newItem: EmailOutboxItem = {
        id,
        caseId,
        createdAtIso: new Date().toISOString(),
        to: payload.to || null,
        subject: payload.subject,
        bodyText: payload.bodyText,
        attachments: payload.attachments || [],
        status: "DRAFT"
    };

    // Load case object (or init empty if migration start)
    const caseRecord = persistence.getJSON<any>(key) || {};

    // Ensure outbox array exists
    if (!Array.isArray(caseRecord.outbox)) {
        caseRecord.outbox = [];
    }

    caseRecord.outbox.push(newItem);
    persistence.setJSON(key, caseRecord);

    // Event
    appendCaseEvent(caseId, {
        type: "EMAIL_OUTBOX_CREATED",
        at: new Date().toISOString(),
        meta: {
            outboxId: id,
            subject: newItem.subject,
            attachmentCount: newItem.attachments.length
        }
    });

    return newItem;
}

export async function updateEmailOutbox(
    caseId: string,
    outboxId: string,
    patch: {
        subject?: string;
        bodyText?: string;
        attachments?: EmailOutboxAttachment[];
        to?: string | null;
    }
): Promise<EmailOutboxItem> {
    const key = getCaseKey(caseId);
    const caseRecord = persistence.getJSON<any>(key) || {};
    const items = (Array.isArray(caseRecord.outbox) ? caseRecord.outbox : []) as EmailOutboxItem[];

    const index = items.findIndex(i => i.id === outboxId);
    if (index === -1) {
        throw new Error(`Outbox item ${outboxId} not found`);
    }

    const current = items[index];

    // Apply patch
    const updated: EmailOutboxItem = {
        ...current,
        subject: patch.subject ?? current.subject,
        bodyText: patch.bodyText ?? current.bodyText,
        attachments: patch.attachments ?? current.attachments,
        to: patch.to !== undefined ? patch.to : current.to
    };

    items[index] = updated;
    caseRecord.outbox = items;
    persistence.setJSON(key, caseRecord);

    // Calculate changed fields for meta
    const changedFields = Object.keys(patch).filter(k => patch[k as keyof typeof patch] !== undefined);

    // Event
    appendCaseEvent(caseId, {
        type: "EMAIL_OUTBOX_UPDATED",
        at: new Date().toISOString(),
        meta: {
            outboxId,
            changedFields
        }
    });

    return updated;
}
