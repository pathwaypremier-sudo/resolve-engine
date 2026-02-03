"use client";

import { ReactNode } from "react";
import { Capability, useEntitlement } from "./EntitlementContext";

export function EntitlementGate({
    requires,
    children,
}: {
    requires: Capability;
    children: ReactNode;
}) {
    const entitlement = useEntitlement();

    if (!entitlement.capabilities.includes(requires)) {
        return (
            <div className="rounded-xl border border-zinc-200 bg-white p-4">
                <p className="text-sm font-medium">This action requires Managed for this case</p>
                <div className="mt-3">
                    <a
                        href="./checkout"
                        className="inline-flex items-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                        View service tiers
                    </a>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
