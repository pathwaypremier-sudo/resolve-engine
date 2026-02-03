"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { LayoutGrid, PlusCircle, FileText, ClipboardCheck, Send, Scale, Menu, X, CreditCard } from "lucide-react";

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
    { label: "Overview", href: "/app", icon: <LayoutGrid className="h-4 w-4" /> },
    { label: "New case", href: "/app/new", icon: <PlusCircle className="h-4 w-4" /> },
    { label: "Intake", href: "/intake", icon: <FileText className="h-4 w-4" /> },
    { label: "Assessment", href: "/assessment", icon: <ClipboardCheck className="h-4 w-4" /> },
    { label: "Deliver", href: "/deliver", icon: <Send className="h-4 w-4" /> },
    { label: "Checkout", href: "/checkout", icon: <CreditCard className="h-4 w-4" /> },
];

interface AppShellProps {
    children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
    const pathname = usePathname();
    const params = useParams();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Close on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMobileMenuOpen(false);
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, []);

    const NavContent = () => (
        <>
            <div className="px-3 py-3 mb-4">
                <Link href="/app" className="block">
                    <span className="text-sm font-semibold tracking-tight text-zinc-900">
                        Resolve Engine
                    </span>
                    <span className="block text-xs text-zinc-400 mt-0.5">
                        Case workspace
                    </span>
                </Link>
            </div>

            <nav className="flex-1 space-y-1">
                {NAV_ITEMS.map((item) => {
                    // 1. Determine Case Context
                    const caseMatch = pathname.match(/^\/app\/case\/([^/]+)/);
                    const activeCaseId = caseMatch ? caseMatch[1] : null;

                    // 2. Disabled Logic
                    const isCaseBound = ["/intake", "/assessment", "/deliver", "/checkout"].includes(item.href);
                    const isDisabled = isCaseBound && !activeCaseId;

                    // 3. Active Logic
                    const isActive = pathname === item.href ||
                        (item.href !== "/app" && pathname.startsWith(item.href));

                    // 4. Href Injection (Preserve existing behavior)
                    let href = item.href;
                    if (activeCaseId && ["/assessment", "/deliver", "/checkout"].includes(item.href)) {
                        href = `${item.href}?case=${activeCaseId}`;
                    }

                    if (isDisabled) {
                        return (
                            <div
                                key={item.href + item.label}
                                className="px-3 py-2 rounded-md select-none group"
                                aria-disabled="true"
                            >
                                <div className="flex items-center gap-3 text-zinc-400/40 cursor-not-allowed">
                                    <span className="text-zinc-400/40">{item.icon}</span>
                                    <span className="text-sm leading-6">{item.label}</span>
                                </div>
                                <div className="pl-7 mt-0.5">
                                    <p className="text-[10px] text-zinc-300 font-medium">Select a case</p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.href + item.label}
                            href={href}
                            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm leading-6 transition-colors ${isActive
                                ? "bg-zinc-100/60 text-zinc-900 font-medium border-l-2 border-zinc-400/30 -ml-0.5 pl-[calc(0.75rem+2px)]"
                                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/40"
                                }`}
                        >
                            <span className={isActive ? "text-zinc-600" : "text-zinc-400"}>
                                {item.icon}
                            </span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="pt-4 mt-4 border-t border-zinc-100">
                <Link
                    href="/legal"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                    <Scale className="h-3.5 w-3.5" />
                    Legal
                </Link>
            </div>
        </>
    );

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 flex">
            {/* Desktop Left Rail */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-zinc-200 bg-white p-4">
                <NavContent />
            </aside>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    {/* Panel */}
                    <aside
                        className="fixed inset-y-0 left-0 w-72 bg-white border-r border-zinc-200 p-4 shadow-xl flex flex-col"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Navigation menu"
                        data-testid="mobile-nav"
                    >
                        <div className="absolute top-4 right-4 z-10">
                            <button
                                onClick={() => setMobileMenuOpen(false)}
                                className="p-2 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-100"
                                aria-label="Close menu"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <NavContent />
                    </aside>
                </div>
            )}

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top Header (mobile) */}
                <header className="lg:hidden border-b border-zinc-200 bg-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
                    <Link href="/app" className="text-sm font-semibold tracking-tight text-zinc-900">
                        Resolve Engine
                    </Link>
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 -mr-2 text-zinc-500 hover:bg-zinc-100 rounded-md"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </button>
                </header>

                {/* Content Container */}
                <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                    <div className="mx-auto max-w-5xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
