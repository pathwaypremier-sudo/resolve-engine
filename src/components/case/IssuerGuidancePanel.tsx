"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Building2 } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { getIssuerFacts, type IssuerFacts } from "@/lib/issuer/issuerFacts";
import { makeId } from "@/lib/ui/ids";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";

interface IssuerGuidancePanelProps {
    caseId: string;
}

export default function IssuerGuidancePanel({ caseId }: IssuerGuidancePanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [issuerName, setIssuerName] = useState<string>("");
    const [facts, setFacts] = useState<IssuerFacts | null>(null);

    const contentId = makeId(caseId, "issuer-guidance-content");

    useEffect(() => {
        if (typeof window === "undefined") return;
        const name = localStorage.getItem(`re_case_${caseId}_issuer`) || "";
        setIssuerName(name);
        setFacts(getIssuerFacts(name));
    }, [caseId]);

    // ... inside function ...

    if (!facts) {
        return (
            <Reveal>
                <div className="border border-zinc-200 rounded-xl bg-zinc-50/50 p-6 text-center">
                    <p className="text-sm font-medium text-zinc-900">Issuer guidance unavailable</p>
                    <p className="mt-1 text-xs text-zinc-500">
                        We could not identify the issuer from your intake inputs.
                    </p>
                    <Link
                        href={`/intake?case=${caseId}`}
                        className="mt-3 inline-flex text-xs font-medium text-zinc-900 underline hover:text-zinc-700"
                    >
                        Edit intake
                    </Link>
                </div>
            </Reveal>
        );
    }

    return (
        <Reveal>
            <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-zinc-50 transition-colors"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-zinc-100 rounded-lg text-zinc-600">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900">Issuer information (reference only)</h3>
                            <p className="text-xs text-zinc-500">General information based on common practice. Always refer to your notice.</p>
                        </div>
                    </div>
                    <ChevronDown
                        className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                </button>

                {isOpen && (
                    <div id={contentId} className="border-t border-zinc-100 p-4 space-y-4">
                        {/* A) Issuer Name */}
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Issuer</p>
                            <p className="text-sm font-medium text-zinc-900">{facts.issuer_name}</p>
                            {issuerName && facts.issuer_name === "Unknown Issuer" && (
                                <p className="text-xs text-zinc-400 mt-0.5">Recorded as: {issuerName}</p>
                            )}
                        </div>

                        {/* B) Common Notice Types */}
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Common notice types</p>
                            <ul className="text-sm text-zinc-700 list-disc list-inside">
                                {facts.notice_types.map((type, i) => (
                                    <li key={i}>{type}</li>
                                ))}
                            </ul>
                        </div>

                        {/* C) Typical Submission Methods */}
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Typical submission methods</p>
                            <ul className="text-sm text-zinc-700 list-disc list-inside">
                                {facts.common_submission_methods.map((method, i) => (
                                    <li key={i}>{method}</li>
                                ))}
                            </ul>
                        </div>

                        {/* D) Documents Often Referenced */}
                        <div>
                            <p className="text-xs text-zinc-500 mb-1">Documents often referenced</p>
                            <ul className="text-sm text-zinc-700 list-disc list-inside">
                                {facts.typical_documents_referenced.map((doc, i) => (
                                    <li key={i}>{doc}</li>
                                ))}
                            </ul>
                        </div>

                        {/* E) Notes */}
                        {facts.notes.length > 0 && (
                            <div>
                                <p className="text-xs text-zinc-500 mb-1">Notes</p>
                                <ul className="text-xs text-zinc-500 list-disc list-inside space-y-0.5">
                                    {facts.notes.map((note, i) => (
                                        <li key={i}>{note}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Footer Disclaimer */}
                        <div className="pt-2 border-t border-zinc-100">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                                Reference only. This does not replace the information on your notice.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Reveal>
    );
}
