"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FolderX } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageScaffold from "@/components/app/PageScaffold";
import NoActiveCaseState from "@/components/case/NoActiveCaseState";
import EmptyState from "@/components/ui/EmptyState";
import CheckoutPageContent from "@/app/app/case/[id]/checkout/page";
import { CaseProvider } from "@/app/app/case/_context/CaseContext";
import { readCaseRegistry } from "@/lib/case/registry";
import KeyedCaseBanner from "@/components/case/KeyedCaseBanner";

function CheckoutGateContent() {
    const searchParams = useSearchParams();
    const caseId = searchParams.get("case") || searchParams.get("caseId");
    const [exists, setExists] = useState(true);

    useEffect(() => {
        if (caseId) {
            const registry = readCaseRegistry();
            const found = registry.some((c) => c.id === caseId);
            setExists(found);
        }
    }, [caseId]);

    // 1. Missing context -> No Active Case
    if (!caseId) {
        return <NoActiveCaseState />;
    }

    // 2. Context provided but not found -> Empty State
    if (!exists) {
        return (
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
        );
    }

    // 3. Valid context -> Render Content
    return (
        <>
            <CaseProvider caseId={caseId}>
                <KeyedCaseBanner caseId={caseId} />
                <CheckoutPageContent />
            </CaseProvider>
        </>
    );
}

export default function CheckoutGatePage() {
    return (
        <AppShell>
            <PageScaffold title="Checkout">
                <Suspense fallback={<div className="h-32 flex items-center justify-center text-sm text-zinc-500">Loading checkout...</div>}>
                    <CheckoutGateContent />
                </Suspense>
            </PageScaffold>
        </AppShell>
    );
}

// Removing previous imports integrated above

