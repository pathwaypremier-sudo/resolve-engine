"use client";

import { ReactNode, ButtonHTMLAttributes } from "react";

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md";
}

export default function ActionButton({
    children,
    variant = "primary",
    size = "md",
    disabled,
    className = "",
    ...props
}: ActionButtonProps) {
    const baseStyles =
        "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900";

    const sizeStyles = size === "sm" ? "px-3 py-1.5 text-sm rounded-lg" : "px-4 py-2 text-sm rounded-lg";

    const variantStyles = {
        primary: disabled
            ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
            : "bg-zinc-900 text-white hover:bg-zinc-800",
        secondary: disabled
            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200"
            : "bg-white text-zinc-900 border border-zinc-200 hover:bg-zinc-50",
        danger: disabled
            ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-red-700",
    };

    return (
        <button
            type="button"
            disabled={disabled}
            className={`${baseStyles} ${sizeStyles} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
