"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, ChevronDown } from "lucide-react";
import Link from "next/link";

interface PremiumBoundaryPanelProps {
    caseId: string;
    contextLabel?: string;
    onUpgradeHref?: string;
    /** If true, user already has Premium capability - panel will not render */
    hasPremiumCapability?: boolean;
}

export default function PremiumBoundaryPanel({
    caseId,
    contextLabel = "Court / enforcement action",
    onUpgradeHref,
    hasPremiumCapability = false,
}: PremiumBoundaryPanelProps) {
    const [isOpen, setIsOpen] = useState(true);
    const [issuer, setIssuer] = useState<string | null>(null);
    const [reference, setReference] = useState<string | null>(null);

    const upgradeHref = onUpgradeHref ?? `/app/case/${caseId}/checkout`;

    useEffect(() => {
        const storedIssuer = localStorage.getItem(`re_case_${caseId}_issuer`);
        const storedRef = localStorage.getItem(`re_case_${caseId}_reference`);
        setIssuer(storedIssuer || null);
        setReference(storedRef || null);
    }, [caseId]);

    // Don't render if user already has Premium capability
    if (hasPremiumCapability) {
        return null;
    }

    return (
        <motion.section
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-20px" }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden"
        >
            {/* Header */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <div>
                        <p className="text-sm font-medium text-amber-900">
                            Premium boundary
                        </p>
                        <p className="text-xs text-amber-700">
                            {contextLabel} requires Premium
                        </p>
                    </div>
                </div>
                <ChevronDown
                    className={[
                        "h-4 w-4 text-amber-600 transition-transform duration-200",
                        isOpen ? "rotate-180" : "",
                    ].join(" ")}
                />
            </button>

            {/* Collapsible content */}
            {isOpen && (
                <div className="border-t border-amber-200 p-4 space-y-4">
                    {/* Case identifiers */}
                    {(issuer || reference) && (
                        <div className="rounded-lg bg-white/60 p-3 text-sm space-y-1">
                            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">
                                Your reference identifiers
                            </p>
                            <p className="text-amber-900">
                                Case ID: <span className="font-mono">{caseId.slice(0, 8)}</span>
                            </p>
                            {issuer && (
                                <p className="text-amber-900">
                                    Issuer: <span className="font-medium">{issuer}</span>
                                </p>
                            )}
                            {reference && (
                                <p className="text-amber-900">
                                    Reference: <span className="font-mono">{reference}</span>
                                </p>
                            )}
                        </div>
                    )}

                    {/* What you can do now */}
                    <div>
                        <p className="text-xs text-amber-700 uppercase tracking-wide font-medium mb-2">
                            What to do with your current tier
                        </p>
                        <ul className="space-y-1 text-sm text-amber-900">
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                Keep everything in writing and keep copies.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                Use your reference identifiers in every message.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                Maintain a dated timeline of events.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                Request a written response within 7 days.
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                If there is a final position, that can be used for escalation routes.
                            </li>
                        </ul>
                    </div>

                    {/* Premium covers */}
                    <div className="border-t border-amber-200 pt-3">
                        <p className="text-xs text-amber-700 uppercase tracking-wide font-medium mb-2">
                            Premium covers
                        </p>
                        <ul className="space-y-1 text-sm text-amber-900">
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                Court claims response handling
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                Bailiff / enforcement escalation
                            </li>
                            <li className="flex gap-2">
                                <span className="text-amber-500">•</span>
                                CCJ risk mitigation
                            </li>
                        </ul>
                        <p className="mt-2 text-xs text-amber-600">
                            Human review is prioritised for premium cases.
                        </p>
                    </div>

                    {/* Upgrade CTA */}
                    <Link
                        href={upgradeHref}
                        className="inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
                    >
                        Upgrade to continue
                    </Link>
                </div>
            )}
        </motion.section>
    );
}
