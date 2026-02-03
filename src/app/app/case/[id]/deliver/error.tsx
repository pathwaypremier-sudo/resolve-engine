"use client";

import CalmError from "@/components/ui/CalmError";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DeliverError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const params = useParams();
    const caseId = params?.id as string;

    return (
        <div className="flex flex-col items-center">
            <CalmError error={error} reset={reset} />
            {caseId && (
                <div className="mt-4 flex gap-4 text-sm">
                    <Link href={`/app/case/${caseId}/assessment`} className="text-zinc-600 hover:text-zinc-900 underline">
                        Return to Assessment
                    </Link>
                    <Link href={`/app/case/${caseId}`} className="text-zinc-600 hover:text-zinc-900 underline">
                        Return to Case Dashboard
                    </Link>
                </div>
            )}
        </div>
    );
}
