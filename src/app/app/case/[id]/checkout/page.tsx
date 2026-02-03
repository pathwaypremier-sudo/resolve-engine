"use client";

import { useRouter } from "next/navigation";
import { useCase } from "../../_context/CaseContext";
import { addCaseEvent } from "../../_context/CaseEvents";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SectionHeader from "@/components/ui/SectionHeader";
import CaseIdentifiers from "@/components/case/CaseIdentifiers";
import { readCaseRegistry } from "@/lib/case/registry";
import EmptyState from "@/components/ui/EmptyState";
import GuidanceDock from "@/components/app/GuidanceDock";
import { useEffect, useState } from "react";
import { FolderX } from "lucide-react";
import { PageSection } from "@/components/ui/PageSection";

type Tier = {
    id: string;
    name: string;
    price: string;
    meta: string;
    bullets: string[];
};

const tiers: Tier[] = [
    {
        id: "appeal_builder",
        name: "Appeal Builder",
        price: "£1.99",
        meta: "One-time",
        bullets: [
            "Appeal letter draft for this case",
            "Submission instructions (reference-only)",
            "No follow-up handling",
            "No response tracking",
        ],
    },
    {
        id: "managed",
        name: "Managed",
        price: "£9.99",
        meta: "Per case",
        bullets: [
            "Submission and response tracking (pre-court)",
            "Handling rejections up to pre-court stage",
            "Dedicated case email (issued on activation)",
            "Stops pre-court",
        ],
    },
    // Premium and Annual Access hidden from primary UX
];

export default function CheckoutPage() {
    const router = useRouter();
    const { id } = useCase();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        // Verify case exists locally
        const registry = readCaseRegistry();
        const exists = registry.some(c => c.id === id);
        if (!exists) setNotFound(true);
    }, [id]);

    function handleSelect(tierId: string) {
        localStorage.setItem(`re_case_tier_${id}`, tierId);
        addCaseEvent(id, { type: "TIER_SELECTED", at: new Date().toISOString(), meta: { tier: tierId } });
        router.push(`/app/case/${id}/deliver`);
    }

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
                    { label: `Case ${id.slice(0, 8)}`, href: `/app/case/${id}` },
                    { label: "Checkout" },
                ]}
            />
            <SectionHeader
                title="Checkout"
                subtitle="Select service tier for this case"
            />

            <CaseIdentifiers caseId={id} />

            <div className="flex flex-col lg:flex-row lg:gap-8">
                <div className="flex-1 min-w-0">
                    <PageSection>
                        <div className="grid gap-4 md:grid-cols-2">
                            {tiers.map((tier) => (
                                <div
                                    key={tier.id}
                                    className="rounded-xl border border-zinc-200 p-4"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <h2 className="text-base font-semibold text-zinc-900">
                                                {tier.name}
                                            </h2>
                                            <p className="mt-1 text-sm text-zinc-500">
                                                {tier.meta}
                                            </p>
                                        </div>
                                        <p className="text-lg font-semibold text-zinc-900">
                                            {tier.price}
                                        </p>
                                    </div>

                                    <ul className="mt-4 space-y-2 text-sm text-zinc-600">
                                        {tier.bullets.map((bullet) => (
                                            <li key={bullet} className="flex gap-2">
                                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400" />
                                                <span>{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => handleSelect(tier.id)}
                                        className="mt-4 w-full rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium hover:bg-zinc-50"
                                    >
                                        Select
                                    </button>
                                </div>
                            ))}
                        </div>
                    </PageSection>
                </div>

                {/* Guidance Dock - desktop only, sticky */}
                <aside className="hidden lg:block w-64 flex-shrink-0">
                    <div className="sticky top-6">
                        <GuidanceDock
                            whatThisPageDoes={[
                                "Records the selected service tier for this case",
                                "Unlocks capabilities for deliverables and actions",
                            ]}
                            whatToPrepare={[
                                "Service choice preference",
                            ]}
                        />
                    </div>
                </aside>
            </div>

            {/* Mobile dock */}
            <div className="lg:hidden">
                <GuidanceDock
                    whatThisPageDoes={[
                        "Records the selected service tier for this case",
                        "Unlocks capabilities for deliverables and actions",
                    ]}
                    whatToPrepare={[
                        "Service choice preference",
                    ]}
                />
            </div>
        </main>
    );
}
