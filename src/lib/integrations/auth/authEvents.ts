
import type { CaseEvent } from "../../case/events";
import type {
    AuthSessionStartedPayload,
    AuthSessionEndedPayload,
    AuthPolicyEvaluatedPayload
} from "./authContract";

export function makeAuthSessionStartedEvent(meta: AuthSessionStartedPayload): CaseEvent {
    return {
        type: "AUTH_SESSION_STARTED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}

export function makeAuthSessionEndedEvent(meta: AuthSessionEndedPayload): CaseEvent {
    return {
        type: "AUTH_SESSION_ENDED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}

export function makeAuthPolicyEvaluatedEvent(meta: AuthPolicyEvaluatedPayload): CaseEvent {
    return {
        type: "AUTH_POLICY_EVALUATED",
        at: new Date().toISOString(),
        meta: meta as unknown as Record<string, unknown>
    };
}
