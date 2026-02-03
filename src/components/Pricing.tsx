import Section from "@/components/Section";
import { Check } from "lucide-react";

type Tier = {
    name: string;
    price: string;
    meta: string;
    emphasis?: boolean;
    bullets: string[];
    cta: string;
};

const tiers: Tier[] = [
    {
        name: "Appeal Builder",
        price: "£1.99",
        meta: "One-time",
        bullets: [
            "Completed appeal letter",
            "Submission instructions",
            "Deliverable-only (no follow-up)",
            "No coaching, hypotheticals, or strategy",
        ],
        cta: "Choose Appeal Builder",
    },
    {
        name: "Managed",
        price: "£9.99",
        meta: "Per case",
        emphasis: true,
        bullets: [
            "We submit the appeal",
            "Track responses",
            "Handle rejections",
            "Dedicated email per case",
            "Stops before court or bailiffs",
        ],
        cta: "Choose Managed",
    },
    {
        name: "Premium",
        price: "£99",
        meta: "Per case",
        bullets: [
            "Court claims, bailiffs, CCJs",
            "Edge cases and strategic handling",
            "Priority human-in-the-loop",
            "For escalation scenarios",
        ],
        cta: "Choose Premium",
    },
    {
        name: "Annual Access",
        price: "£99/year",
        meta: "Optional",
        bullets: [
            "Unlimited Appeal Builder",
            "Unlimited Managed",
            "Annual only (no monthly plan)",
            "Does not include Premium",
        ],
        cta: "Choose Annual Access",
    },
];

export default function Pricing() {
    return (
        <Section className="py-14" id="intake">
            <div className="md:flex md:items-end md:justify-between">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
                        Choose how far you want us to act
                    </h2>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
                        Clear pricing with strict service boundaries. Pay per use by default.
                        Annual Access is optional.
                    </p>
                </div>
            </div>

            <div className="mt-10 grid gap-4 lg:grid-cols-4">
                {tiers.map((t) => (
                    <div
                        key={t.name}
                        className={[
                            "rounded-2xl border p-6",
                            t.emphasis
                                ? "border-slate-300 bg-slate-50"
                                : "border-slate-200 bg-white",
                        ].join(" ")}
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900">
                                    {t.name}
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">{t.meta}</p>
                            </div>
                            <p className="text-xl font-semibold tracking-tight text-slate-900">
                                {t.price}
                            </p>
                        </div>

                        <ul className="mt-6 space-y-3 text-sm text-slate-600">
                            {t.bullets.map((b) => (
                                <li key={b} className="flex gap-2">
                                    <Check className="mt-0.5 h-4 w-4 text-slate-700" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>

                        <a
                            href="/signin"
                            className={[
                                "mt-6 inline-block w-full rounded-xl px-4 py-3 text-center text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-400",
                                t.emphasis
                                    ? "bg-slate-900 text-white hover:bg-slate-800"
                                    : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
                            ].join(" ")}
                        >
                            {t.cta}
                        </a>


                        <p className="mt-4 text-xs leading-relaxed text-slate-500">
                            If your situation exceeds this tier’s scope, you’ll be prompted to
                            upgrade to the appropriate service.
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
                <p className="text-sm font-medium text-slate-900">Important boundaries</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Appeal Builder is deliverable-only. Managed stops before court or
                    bailiffs. Premium is for court claims, bailiffs, CCJs, and complex
                    escalation.
                </p>
            </div>
        </Section>
    );
}
