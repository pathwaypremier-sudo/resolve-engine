
import type { CaseEvent } from "../../case/events";
import type {
    CrmSyncConfiguredPayload,
    CrmSyncRequestedPayload,
    CrmSyncAttemptedPayload,
    CrmSyncSucceededPayload,
    CrmSyncFailedPayload
} from "./crmSyncContract";

export function makeCrmSyncConfiguredEvent(meta: CrmSyncConfiguredPayload): CaseEvent {
    return {
        type: "CRM_SYNC_CONFIGURED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}

export function makeCrmSyncRequestedEvent(meta: CrmSyncRequestedPayload): CaseEvent {
    return {
        type: "CRM_SYNC_REQUESTED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}

export function makeCrmSyncAttemptedEvent(meta: CrmSyncAttemptedPayload): CaseEvent {
    return {
        type: "CRM_SYNC_ATTEMPTED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}

export function makeCrmSyncSucceededEvent(meta: CrmSyncSucceededPayload): CaseEvent {
    return {
        type: "CRM_SYNC_SUCCEEDED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}

export function makeCrmSyncFailedEvent(meta: CrmSyncFailedPayload): CaseEvent {
    return {
        type: "CRM_SYNC_FAILED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}
