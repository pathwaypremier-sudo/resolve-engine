"use client";

import { useState, useMemo, useEffect } from "react";
import { useCase } from "../../../_context/CaseContext"; // Adjusted path based on depth
import { buildQuestions, type Ctx, type Question, type DisputeType, QUESTION_SET_VERSION } from "@/lib/assessment/questions";
import Panel, { PanelHeader, PanelBody } from "@/components/ui/Panel";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";

// Types for simulation state
type SimState = {
    disputeType: DisputeType | "NOT_SURE" | "";
    evidenceStatus: "PROVIDED" | "NONE_DECLARED" | "UNKNOWN";
    facts: {
        issuer: boolean;
        dates: boolean;
        reference: boolean;
        response_received: boolean;
        vrn: boolean;
        pcn: boolean;
        amount: boolean;
    };
};

export default function QuestionnaireAuditPage() {
    const { id: caseId } = useCase();

    // Test trigger for Error Boundary
    if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        if (params.get("throw") === "1") {
            throw new Error("This is a deliberate test error to verify the Global Error Boundary UI.");
        }
    }

    // Live Data State
    const [liveData, setLiveData] = useState<Ctx | null>(null);
    const [liveEvidenceStatus, setLiveEvidenceStatus] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Simulation State
    const [mode, setMode] = useState<"LIVE" | "SIM">("LIVE");
    const [sim, setSim] = useState<SimState>({
        disputeType: "",
        evidenceStatus: "UNKNOWN",
        facts: {
            issuer: true,
            dates: true,
            reference: true,
            response_received: false,
            vrn: true,
            pcn: true,
            amount: true,
        }
    });

    // 1. Load Live Data
    useEffect(() => {
        if (!caseId) return;

        // Load basic keys that questions depend on
        // In a real app we might fetch all known keys, but here we can just pull a large set or rely on what buildQuestions needs.
        // Actually, to display "Current Answer", we need to load EVERYTHING.
        const allKeys: Record<string, string> = {};

        // Scan localStorage for this case (audit only, so scan is okay)
        const prefix = `re_case_${caseId}_`;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) {
                allKeys[k.replace(prefix, "")] = localStorage.getItem(k) || "";
            }
        }

        const dt = localStorage.getItem(`re_case_${caseId}_dispute_type`);
        const es = localStorage.getItem(`re_case_${caseId}_evidence_status`);

        setLiveData({
            disputeType: dt || undefined,
            evidenceStatus: es || undefined,
            answers: allKeys
        });
        setLiveEvidenceStatus(es);

    }, [caseId, lastRefresh]);

    // 2. Derive Context (Live or Sim)
    const ctx: Ctx = useMemo(() => {
        if (mode === "LIVE") {
            return liveData || { answers: {} };
        }

        // Build Sim Context
        // We need to simulate answers based on the "facts" toggles
        const simAnswers: Record<string, string> = {};

        if (sim.facts.issuer) simAnswers["issuer"] = "SIMULATED_ISSUER";
        if (sim.facts.reference) simAnswers["reference"] = "SIM_REF_123";
        if (sim.facts.dates) {
            simAnswers["notice_date"] = "2025-01-01";
            simAnswers["event_date"] = "2025-01-01";
        }
        if (sim.facts.response_received) {
            simAnswers["contact_status"] = "YES_WRITING";
            simAnswers["response_received"] = "YES";
        }
        // These don't trigger questions directly in current set but requested for "Overlay" completeness
        if (sim.facts.vrn) simAnswers["vrn"] = "AB12CDE";
        if (sim.facts.pcn) simAnswers["pcn"] = "PCN123456";
        if (sim.facts.amount) simAnswers["amount"] = "50.00";

        return {
            disputeType: sim.disputeType === "" ? undefined : sim.disputeType,
            evidenceStatus: sim.evidenceStatus === "UNKNOWN" ? undefined : sim.evidenceStatus,
            answers: simAnswers
        };
    }, [mode, liveData, sim]);

    // 3. Build Questions
    const questions = useMemo(() => buildQuestions(ctx), [ctx]);

    // 4. Render Trigger Logic
    return (
        <main className="space-y-6 pb-20">
            <Breadcrumbs
                items={[
                    { label: "Dashboard", href: "/app" },
                    { label: `Case ${caseId?.slice(0, 8)}`, href: `/app/case/${caseId}` },
                    { label: "Assessment", href: `/app/case/${caseId}/assessment` },
                    { label: "Audit" },
                ]}
            />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900">Questionnaire Audit</h1>
                    <p className="text-zinc-500">Diagnostic view for trigger evaluation and state.</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                    <p>Bank Version: {QUESTION_SET_VERSION}</p>
                    <p>Case ID: {caseId}</p>
                </div>
            </div>

            {/* Controls */}
            <Panel>
                <PanelHeader title="Evaluation Context" />
                <PanelBody>
                    <div className="flex flex-wrap gap-8">
                        {/* Mode Switch */}
                        <div className="space-y-3">
                            <span className="text-sm font-medium text-zinc-900">Source Mode</span>
                            <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg inline-flex">
                                <button
                                    onClick={() => setMode("LIVE")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${mode === "LIVE" ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-900"}`}
                                >
                                    Live Data
                                </button>
                                <button
                                    onClick={() => setMode("SIM")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${mode === "SIM" ? "bg-white shadow text-zinc-900" : "text-zinc-500 hover:text-zinc-900"}`}
                                >
                                    Simulation
                                </button>
                            </div>
                            {mode === "LIVE" && (
                                <button
                                    onClick={() => setLastRefresh(new Date())}
                                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800"
                                >
                                    <RefreshCw className="w-3 h-3" /> Refresh Storage
                                </button>
                            )}
                        </div>

                        {/* Sim Controls */}
                        {mode === "SIM" && (
                            <>
                                <div className="space-y-3">
                                    <span className="text-sm font-medium text-zinc-900">Dispute Type</span>
                                    <select
                                        className="block w-40 rounded-md border-zinc-200 text-sm"
                                        value={sim.disputeType}
                                        onChange={e => setSim(s => ({ ...s, disputeType: e.target.value as any }))}
                                    >
                                        <option value="">(Undefined)</option>
                                        <option value="NOT_SURE">Not Sure</option>
                                        <option value="COUNCIL_PCN">Council PCN</option>
                                        <option value="PRIVATE_PARKING">Private Parking</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <span className="text-sm font-medium text-zinc-900">Evidence Status</span>
                                    <select
                                        className="block w-40 rounded-md border-zinc-200 text-sm"
                                        value={sim.evidenceStatus}
                                        onChange={e => setSim(s => ({ ...s, evidenceStatus: e.target.value as any }))}
                                    >
                                        <option value="UNKNOWN">(Unknown)</option>
                                        <option value="NONE_DECLARED">None Declared</option>
                                        <option value="PROVIDED">Provided</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <span className="text-sm font-medium text-zinc-900">Facts Injected</span>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input type="checkbox" checked={sim.facts.issuer} onChange={e => setSim(s => ({ ...s, facts: { ...s.facts, issuer: e.target.checked } }))} />
                                            Issuer
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input type="checkbox" checked={sim.facts.dates} onChange={e => setSim(s => ({ ...s, facts: { ...s.facts, dates: e.target.checked } }))} />
                                            Dates
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input type="checkbox" checked={sim.facts.reference} onChange={e => setSim(s => ({ ...s, facts: { ...s.facts, reference: e.target.checked } }))} />
                                            Reference
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input type="checkbox" checked={sim.facts.response_received} onChange={e => setSim(s => ({ ...s, facts: { ...s.facts, response_received: e.target.checked } }))} />
                                            Response
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input type="checkbox" checked={sim.facts.vrn} onChange={e => setSim(s => ({ ...s, facts: { ...s.facts, vrn: e.target.checked } }))} />
                                            VRN
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input type="checkbox" checked={sim.facts.pcn} onChange={e => setSim(s => ({ ...s, facts: { ...s.facts, pcn: e.target.checked } }))} />
                                            PCN String
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-zinc-600">
                                            <input type="checkbox" checked={sim.facts.amount} onChange={e => setSim(s => ({ ...s, facts: { ...s.facts, amount: e.target.checked } }))} />
                                            Amount
                                        </label>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Live Context Readout */}
                        {mode === "LIVE" && liveData && (
                            <div className="space-y-1 text-sm text-zinc-600 border-l pl-6 border-zinc-200">
                                <p><span className="text-zinc-400">Type:</span> {liveData.disputeType || "(undefined)"}</p>
                                <p><span className="text-zinc-400">Evidence:</span> {liveEvidenceStatus || "(none declared)"}</p>
                                <p><span className="text-zinc-400">Answer Count:</span> {Object.keys(liveData.answers).length}</p>
                            </div>
                        )}
                    </div>
                </PanelBody>
            </Panel>

            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                            <th className="px-4 py-3 font-medium">Group</th>
                            <th className="px-4 py-3 font-medium w-1/3">Question</th>
                            <th className="px-4 py-3 font-medium">Trigger State</th>
                            <th className="px-4 py-3 font-medium">Current Value</th>
                            <th className="px-4 py-3 font-medium">Condition</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                        {questions.map(q => {
                            const isVisible = !q.when || q.when(ctx);
                            const val = ctx.answers[q.key];

                            return (
                                <tr key={q.id} className={isVisible ? "bg-white" : "bg-zinc-50/50"}>
                                    <td className="px-4 py-3 text-xs font-mono text-zinc-400">{q.group}</td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-zinc-900">{q.label}</div>
                                        <div className="text-xs text-zinc-400 font-mono mt-0.5">ID: {q.id} | Key: {q.key}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {isVisible ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-100">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-500 border border-zinc-200">
                                                <XCircle className="w-3 h-3" />
                                                Skipped
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {val ? (
                                            <code className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-xs">{val}</code>
                                        ) : (
                                            <span className="text-zinc-300 italic">--</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-zinc-500 max-w-xs break-words">
                                        {q.when ? (
                                            <span className="font-mono">{q.when.toString().slice(0, 50)}...</span>
                                        ) : (
                                            <span className="text-zinc-400 italic">Always</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

        </main>
    );
}
