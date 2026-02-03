import React from "react";

interface PageScaffoldProps {
    title: string;
    subtitle?: string;
    rightRail?: React.ReactNode;
    children: React.ReactNode;
}

export default function PageScaffold({
    title,
    subtitle,
    rightRail,
    children,
}: PageScaffoldProps) {
    return (
        <div className="space-y-6">
            {/* Title Block */}
            <div>
                <h1 className="text-lg font-semibold leading-7 text-zinc-900 tracking-tight">{title}</h1>
                {subtitle && (
                    <p className="text-sm leading-6 text-zinc-500 mt-0.5">{subtitle}</p>
                )}
            </div>

            {/* Two-column layout on desktop */}
            <div className="flex flex-col lg:flex-row lg:gap-8">
                {/* Main Content */}
                <div className="flex-1 min-w-0 space-y-6">
                    {children}
                </div>

                {/* Right Rail (optional) */}
                {rightRail && (
                    <aside className="hidden lg:block w-72 flex-shrink-0">
                        <div className="sticky top-6 space-y-4">
                            {rightRail}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
