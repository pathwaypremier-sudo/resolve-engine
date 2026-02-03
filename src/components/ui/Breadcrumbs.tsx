"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-1 text-sm text-zinc-500">
                {items.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1">
                        {idx > 0 && <ChevronRight className="h-3 w-3 text-zinc-300" />}
                        {item.href ? (
                            <Link
                                href={item.href}
                                className="hover:text-zinc-900 transition-colors"
                            >
                                {item.label}
                            </Link>
                        ) : (
                            <span className="text-zinc-700 font-medium">{item.label}</span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}
