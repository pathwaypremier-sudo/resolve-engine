import Section from "@/components/Section";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
    return (
        <Section className="py-14">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 md:flex md:items-center md:justify-between md:gap-8">
                <div>
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                        Start with a free assessment
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                        Start with “Check Your Parking Ticket”. You’ll see the correct route
                        before paying.
                    </p>
                </div>

                <div className="mt-6 flex flex-col items-center md:mt-0 md:items-end">
                    <a
                        href="/signin"
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                        Check Your Parking Ticket <ArrowRight className="h-4 w-4" />
                    </a>
                    <p className="mt-2 text-xs text-slate-500">
                        You’ll be asked a few structured questions. No payment is required to
                        start.
                    </p>
                </div>
            </div>
        </Section>
    );
}

