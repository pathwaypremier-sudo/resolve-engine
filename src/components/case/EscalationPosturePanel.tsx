"use client";

import Link from "next/link";
import { ShieldAlert, AlertCircle, FileText, Lock } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { useEntitlement } from "@/app/app/case/_context/EntitlementContext";
import { isRejectionRecorded } from "@/lib/case/escalation";
import { getProceduralRoute } from "@/lib/case/proceduralRoute";
import { useMemo } from "react";

export default function EscalationPosturePanel({ caseId }: { caseId: string }) {
    const { capabilities, tier } = useEntitlement();

    // Check route state (re-using helper logic or we can rely on isRejectionRecorded + capability)
    // The requirement says: "Show panel when rejection detected... AND user is not currently in INTAKE_IN_PROGRESS"
    // Also need to detect Premium boundary for styling/content.

    const isRejection = useMemo(() => isRejectionRecorded(caseId), [caseId]);
    const intakeSubmitted = typeof window !== "undefined" && localStorage.getItem(`re_case_${caseId}_intake_submitted`) === "1";

    if (!isRejection || !intakeSubmitted) {
        return null; // Not relevant
    }

    const canHandleCourt = capabilities.includes("HANDLE_COURT_BAILIFFS_CCJ");
    const isManaged = capabilities.includes("TRACK_RESPONSES") || capabilities.includes("SUBMIT_ON_BEHALF");

    // Premium boundary if caught in rejection but lacks court capability
    const isPremiumRequired = !canHandleCourt;

    return (
        <Reveal>
            <Panel
                variant={isPremiumRequired ? "warning" : "subtle"}
                className="space-y-4"
            >
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            {isPremiumRequired ? (
                                <ShieldAlert className="h-4 w-4 text-amber-600" />
                            ) : (
                                <AlertCircle className="h-4 w-4 text-zinc-500" />
                            )}
                            <h3 className={`text-sm font-semibold ${isPremiumRequired ? "text-amber-900" : "text-zinc-900"}`}>
                                Escalation posture
                            </h3>
                        </div>
                        <p className={`text-xs ${isPremiumRequired ? "text-amber-800" : "text-zinc-500"}`}>
                            Procedural next steps (record-only).
                        </p>
                    </div>
                </div>

                <div className={`space-y-4 text-sm ${isPremiumRequired ? "text-amber-900" : "text-zinc-600"}`}>
                    {/* 1) Written position request */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Written Position</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Request a written final position (deadlock) from the issuer.</li>
                            <li>Ask for any route to independent review/appeal, if available.</li>
                        </ul>
                    </div>

                    {/* 2) What to record */}
                    <div>
                        <h4 className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Record Keeping</h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Save the rejection/response document.</li>
                            <li>Record the date received and outcome.</li>
                            <li>Keep proof of submission and any follow-up messages.</li>
                        </ul>
                    </div>

                    {/* 3) Scope note */}
                    <div className={`pt-3 border-t ${isPremiumRequired ? "border-amber-200" : "border-zinc-200"} flex flex-col sm:flex-row sm:items-center justify-between gap-3`}>
                        <p className="text-xs opacity-90">
                            {isPremiumRequired ? (
                                "Escalation beyond pre-court requires Premium."
                            ) : isManaged ? (
                                "Managed handling continues up to pre-court stages within your entitlement."
                            ) : (
                                "This service provides the letter and instructions only."
                            )}
                        </p>

                        {isPremiumRequired && (
                            <Link
                                href={`/app/case/${caseId}/checkout`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 bg-white/50 hover:bg-white/80 px-2 py-1 rounded border border-amber-200 transition-colors"
                            >
                                <Lock className="h-3 w-3" />
                                Upgrade to Premium
                            </Link>
                        )}
                    </div>
                </div>
            </Panel>
        </Reveal>
    );
}
