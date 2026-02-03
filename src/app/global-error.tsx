"use client";

import CalmError from "@/components/ui/CalmError";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body className="bg-white antialiased">
                <main className="flex min-h-screen items-center justify-center">
                    <CalmError error={error} reset={reset} />
                </main>
            </body>
        </html>
    );
}
