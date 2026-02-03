import Link from "next/link";
import React from "react";
import { PublicShell } from "@/components/public/PublicShell";
import { tokens } from "@/components/ui/tokens";

interface AuthShellProps {
    title: string;
    subtitle: string;
    children: React.ReactNode;
    footerLink: {
        label: string;
        href: string;
        text: string;
    };
}

export function AuthShell({
    title,
    subtitle,
    children,
    footerLink,
}: AuthShellProps) {
    return (
        <PublicShell>
            <div className={tokens.containerAuth}>
                {/* Main Card */}
                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
                    <div className="mb-6">
                        <h1 className={tokens.textTitle}>
                            {title}
                        </h1>
                        <p className={`mt-1 ${tokens.textMuted}`}>{subtitle}</p>
                    </div>

                    {children}
                </div>

                {/* Footer */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <p className="text-sm text-zinc-600">
                        {footerLink.text}{" "}
                        <Link
                            href={footerLink.href}
                            className="rounded-sm font-medium text-zinc-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                        >
                            {footerLink.label}
                        </Link>
                    </p>
                </div>
            </div>
        </PublicShell>
    );
}
