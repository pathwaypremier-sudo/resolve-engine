"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { useCase } from "@/app/app/case/_context/CaseContext";
import { useEntitlement } from "@/app/app/case/_context/EntitlementContext";
import { getProceduralRoute, type ProceduralRouteData } from "@/lib/case/proceduralRoute";
import { useMemo } from "react";

export default function ProceduralRoutePanel({ caseId }: { caseId: string }) {
    const { capabilities } = useEntitlement();
    const route = useMemo(() => getProceduralRoute(caseId, capabilities), [caseId, capabilities]);

    const isPremiumRequired = route.state === "PREMIUM_REQUIRED";

    return (
        <Reveal>
            <Panel
                variant={isPremiumRequired ? "warning" : "subtle"}
                className="space-y-4"
            >
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        {isPremiumRequired && <ShieldAlert className="h-4 w-4 text-amber-600" />}
                        <h3 className={`text-sm font-semibold ${isPremiumRequired ? "text-amber-900" : "text-zinc-900"}`}>
                            {route.title}
                        </h3>
                    </div>

                    <ul className="space-y-1.5 mt-2">
                        {route.body.map((line, idx) => (
                            <li key={idx} className={`text-sm ${isPremiumRequired ? "text-amber-800" : "text-zinc-600"}`}>
                                {line}
                            </li>
                        ))}
                    </ul>

                    {route.notes && route.notes.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-zinc-200/50">
                            {route.notes.map((note, idx) => (
                                <p key={idx} className="text-xs text-zinc-500">
                                    {note}
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                <div className="pt-3 border-t border-zinc-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-zinc-400">
                        Record everything in writing. Use your identifiers and keep copies.
                    </p>

                    {/* Optional link to next action if needed, though NextActionCard is primary */}
                    {/* User instruction: "No CTA button... If you must link, add a single text link" */}
                    {/* Current design has NextActionCard elsewhere. Typically we don't need a link. */}
                </div>
            </Panel>
        </Reveal>
    );
}
