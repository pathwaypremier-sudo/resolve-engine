import Section from "@/components/Section";
import { FileUp, ScanText, PencilLine } from "lucide-react";

const steps = [
    {
        icon: FileUp,
        title: "Upload documents or enter details",
        body: "Add your ticket, notice, or correspondence. You can upload photos, PDFs, or screenshots.",
    },
    {
        icon: ScanText,
        title: "We extract key fields and assess the route",
        body: "Where possible, information is extracted to pre-fill the intake. The assessment follows rules-based routing aligned to UK requirements.",
    },
    {
        icon: PencilLine,
        title: "You review/edit, then choose how far we act",
        body: "You stay in control: review and edit extracted details before selecting Appeal Builder, Managed, Premium, or Annual Access.",
    },
];

export default function HowItWorks() {
    return (
        <Section className="py-14">
            <div className="md:flex md:items-end md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                        How it works
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                        A structured flow that prioritises accuracy, user control, and the
                        correct procedural next step.
                    </p>
                </div>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
                {steps.map((s) => (
                    <div
                        key={s.title}
                        className="rounded-2xl border border-slate-200 bg-white p-6"
                    >
                        <s.icon className="h-5 w-5 text-slate-700" />
                        <h3 className="mt-4 text-base font-semibold text-slate-900">
                            {s.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            {s.body}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}
