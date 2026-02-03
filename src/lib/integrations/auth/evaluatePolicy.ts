
import { persistence } from "@/lib/persistence/PersistenceAdapter";
import { makeAuthPolicyEvaluatedEvent } from "./authEvents";
import type { PolicyDecision } from "./authContract";
import { getActiveSession } from "./stubAuth";
import type { CaseEvent } from "@/lib/case/events";

const STORE_KEY_AUTH_LOG = "re_auth_events_v1";

function appendAuthEvent(event: CaseEvent) {
    const raw = persistence.get(STORE_KEY_AUTH_LOG);
    const events: CaseEvent[] = raw ? JSON.parse(raw) : [];
    events.push(event);
    persistence.setJSON(STORE_KEY_AUTH_LOG, events);
}

export function evaluatePolicy(args: {
    policyKey: string;
    defaultDecision?: PolicyDecision
}): { decision: PolicyDecision; reasonCode: string } {
    const session = getActiveSession();

    // By default, verify session exists
    if (!session) {
        const decision = "DENY";
        const reasonCode = "MISSING_SESSION";

        appendAuthEvent(makeAuthPolicyEvaluatedEvent({
            policyKey: args.policyKey,
            decision,
            reasonCode
        }));

        return { decision, reasonCode };
    }

    // Stub logic: allow everything if session exists, unless explicitly denied by environment or default
    // We respect the 'defaultDecision' if provided for specific gates.
    // If not provided, we default to ALLOW in V1 Stub to prevent breaking changes.
    let decision: PolicyDecision = args.defaultDecision ?? "ALLOW";
    let reasonCode = "DEFAULT_POLICY";

    // Example override check (future proofing)
    if (process.env.NEXT_PUBLIC_DENY_ALL_POLICIES === "1") {
        decision = "DENY";
        reasonCode = "ENV_OVERRIDE";
    }

    appendAuthEvent(makeAuthPolicyEvaluatedEvent({
        policyKey: args.policyKey,
        decision,
        reasonCode
    }));

    return { decision, reasonCode };
}
