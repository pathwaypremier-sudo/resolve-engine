"use client";

import { useState } from "react";
import { ChevronDown, FileText } from "lucide-react";
import Reveal from "@/components/motion/Reveal";
import { getResponseFormats, RESPONSE_FORMAT_DISCLAIMER, type ResponseFormat } from "@/lib/issuer/responseFormats";
import { makeId } from "@/lib/ui/ids";

interface ResponseFormatPanelProps {
    caseId: string;
}

export default function ResponseFormatPanel({ caseId }: ResponseFormatPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const formats = getResponseFormats();

    const contentId = makeId(caseId, "response-format-content");

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
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-zinc-900">Response formats (reference only)</h3>
                            <p className="text-xs text-zinc-500">Helps you record what you received. Does not provide advice.</p>
                        </div>
                    </div>
                    <ChevronDown
                        className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                </button>

                {isOpen && (
                    <div id={contentId} className="border-t border-zinc-100 p-4 space-y-4">
                        {/* Response Format Cards */}
                        <div className="grid gap-4 md:grid-cols-2">
                            {formats.map((format) => (
                                <ResponseFormatCard key={format.key} format={format} />
                            ))}
                        </div>

                        {/* Footer Disclaimer */}
                        <div className="pt-2 border-t border-zinc-100">
                            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                                {RESPONSE_FORMAT_DISCLAIMER}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Reveal>
    );
}

function ResponseFormatCard({ format }: { format: ResponseFormat }) {
    return (
        <div className="p-3 border border-zinc-100 rounded-lg bg-zinc-50/50 space-y-2">
            <h4 className="text-sm font-medium text-zinc-800">{format.title}</h4>

            {/* What it usually includes */}
            <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">What it usually includes</p>
                <ul className="text-xs text-zinc-600 list-disc list-inside space-y-0.5">
                    {format.what_it_usually_includes.map((item, i) => (
                        <li key={i}>{item}</li>
                    ))}
                </ul>
            </div>

            {/* Phrases you might see */}
            <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Phrases you might see</p>
                <div className="text-xs text-zinc-400 italic">
                    {format.phrases_you_might_see.slice(0, 2).map((phrase, i) => (
                        <span key={i}>
                            "{phrase}"{i < 1 && format.phrases_you_might_see.length > 1 ? ", " : ""}
                        </span>
                    ))}
                    {format.phrases_you_might_see.length > 2 && <span>...</span>}
                </div>
            </div>

            {/* Record these fields */}
            <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Record these fields</p>
                <ul className="text-xs text-zinc-600 list-disc list-inside space-y-0.5">
                    {format.record_these_fields.map((field, i) => (
                        <li key={i}>{field}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
