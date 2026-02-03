"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Check, Copy, Mail, Globe, FileText } from "lucide-react";
import Panel from "@/components/ui/Panel";
import Reveal from "@/components/motion/Reveal";
import { useEntitlement } from "@/app/app/case/_context/EntitlementContext";
import { addCaseEvent } from "@/app/app/case/_context/CaseEvents";
import { formatCaseIdShort } from "@/lib/case/formatCaseId";

interface SubmissionInstructionsPanelProps {
    caseId: string;
}

import { makeId } from "@/lib/ui/ids";

export default function SubmissionInstructionsPanel({
    caseId,
}: SubmissionInstructionsPanelProps) {
    const { capabilities } = useEntitlement();
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [reference, setReference] = useState<string | null>(null);
    const [caseEmail, setCaseEmail] = useState<string | null>(null);
    const [appealSubmitted, setAppealSubmitted] = useState(false);

    const contentId = makeId(caseId, "instructions-content");

    const canShow = capabilities.includes("SHOW_SUBMISSION_INSTRUCTIONS");
    const canSubmitOnBehalf = capabilities.includes("SUBMIT_ON_BEHALF");

    useEffect(() => {
        const ref = localStorage.getItem(`re_case_${caseId}_reference`);
        setReference(ref && ref !== "NOT_SURE" ? ref : null);

        const email = localStorage.getItem(`re_case_${caseId}_case_email`);
        setCaseEmail(email || null);

        // Check if APPEAL_SUBMITTED
        const eventsJson = localStorage.getItem(`re_case_${caseId}_events`);
        if (eventsJson) {
            try {
                const events = JSON.parse(eventsJson);
                if (events.some((e: { type: string }) => e.type === "APPEAL_SUBMITTED")) {
                    setAppealSubmitted(true);
                }
            } catch {
                // Ignore
            }
        }
    }, [caseId]);

    function handleMarkSubmitted() {
        addCaseEvent(caseId, {
            type: "APPEAL_SUBMITTED",
            at: new Date().toISOString(),
            meta: {},
        });
        setAppealSubmitted(true);
    }

    function handleCopyInstructions() {
        const lines = [
            "SUBMISSION CHECKLIST",
            "",
            "Before you send:",
            `- Case ID: ${formatCaseIdShort(caseId)}`,
            reference ? `- Issuer reference: ${reference}` : "- Issuer reference: (not set)",
            "- Confirm attachments match your evidence",
            "- Save a copy of the letter and uploads",
            "",
            "How to send:",
            "1. Email: Use a clear subject line with your reference. Attach letter + evidence. Request written reply.",
            "2. Online portal: Upload letter and evidence. Take screenshots / download confirmation.",
            "3. Post: Send copies, not originals. Keep proof of posting.",
            "",
            "After you send:",
            "- Record the submission date",
            "- Keep confirmation email/screenshot/receipt",
        ];
        navigator.clipboard.writeText(lines.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    if (!canShow) {
        return null;
    }

    return (
        <Reveal>
            <Panel variant="default" className="space-y-3">
                {/* Header - collapsible */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full flex items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                >
                    <div>
                        <p className="text-sm font-medium text-zinc-900">
                            Submission instructions
                        </p>
                        <p className="text-xs text-zinc-500">
                            Send the letter with identifiers and keep a written record.
                        </p>
                    </div>
                    <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""
                            }`}
                    />
                </button>

                {isOpen && (
                    <div id={contentId} className="space-y-4 pt-2 border-t border-zinc-100">
                        {/* A) Before you send */}
                        <section className="space-y-2">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                Before you send
                            </p>
                            <ul className="text-sm text-zinc-600 space-y-1">
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-zinc-400 mt-0.5" />
                                    <span>
                                        Confirm identifiers: Case ID{" "}
                                        <span className="font-mono text-zinc-900">
                                            {formatCaseIdShort(caseId)}
                                        </span>
                                        {reference && (
                                            <>
                                                , Ref{" "}
                                                <span className="font-mono text-zinc-900">
                                                    {reference}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-zinc-400 mt-0.5" />
                                    <span>Confirm attachments list matches your evidence</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Check className="h-4 w-4 text-zinc-400 mt-0.5" />
                                    <span>Save a copy of the final letter and all uploads</span>
                                </li>
                            </ul>
                        </section>

                        {/* B) How to send */}
                        <section className="space-y-2">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                How to send
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-start gap-2 text-sm text-zinc-600">
                                    <Mail className="h-4 w-4 text-zinc-400 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-zinc-700">
                                            Email (if issuer provides an address)
                                        </p>
                                        <ul className="text-xs text-zinc-500 mt-1 space-y-0.5">
                                            <li>Use a clear subject line including your reference</li>
                                            <li>Attach the letter + evidence</li>
                                            <li>Request a written reply</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-zinc-600">
                                    <Globe className="h-4 w-4 text-zinc-400 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-zinc-700">
                                            Online portal (if the issuer requires it)
                                        </p>
                                        <ul className="text-xs text-zinc-500 mt-1 space-y-0.5">
                                            <li>Upload the letter and evidence</li>
                                            <li>Take screenshots / download submission confirmation</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 text-sm text-zinc-600">
                                    <FileText className="h-4 w-4 text-zinc-400 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-zinc-700">Post (if required)</p>
                                        <ul className="text-xs text-zinc-500 mt-1 space-y-0.5">
                                            <li>Send copies, not originals</li>
                                            <li>Keep proof of posting where appropriate</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* C) What to include */}
                        <section className="space-y-2">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                What to include
                            </p>
                            <ul className="text-sm text-zinc-600 space-y-1">
                                <li>• The final letter</li>
                                <li>• Evidence documents</li>
                                <li>• Your identifiers (Case ID + issuer reference)</li>
                            </ul>
                        </section>

                        {/* D) After you send */}
                        <section className="space-y-2">
                            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                After you send
                            </p>
                            <ul className="text-sm text-zinc-600 space-y-1">
                                <li>• Record the submission date in the timeline</li>
                                <li>• Keep the confirmation email / screenshot / receipt</li>
                            </ul>
                        </section>

                        {/* E) Managed tier note (conditional) */}
                        {canSubmitOnBehalf && (
                            <section className="border-t border-zinc-100 pt-3 space-y-2">
                                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                                    Managed submission
                                </p>
                                <p className="text-sm text-zinc-600">
                                    Under Managed, Resolve Engine can submit and track responses
                                    using the dedicated case email.
                                </p>
                                {caseEmail && (
                                    <p className="text-sm">
                                        <span className="text-zinc-500">Case email:</span>{" "}
                                        <span className="font-mono text-zinc-900">{caseEmail}</span>
                                    </p>
                                )}
                                {!appealSubmitted ? (
                                    <button
                                        type="button"
                                        onClick={handleMarkSubmitted}
                                        className="mt-2 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                                    >
                                        Mark appeal submitted
                                    </button>
                                ) : (
                                    <p className="text-sm text-green-600 flex items-center gap-1">
                                        <Check className="h-4 w-4" />
                                        Appeal submitted
                                    </p>
                                )}
                            </section>
                        )}

                        {/* Copy instructions button */}
                        <div className="border-t border-zinc-100 pt-3">
                            <button
                                type="button"
                                onClick={handleCopyInstructions}
                                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 rounded"
                                aria-label={copied ? "Copied instructions to clipboard" : "Copy instructions to clipboard"}
                            >
                                {copied ? (
                                    <>
                                        <Check className="h-3 w-3 text-green-500" />
                                        <span>Copied</span>
                                        <span className="sr-only" aria-live="polite">Copied successfully</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-3 w-3" />
                                        <span>Copy instructions</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </Panel>
        </Reveal>
    );
}
