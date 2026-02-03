import Section from "@/components/Section";
import { Shield, Scale, Route, Lock } from "lucide-react";

const items = [
    {
        icon: Scale,
        title: "Legislation-aligned routing",
        body: "Structured decision paths aligned with UK requirements and adjudicator-style guidance—without overclaiming outcomes.",
    },
    {
        icon: Route,
        title: "Procedural clarity",
        body: "Clear next steps and escalation routes, designed to reduce guesswork under time pressure.",
    },
    {
        icon: Lock,
        title: "Privacy-forward handling",
        body: "Documents are treated as sensitive. Keep copy conservative; the product aims to be trustworthy by design.",
    },
    {
        icon: Shield,
        title: "Transparent boundaries",
        body: "Strict service tiers. No subscriptions required. Annual Access is optional and does not include Premium.",
    },
];

export default function Trust() {
    return (
        <Section className="py-14">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                Trust & credibility
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                Designed to be calm, procedural, and honest about what the service does
                (and does not) do.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
                {items.map((i) => (
                    <div
                        key={i.title}
                        className="rounded-2xl border border-slate-200 bg-white p-6"
                    >
                        <i.icon className="h-5 w-5 text-slate-700" />
                        <h3 className="mt-4 text-base font-semibold text-slate-900">
                            {i.title}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            {i.body}
                        </p>
                    </div>
                ))}
            </div>
        </Section>
    );
}
