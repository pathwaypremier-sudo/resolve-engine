"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PageScaffold from "@/components/app/PageScaffold";
import GuidanceRail from "@/components/app/GuidanceRail";
import { readCaseRegistry, type CaseRegistryItem } from "@/lib/case/registry";
import { ArrowRight, Clock, FolderOpen } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";

import { getCaseEvents } from "@/app/app/case/_context/CaseEvents";

export default function AppDashboardPage() {
    const [cases, setCases] = useState<CaseRegistryItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        // Load registry and enrich with authoritative event log timestamps
        const registry = readCaseRegistry();

        const enriched = registry.map(c => {
            const events = getCaseEvents(c.id);
            // Events are appended, so last one is usually newest, but let's be safe
            // or just take the last one since addCaseEvent pushes.
            const lastEvent = events[events.length - 1];

            let lastActivity = c.lastActivityAt;
            if (lastEvent && new Date(lastEvent.at).getTime() > new Date(lastActivity).getTime()) {
                lastActivity = lastEvent.at;
            }
            return { ...c, lastActivityAt: lastActivity };
        });

        // Re-sort by fresh activity
        enriched.sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

        setCases(enriched);
        setLoaded(true);
    }, []);

    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return "Unknown date";
        }
    };

    const getDisputeBadge = (type: string | null) => {
        const base = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border";
        if (type === "COUNCIL_PCN") {
            return <span className={`${base} bg-zinc-100 text-zinc-700 border-zinc-200`}>Council PCN</span>;
        }
        if (type === "PRIVATE_PARKING") {
            return <span className={`${base} bg-zinc-100 text-zinc-700 border-zinc-200`}>Private parking</span>;
        }
        return <span className={`${base} bg-zinc-50 text-zinc-500 border-zinc-100`}>Not sure</span>;
    };

    return (
        <PageScaffold
            title="Overview"
            subtitle="Case workspace"
            rightRail={
                <GuidanceRail
                    records={["Case selection", "Recent case activity (view)"]}
                    derives={["Procedural position", "Integrity signals"]}
                    exports={["Export pack", "Cover sheet (.txt)"]}
                />
            }
        >
            {/* Empty State */}
            {loaded && cases.length === 0 && (
                <EmptyState
                    title="No cases yet"
                    body="Create a case to start recording case facts and producing case-bound deliverables."
                    primaryAction={{
                        label: "Create a case",
                        href: "/app/new",
                    }}
                    icon={FolderOpen}
                />
            )}

            {/* Case List */}
            {loaded && cases.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-medium text-zinc-900">Your cases</h2>
                        <Link
                            href="/app/new"
                            className="text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-4"
                        >
                            Create new
                        </Link>
                    </div>

                    <div className="grid gap-3">
                        {cases.map((c) => (
                            <Link
                                key={c.id}
                                href={`/app/case/${c.id}`}
                                className="group block rounded-xl border border-zinc-200 bg-white p-4 transition-all hover:border-zinc-300 hover:shadow-sm"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-zinc-900">
                                                {c.title || `Case ${c.id.slice(0, 8)}`}
                                            </h3>
                                            {getDisputeBadge(c.disputeType)}
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                                            {c.issuerName && (
                                                <>
                                                    <span className="font-medium text-zinc-700">{c.issuerName}</span>
                                                    <span className="text-zinc-300">•</span>
                                                </>
                                            )}
                                            <span>Last activity: {formatTime(c.lastActivityAt)}</span>
                                            <span className="block text-[10px] text-zinc-400">Derived from case events.</span>
                                        </div>
                                    </div>

                                    <div
                                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 group-hover:bg-zinc-50 group-hover:text-zinc-900 transition-colors"
                                    >
                                        Open
                                        <ArrowRight className="h-3 w-3" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </PageScaffold>
    );
}
