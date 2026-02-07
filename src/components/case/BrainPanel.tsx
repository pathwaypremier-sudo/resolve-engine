"use client";

import { useState, useEffect } from "react";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import { useCaseHeaderFacts } from "@/lib/case/useCaseHeaderFacts";

interface BrainStatus {
    linked: boolean;
    provider: string;
    notebookUrl?: string;
    packVersion: string;
    sourcesCount: number;
}

export default function BrainPanel({ caseId }: { caseId: string }) {
    const [status, setStatus] = useState<BrainStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch status on mount
    useEffect(() => {
        fetchStatus();
    }, [caseId]);

    async function fetchStatus() {
        try {
            const res = await fetch(`/api/brain/status?caseId=${caseId}`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data);
            }
        } catch (e) {
            console.error("Failed to fetch brain status", e);
        }
    }

    async function handleConnect() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/brain/bootstrap", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caseId }),
            });
            if (!res.ok) throw new Error("Bootstrap failed");
            await fetchStatus();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleSync() {
        setLoading(true);
        setError(null);
        try {
            // grab minimal text source from local storage logic (simulated) or just a static summary
            const summary = localStorage.getItem(`re_case_${caseId}_summary`) || "No summary available.";

            const sources = [
                {
                    sourceKey: "intake_answers",
                    sourceType: "text",
                    content: `Case Summary: ${summary}\nGenerated at: ${new Date().toISOString()}`
                }
            ];

            const res = await fetch("/api/brain/sources/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ caseId, sources }),
            });
            if (!res.ok) throw new Error("Sync failed");
            await fetchStatus();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    if (!status) return null; // or loading spinner

    return (
        <Panel>
            <PanelHeader
                title="Case Brain"
                subtitle={status.linked ? `Connected to ${status.provider}` : "AI Assistant Integration"}
            />
            <PanelBody>
                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${status.linked ? "bg-green-500" : "bg-zinc-300"}`} />
                            <span className="font-medium text-zinc-700">
                                {status.linked ? "Active" : "Not Connected"}
                            </span>
                        </div>
                        {status.linked && (
                            <span className="text-xs text-zinc-500">
                                Sources: {status.sourcesCount} | {status.packVersion}
                            </span>
                        )}
                    </div>

                    {error && (
                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        {!status.linked && (
                            <button
                                onClick={handleConnect}
                                disabled={loading}
                                className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {loading ? "Connecting..." : "Connect Brain"}
                            </button>
                        )}

                        {status.linked && (
                            <>
                                {status.notebookUrl && (
                                    <a
                                        href={status.notebookUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
                                    >
                                        Open Brain
                                    </a>
                                )}
                                <button
                                    onClick={handleSync}
                                    disabled={loading}
                                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
                                >
                                    {loading ? "Syncing..." : "Sync Sources"}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </PanelBody>
        </Panel>
    );
}
