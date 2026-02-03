"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    title: string;
    body: string;
    primaryAction?: {
        label: string;
        href: string;
    };
    icon?: LucideIcon;
}

import { tokens } from "@/components/ui/tokens";

export default function EmptyState({
    title,
    body,
    primaryAction,
    icon: Icon,
}: EmptyStateProps) {
    return (
        <div className="flex min-h-[16rem] flex-col items-center justify-center rounded-xl border border-border bg-muted/50 p-8 text-center">
            {Icon && (
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-background border border-border shadow-sm">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
            )}
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                {body}
            </p>
            {primaryAction && (
                <div className="mt-6">
                    <Link
                        href={primaryAction.href}
                        className="inline-flex items-center justify-center rounded-lg bg-background px-3.5 py-2 text-sm font-medium text-foreground border border-border shadow-sm hover:bg-muted transition-colors"
                    >
                        {primaryAction.label}
                    </Link>
                </div>
            )}
        </div>
    );
}
