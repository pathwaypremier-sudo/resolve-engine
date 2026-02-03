import type { ReactNode } from "react";
import AppShell from "@/components/app/AppShell";
import { getActiveSession, getOrCreateStubIdentity, startStubSession } from "@/lib/integrations/auth/stubAuth";

export default function AppLayout({ children }: { children: ReactNode }) {
    if (process.env.NODE_ENV !== "production") {
        const session = getActiveSession();
        if (!session) {
            const identity = getOrCreateStubIdentity();
            startStubSession(identity, { reason: "dev-auto-session" });
        }
    }

    return <AppShell>{children}</AppShell>;
}
