"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PageScaffold from "@/components/app/PageScaffold";
import GuidanceRail from "@/components/app/GuidanceRail";
import { upsertCaseRegistryItem } from "@/lib/case/registry";

export default function NewCasePage() {
    const router = useRouter();

    useEffect(() => {
        // TEMPORARY mock case ID
        const caseId = crypto.randomUUID();

        // Registry update
        upsertCaseRegistryItem({
            id: caseId,
            createdAt: new Date().toISOString(),
            lastActivityAt: new Date().toISOString(),
            disputeType: null,
            title: `Case ${caseId.slice(0, 8)}`,
        });

        // Redirect into the case-first system
        router.replace(`/app/case/${caseId}`);
    }, [router]);

    return (
        <PageScaffold
            title="New case"
            subtitle="Creating workspace"
            rightRail={
                <GuidanceRail
                    records={["Dispute type (or Not sure)", "Issuer/operator", "Initial identifiers"]}
                    derives={["Next required intake sections"]}
                />
            }
        >
            <div className="rounded-xl border border-zinc-200 bg-white p-5">
                <p className="text-sm text-zinc-500">
                    Creating your case…
                </p>
            </div>
        </PageScaffold>
    );
}
