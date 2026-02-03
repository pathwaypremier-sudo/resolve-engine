"use client";

import React from "react";
import { motion } from "framer-motion";
import { tokens } from "@/components/ui/tokens";

interface PageSectionProps {
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
}

export function PageSection({
    title,
    description,
    children,
    className,
}: PageSectionProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className={`${tokens.containerNarrow} space-y-4 ${className || ""}`}
        >
            {(title || description) && (
                <div className="border-b border-zinc-200 pb-2">
                    {title && (
                        <h2 className={tokens.textSectionTitle}>
                            {title}
                        </h2>
                    )}
                    {description && (
                        <p className={`mt-1 ${tokens.textMuted}`}>
                            {description}
                        </p>
                    )}
                </div>
            )}
            <div className="space-y-4">{children}</div>
        </motion.div>
    );
}
