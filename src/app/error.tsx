"use client";

import CalmError from "@/components/ui/CalmError";

export default function AppError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return <CalmError error={error} reset={reset} />;
}
