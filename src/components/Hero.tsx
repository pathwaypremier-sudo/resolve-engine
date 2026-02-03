import Section from "@/components/Section";
import { ArrowRight } from "lucide-react";

export default function Hero() {
    return (
        <Section className="pt-20 pb-14">
            <div className="grid gap-10 md:grid-cols-12 md:items-center">
                <div className="md:col-span-7">
                    <p className="text-sm font-medium tracking-wide text-slate-600">
                        Resolve Engine
                    </p>

                    <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
                        Resolve disputes the correct way.
                    </h1>

                    <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
                        A structured UK resolution engine for consumer disputes—starting with
                        council PCNs and private parking charges.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <a
                            href="/signin"
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        >
                            Check Your Parking Ticket <ArrowRight className="h-4 w-4" />
                        </a>

                        <p className="text-sm text-slate-500">
                            Rules-based, legislation-aligned, and designed for procedural
                            correctness—without promises or guarantees.
                        </p>
                    </div>
                </div>

                <div className="md:col-span-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                        <p className="text-sm font-medium text-slate-900">
                            What you can do in minutes
                        </p>
                        <ul className="mt-4 space-y-3 text-sm text-slate-600">
                            <li className="flex gap-3">
                                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                                Upload your notice, ticket, or letter
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                                We extract key fields to pre-fill the form where possible
                            </li>
                            <li className="flex gap-3">
                                <span className="mt-1 h-2 w-2 rounded-full bg-slate-400" />
                                You review and edit everything before proceeding
                            </li>
                        </ul>

                        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                                Primary entry point
                            </p>
                            <p className="mt-2 text-sm text-slate-700">
                                “Check Your Parking Ticket” is the fastest route to a free
                                assessment and the correct next step.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </Section>
    );
}
