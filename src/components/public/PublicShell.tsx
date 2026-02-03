import Link from "next/link";
import React from "react";
import { tokens } from "@/components/ui/tokens";

interface PublicShellProps {
    children: React.ReactNode;
}

export function PublicShell({ children }: PublicShellProps) {
    return (
        <div className="flex min-h-screen flex-col bg-zinc-50">
            {/* Top bar */}
            <header className="flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-4">
                    <Link href="/" className="text-sm font-medium text-zinc-900">
                        Resolve Engine
                    </Link>
                </div>
                <nav className="flex items-center gap-4 text-sm">
                    <Link
                        href="/legal"
                        className="rounded-md px-2 py-1 text-zinc-500 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    >
                        Legal
                    </Link>
                    <Link
                        href="/signin"
                        className="rounded-md px-2 py-1 font-medium text-zinc-900 transition-colors hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
                    >
                        Sign in
                    </Link>
                </nav>
            </header>

            {/* Main Content */}
            <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
                <div className={tokens.container}>
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-zinc-200 bg-white py-4 text-center">
                <p className="text-xs text-zinc-400">
                    Cases and exports in this build are stored on this device.
                </p>
            </footer>
        </div>
    );
}
