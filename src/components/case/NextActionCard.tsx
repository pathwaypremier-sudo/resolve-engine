"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { getNextAction, type NextAction } from "@/lib/case/nextAction";

interface NextActionCardProps {
    caseId: string;
}

export default function NextActionCard({ caseId }: NextActionCardProps) {
    const [action, setAction] = useState<NextAction | null>(null);

    useEffect(() => {
        setAction(getNextAction(caseId));
    }, [caseId]);

    if (!action) {
        return null;
    }

    return (
        <Reveal>
            <Panel
                variant={action.blocked ? "subtle" : "default"}
                className={action.blocked ? "border-amber-200 bg-amber-50" : ""}
            >
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            {action.blocked && (
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                            )}
                            <p className="text-sm font-medium text-zinc-900">
                                {action.title}
                            </p>
                        </div>
                        <p className="mt-1 text-sm text-zinc-600">
                            {action.description}
                        </p>
                        {action.blocked && action.blocked_reason && (
                            <p className="mt-2 text-xs text-amber-700">
                                {action.blocked_reason}
                            </p>
                        )}
                    </div>

                    <Link
                        href={action.href}
                        className={[
                            "inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                            action.kind === "primary" && !action.blocked
                                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                                : action.blocked
                                    ? "bg-amber-600 text-white hover:bg-amber-700"
                                    : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                        ].join(" ")}
                    >
                        {action.blocked ? "Upgrade" : action.title}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </Panel>
        </Reveal>
    );
}
