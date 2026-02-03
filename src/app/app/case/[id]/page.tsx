"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCase } from "../_context/CaseContext";
import { useEntitlement } from "../_context/EntitlementContext";
import { getCaseEvents, addCaseEvent, type CaseEvent } from "../_context/CaseEvents";
import { getOrCreateCaseEmail } from "../_context/CaseEmail";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CaseHeader from "@/components/case/CaseHeader";
import { useCaseHeaderFacts } from "@/lib/case/useCaseHeaderFacts";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";

import CaseTimeline from "@/components/case/CaseTimeline";
import NextActionCard from "@/components/case/NextActionCard";
import CaseFileIndex from "@/components/case/CaseFileIndex";
import CaseIntegritySignal from "@/components/case/CaseIntegritySignal";
import ProceduralPositionStrip from "@/components/case/ProceduralPositionStrip";
import { readCaseRegistry } from "@/lib/case/registry";
import EmptyState from "@/components/ui/EmptyState";
import { FolderX } from "lucide-react";
import { PageSection } from "@/components/ui/PageSection";
import { KeyValueList, KeyValueRow } from "@/components/ui/KeyValue";



export default function CaseOverviewPage() {
    const { id, status } = useCase();
    const { tier } = useEntitlement();
    const headerFacts = useCaseHeaderFacts(id);

    const [events, setEvents] = useState<CaseEvent[]>([]);
    const [caseEmail, setCaseEmail] = useState<string | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        // Verify case exists locally
        const registry = readCaseRegistry();
        const exists = registry.some(c => c.id === id);

        if (!exists) {
            setNotFound(true);
            return;
        }

        const evts = getCaseEvents(id);
        setEvents(evts);

        // Case email for Managed/Annual only
        if (tier === "MANAGED" || tier === "ANNUAL_ACCESS") {
            const hasEmailEvent = evts.some((e) => e.type === "CASE_EMAIL_ASSIGNED");
            const { email, isNew } = getOrCreateCaseEmail(id);
            setCaseEmail(email);
            if (isNew && !hasEmailEvent) {
                addCaseEvent(id, { type: "CASE_EMAIL_ASSIGNED", at: new Date().toISOString(), meta: { email } });
                setEvents(getCaseEvents(id));
            }
        }
    }, [id, tier]);

    if (notFound) {
        return (
            <main>
                <Breadcrumbs
                    items={[
                        { label: "Dashboard", href: "/app" },
                        { label: "Case not found" },
                    ]}
                />
                <div className="mt-8">
                    <EmptyState
                        title="Case not found"
                        body="This case is not available on this device. If you have a case export, restore it from the cases area."
                        primaryAction={{
                            label: "Go to cases",
                            href: "/app",
                        }}
                        icon={FolderX}
                    />
                </div>
            </main>
        );
    }

    return (
        <main className="space-y-6">
            <Breadcrumbs
                items={[
                    { label: "Dashboard", href: "/app" },
                    { label: `Case ${id.slice(0, 8)}` },
                ]}
            />
            <PageSection>
                {/* Standardized Case Header */}
                {/* Standardized Case Header */}
                <CaseHeader
                    caseId={id}
                    {...headerFacts}
                />

                {/* Legacy identifiers component removed in favor of header, but keeping IDs in context if needed */}
                {/* <CaseIdentifiers caseId={id} /> */}

                {/* Procedural position strip */}
                <ProceduralPositionStrip caseId={id} />

                {/* Next action */}
                <NextActionCard caseId={id} />

                {/* Case File Index (Replaces simple status) */}
                <CaseFileIndex caseId={id} />

                {/* Case integrity signal */}
                <CaseIntegritySignal caseId={id} />

                {/* Case contact (Managed/Annual only) */}
                {caseEmail && (
                    <section className="rounded-xl border border-zinc-200 bg-white p-4">
                        <p className="text-sm font-medium">Case contact</p>
                        <p className="mt-1 text-sm font-mono text-zinc-900">{caseEmail}</p>
                        <p className="mt-1 text-xs text-zinc-400">
                            Use this address for all correspondence for this case.
                        </p>
                    </section>
                )}

                {/* Timeline */}
                <CaseTimeline caseId={id} mode="compact" showFullCollapsible />

                {/* Quick links */}
                <section className="flex flex-wrap gap-3">
                    <Link
                        href={`/app/case/${id}/assessment?case=${id}`}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                        Assessment
                    </Link>
                    <Link
                        href={`/app/case/${id}/checkout?case=${id}`}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                        Checkout
                    </Link>
                    <Link
                        href={`/app/case/${id}/deliver?case=${id}`}
                        className="rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50"
                    >
                        Deliverables
                    </Link>
                </section>
            </PageSection>
        </main>
    );
}
