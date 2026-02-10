
"use client";

import { useState } from "react";
import { Download, ChevronUp, ChevronDown, Copy, Import, AlertTriangle, FileCheck } from "lucide-react";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import { getNotebookLMPromptTemplate } from "@/lib/notebooklm/getNotebookLMPromptTemplate";
import type { AssessmentInput } from "@/lib/assessment/AssessmentInput";
import type { AssessmentResult } from "@/lib/assessment/AssessmentResult";
import type { NotebookLMOutput, EnforcementResult } from "@/lib/notebooklm-contract";

type Props = {
    input: AssessmentInput | null;
    result: AssessmentResult | null;
    isDownloading: boolean;
    onDownload: () => void;
};

export default function NotebookLMIntegrationPanel({ input, result, isDownloading, onDownload }: Props) {
    const [showPackInstructions, setShowPackInstructions] = useState(false);

    // Paste & Validation State
    const [pastedJson, setPastedJson] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState<EnforcementResult | null>(null);

    const copyPrompt = () => {
        navigator.clipboard.writeText(getNotebookLMPromptTemplate(input, result));
        alert("Prompt copied to clipboard!");
    };

    const handleValidate = async () => {
        if (!pastedJson.trim()) return;

        setIsValidating(true);
        setValidationResult(null);

        try {
            const response = await fetch("/api/notebooklm/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rawText: pastedJson }),
            });

            if (!response.ok) {
                throw new Error("Validation request failed");
            }

            const data: EnforcementResult = await response.json();
            setValidationResult(data);

        } catch (error) {
            console.error("Validation error", error);
            alert("Failed to validate output. Please try again.");
        } finally {
            setIsValidating(false);
        }
    };

    return (
        <Panel>
            <PanelHeader title="AI Assistant Pack & Draft Import" />
            <PanelBody>
                <div className="space-y-6">
                    {/* 1. Download & Prompt Section */}
                    <div className="space-y-4">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-zinc-600">
                                    Download a source pack to use with Google NotebookLM.
                                    Use this pack with Google NotebookLM to explore your evidence and generate drafts.
                                </p>
                                <p className="text-xs text-zinc-500 mt-2">
                                    Drafts are guidance. Outcomes depend on the authority’s process and evidence.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onDownload}
                            disabled={isDownloading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium transition-colors"
                        >
                            {isDownloading ? (
                                <>
                                    <span className="animate-spin">⏳</span> Generating...
                                </>
                            ) : (
                                <>
                                    <Download className="w-4 h-4" /> Download Source Pack
                                </>
                            )}
                        </button>

                        {/* Instructions (Collapsible) */}
                        <div className="border rounded-lg border-zinc-200 overflow-hidden bg-zinc-50">
                            <button
                                onClick={() => setShowPackInstructions(!showPackInstructions)}
                                className="w-full flex items-center justify-between p-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100"
                            >
                                <span>How to use in NotebookLM</span>
                                {showPackInstructions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {showPackInstructions && (
                                <div className="p-3 border-t border-zinc-200 space-y-3 bg-white">
                                    <ol className="list-decimal list-inside text-sm text-zinc-600 space-y-1">
                                        <li>Click "Download Source Pack" above.</li>
                                        <li>Unzip the file locally.</li>
                                        <li>Go to <a href="https://notebooklm.google.com" target="_blank" className="text-indigo-600 hover:underline">NotebookLM</a> and create a new notebook.</li>
                                        <li>Upload all the files from the pack as sources.</li>
                                        <li>Paste the prompt below into the chat box.</li>
                                    </ol>

                                    <div className="mt-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Recommended Prompt</span>
                                            <button onClick={copyPrompt} className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700">
                                                <Copy className="w-3 h-3" /> Copy
                                            </button>
                                        </div>
                                        <div className="p-2 bg-zinc-100 rounded text-xs font-mono text-zinc-700 whitespace-pre-wrap border border-zinc-200 max-h-40 overflow-y-auto">
                                            {getNotebookLMPromptTemplate(input, result)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="border-t border-zinc-200" />

                    {/* 2. Paste & Validate Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-zinc-900 mb-2">Validate Draft</h3>
                        <p className="text-sm text-zinc-600 mb-3">
                            Paste the JSON output from NotebookLM below. We will validate format and safety.
                        </p>

                        {!validationResult ? (
                            <div className="space-y-3">
                                <textarea
                                    className="w-full h-32 p-3 text-sm font-mono border border-zinc-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder='Paste JSON here (starts with "{") ...'
                                    value={pastedJson}
                                    onChange={(e) => setPastedJson(e.target.value)}
                                />
                                <button
                                    onClick={handleValidate}
                                    disabled={isValidating || !pastedJson.trim()}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 disabled:opacity-50 text-sm font-medium transition-colors"
                                    data-testid="validate-btn"
                                >
                                    {isValidating ? (
                                        <>
                                            <span className="animate-spin">⏳</span> Validating...
                                        </>
                                    ) : (
                                        <>
                                            <Import className="w-4 h-4" /> Validate & Import
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Validation Status Banner */}
                                {validationResult.safe_mode_used ? (
                                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-amber-900">Safety Fallback Active</h4>
                                            <p className="text-sm text-amber-800 mt-1">
                                                The draft content could not be fully validated (Reason: {validationResult.reason}).
                                                A standard fallback version is shown below.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                                        <FileCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-sm font-semibold text-emerald-900">Draft Validated</h4>
                                            <p className="text-sm text-emerald-800 mt-1">
                                                The content has been verified and is ready for use.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Rendered Content Preview */}
                                <div className="bg-white border border-zinc-200 rounded-lg overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 font-medium text-sm text-zinc-700">
                                        Draft Preview
                                    </div>
                                    <div className="p-4 space-y-4">
                                        {/* Using a simplified rendering for the 6 sections */}
                                        <DraftSection title="1. Summary" content={validationResult.output.section_1_summary} />
                                        <DraftSection title="2. Position" content={validationResult.output.section_2_position} />
                                        <DraftSection title="3. Reasoning" content={validationResult.output.section_3_reasoning} />
                                        <DraftSection title="4. Evidence Requests" content={validationResult.output.section_4_evidence_requests} />
                                        <DraftSection title="5. Next Steps" content={validationResult.output.section_5_next_steps} />
                                        <DraftSection title="6. Risks & Limits" content={validationResult.output.section_6_risks_and_limits} />
                                    </div>
                                    <div className="bg-zinc-50 px-4 py-3 border-t border-zinc-200 flex justify-between">
                                        <button
                                            onClick={() => {
                                                setPastedJson("");
                                                setValidationResult(null);
                                            }}
                                            className="text-sm text-zinc-600 hover:text-zinc-900"
                                        >
                                            Reset
                                        </button>
                                        {/* In a real app, 'Import' would persist this to state/DB. For now, it's a loop closer. */}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </PanelBody>
        </Panel>
    );
}

function DraftSection({ title, content }: { title: string, content: string }) {
    return (
        <div>
            <h5 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">{title}</h5>
            <div className="text-sm text-zinc-800 whitespace-pre-wrap">{content}</div>
        </div>
    );
}
