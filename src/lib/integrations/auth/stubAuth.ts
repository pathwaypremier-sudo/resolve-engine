
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import {
    makeAuthSessionStartedEvent,
    makeAuthSessionEndedEvent
} from "./authEvents";
import type { Identity, Session } from "./authContract";
import type { CaseEvent } from "@/lib/case/events";

const STORE_KEY_IDENTITY = "re_auth_identity_v1";
const STORE_KEY_SESSION = "re_auth_session_v1";
const STORE_KEY_AUTH_LOG = "re_auth_events_v1"; // Separate log for system-wide auth events

// Helper for auth-specific event logging (non-case)
function appendAuthEvent(event: CaseEvent) {
    const raw = persistence.get(STORE_KEY_AUTH_LOG);
    const events: CaseEvent[] = raw ? JSON.parse(raw) : [];
    events.push(event);
    persistence.setJSON(STORE_KEY_AUTH_LOG, events);
}

export function getOrCreateStubIdentity(): Identity {
    const existing = persistence.getJSON<Identity>(STORE_KEY_IDENTITY);
    if (existing) return existing;

    const newIdentity: Identity = {
        actorId: `actor_${crypto.randomUUID()}`,
        mode: "stub",
        createdAtIso: new Date().toISOString()
    };
    persistence.setJSON(STORE_KEY_IDENTITY, newIdentity);
    return newIdentity;
}

export function startStubSession(identityOverride?: Identity, options?: { reason?: string }): Session {
    const identity = identityOverride || getOrCreateStubIdentity();
    const sessionId = `sess_${crypto.randomUUID()}`;
    const startedAtIso = new Date().toISOString();

    const session: Session = {
        sessionId,
        actorId: identity.actorId,
        startedAtIso
    };

    persistence.setJSON(STORE_KEY_SESSION, session);

    // Record provenance
    appendAuthEvent(makeAuthSessionStartedEvent({
        actorId: identity.actorId,
        mode: identity.mode,
        sessionId,
        reason: options?.reason
    }));

    return session;
}

export function endStubSession(reason: string): void {
    const session = persistence.getJSON<Session>(STORE_KEY_SESSION);
    if (session) {
        // In a real system, we'd mark it ended. Here we just wipe the active pointer.
        persistence.remove(STORE_KEY_SESSION);

        appendAuthEvent(makeAuthSessionEndedEvent({
            sessionId: session.sessionId,
            reason
        }));
    }
}

export function getActiveSession(): Session | null {
    return persistence.getJSON<Session>(STORE_KEY_SESSION);
}
