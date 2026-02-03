
// CRM Sync Contract Types
// Aligned with docs/integrations/CRM_SYNC.md

export type CrmSyncMode = "stub" | "webhook";
export type CrmSyncScope = "case" | "export_pack";

export type CrmSyncConfiguredPayload = {
    targetId: string;
    mode: CrmSyncMode;
    notes?: string;
};

export type CrmSyncRequestedPayload = {
    targetId: string;
    scope: CrmSyncScope;
    idempotencyKey: string;
};

export type CrmSyncAttemptedPayload = {
    targetId: string;
    attemptId: string;
    atIso: string;
};

export type CrmSyncSucceededPayload = {
    targetId: string;
    attemptId: string;
    resultSummary?: string;
};

export type CrmSyncFailedPayload = {
    targetId: string;
    attemptId: string;
    failureClass: "NETWORK" | "AUTH" | "INVALID_CONFIG" | "UNKNOWN" | "TARGET_ERROR";
    retryable: boolean;
};
