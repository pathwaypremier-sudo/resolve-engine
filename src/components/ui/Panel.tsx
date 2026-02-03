"use client";

import { ReactNode } from "react";
import { tokens } from "@/components/ui/tokens";

interface PanelProps {
    children: ReactNode;
    variant?: "default" | "subtle" | "warning";
    className?: string;
    noPadding?: boolean;
}

export default function Panel({
    children,
    variant = "default",
    className = "",
    noPadding = false,
}: PanelProps) {
    const baseStyles = "rounded-xl border overflow-hidden";
    const variantStyles =
        variant === "subtle"
            ? "bg-zinc-50 border-zinc-200"
            : variant === "warning"
                ? "bg-amber-50 border-amber-200"
                : "bg-white border-zinc-200";

    const paddingStyles = noPadding ? "" : "p-4";

    return (
        <section className={`${baseStyles} ${variantStyles} ${paddingStyles} ${className}`}>
            {children}
        </section>
    );
}

interface PanelHeaderProps {
    title: string;
    subtitle?: string;
    className?: string;
    children?: ReactNode; // Right slot for actions
}

export function PanelHeader({ title, subtitle, className = "", children }: PanelHeaderProps) {
    return (
        <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
            <div>
                <h3 className={tokens.textSectionTitle}>{title}</h3>
                {subtitle && <p className={tokens.textLabel}>{subtitle}</p>}
            </div>
            {children && <div className="flex-shrink-0">{children}</div>}
        </div>
    );
}

interface PanelBodyProps {
    children: ReactNode;
    className?: string;
}

export function PanelBody({ children, className = "" }: PanelBodyProps) {
    return <div className={`space-y-4 ${className}`}>{children}</div>;
}
