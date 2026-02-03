
// Auth Contract Types (V1)
// Aligned with docs/integrations/AUTH.md

export type AuthMode = "stub" | "provider";

export type Identity = {
    actorId: string;
    mode: AuthMode;
    createdAtIso: string;
};

export type Session = {
    sessionId: string;
    actorId: string;
    startedAtIso: string;
    endedAtIso?: string;
};

export type PolicyDecision = "ALLOW" | "DENY";

export type AuthSessionStartedPayload = {
    actorId: string;
    mode: AuthMode;
    sessionId: string;
    reason?: string;
};

export type AuthSessionEndedPayload = {
    sessionId: string;
    reason: string;
};

export type AuthPolicyEvaluatedPayload = {
    policyKey: string;
    decision: PolicyDecision;
    reasonCode: string;
};
