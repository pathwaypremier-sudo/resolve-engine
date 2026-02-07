"use client";

import { useRouter } from "next/navigation";
import { useCase } from "../../_context/CaseContext";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SectionHeader from "@/components/ui/SectionHeader";
import CaseIdentifiers from "@/components/case/CaseIdentifiers";

import { useEffect, useState } from "react";
import {
    readDisputeType,
    writeDisputeType,
    clearDisputeType,
    type DisputeType,
} from "@/lib/case/disputeType";

export default function IntakePage() {
    const router = useRouter();
    const { id: caseId } = useCase();
    const [selected, setSelected] = useState<DisputeType | null>(null);

    useEffect(() => {
        setSelected(readDisputeType(caseId));
    }, [caseId]);

    const handleSelect = (type: DisputeType) => {
        writeDisputeType(caseId, type);
        // Go to docs page first (evidence upload with smart extraction)
        router.push(`/app/case/${caseId}/intake/docs`);
    };

    const handleNotSure = () => {
        clearDisputeType(caseId);
        // Go to docs page first even for "not sure" - evidence may help identify type
        router.push(`/app/case/${caseId}/intake/docs`);
    };

    return (
        <main className="space-y-6">
            <Breadcrumbs
                items={[
                    { label: "Dashboard", href: "/app" },
                    { label: `Case ${caseId.slice(0, 8)}`, href: `/app/case/${caseId}` },
                    { label: "Intake" },
                ]}
            />
            <SectionHeader
                title="Intake"
                subtitle="One step at a time"
            />

            <CaseIdentifiers caseId={caseId} />

            <div className="grid gap-4">
                <Card
                    title="Council PCN"
                    description="Penalty Charge Notice from a council."
                    selected={selected === "COUNCIL_PCN"}
                    onClick={() => handleSelect("COUNCIL_PCN")}
                />

                <Card
                    title="Private Parking Charge"
                    description="Parking charge from a private operator."
                    selected={selected === "PRIVATE_PARKING"}
                    onClick={() => handleSelect("PRIVATE_PARKING")}
                />

                <button
                    onClick={handleNotSure}
                    className="mt-2 text-sm text-zinc-500 hover:text-zinc-700 underline underline-offset-2"
                >
                    I'm not sure
                </button>
            </div>

            {selected && (
                <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                    Changing dispute type may change questions and checklists. Existing answers remain saved.
                </p>
            )}

            <p className="text-xs text-zinc-500">
                You can edit this later. "Not sure" support will be added next.
            </p>
        </main>
    );
}

function Card({
    title,
    description,
    selected,
    onClick,
}: {
    title: string;
    description: string;
    selected?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full rounded-xl border p-4 text-left transition-colors ${selected
                ? "border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900"
                : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
        >
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm text-zinc-600">{description}</p>
        </button>
    );
}
