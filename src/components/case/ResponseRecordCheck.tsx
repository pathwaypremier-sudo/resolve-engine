"use client";

import Reveal from "@/components/motion/Reveal";
import Panel from "@/components/ui/Panel";

/**
 * Response Record Check - Display-only quality gate.
 * Visual checklist only. No state. No validation. No blocking.
 */
export default function ResponseRecordCheck() {
    return (
        <Reveal>
            <Panel variant="subtle" className="space-y-3">
                <div>
                    <h4 className="text-sm font-medium text-zinc-800">Response record check (reference only)</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Help ensure your record is complete</p>
                </div>

                {/* Response format */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-700">Have you identified the response format?</p>
                    <ul className="text-xs text-zinc-500 list-disc list-inside ml-1 space-y-0.5">
                        <li>Acknowledgement</li>
                        <li>Request for further information</li>
                        <li>Rejection / refusal</li>
                        <li>Acceptance / cancellation</li>
                        <li>Escalation or next-stage notice</li>
                    </ul>
                </div>

                {/* How received */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-700">Have you noted how the response was received?</p>
                    <ul className="text-xs text-zinc-500 list-disc list-inside ml-1 space-y-0.5">
                        <li>Letter</li>
                        <li>Email</li>
                        <li>Portal message</li>
                        <li>Other / not sure</li>
                    </ul>
                </div>

                {/* Identifiers */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-zinc-700">Have you checked identifiers present in the response?</p>
                    <ul className="text-xs text-zinc-500 list-disc list-inside ml-1 space-y-0.5">
                        <li>Case reference / notice number</li>
                        <li>Vehicle registration (if applicable)</li>
                        <li>Date on the notice</li>
                    </ul>
                </div>

                {/* Disclaimer */}
                <div className="pt-2 border-t border-zinc-100">
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wide">
                        Reference only. Always rely on the wording in the notice or letter you received.
                    </p>
                </div>
            </Panel>
        </Reveal>
    );
}
