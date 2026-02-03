"use client";

import { ReactNode } from "react";

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    rightSlot?: ReactNode;
}

export default function SectionHeader({ title, subtitle, rightSlot }: SectionHeaderProps) {
    return (
        <header className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-100">
            <div>
                <h1 className="text-lg font-semibold text-zinc-900 tracking-tight">{title}</h1>
                {subtitle && (
                    <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
                )}
            </div>
            {rightSlot && <div className="flex-shrink-0">{rightSlot}</div>}
        </header>
    );
}
