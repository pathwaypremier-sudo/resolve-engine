import React from "react";
import { tokens } from "@/components/ui/tokens";

interface KeyValueRowProps {
    label: string;
    value: React.ReactNode;
    className?: string;
}

export function KeyValueRow({ label, value, className = "" }: KeyValueRowProps) {
    return (
        <div className={`flex items-start justify-between gap-4 ${className}`}>
            <dt className={tokens.textLabel}>{label}</dt>
            <dd className="text-sm leading-6 text-zinc-900 text-right">{value}</dd>
        </div>
    );
}

interface KeyValueListProps {
    children: React.ReactNode;
    className?: string;
}

export function KeyValueList({ children, className = "" }: KeyValueListProps) {
    return <dl className={`space-y-2 ${className}`}>{children}</dl>;
}
