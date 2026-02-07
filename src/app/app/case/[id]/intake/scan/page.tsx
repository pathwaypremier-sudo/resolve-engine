"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCase } from "../../../_context/CaseContext";

/**
 * DEPRECATED: This scan page has been consolidated into the docs page.
 * All smart OCR extraction functionality is now available at /intake/docs.
 * This page redirects to maintain backward compatibility.
 */
export default function ScanIntakePage() {
    const router = useRouter();
    const { id: caseId } = useCase();

    useEffect(() => {
        // Redirect to the consolidated docs page
        router.replace(`/app/case/${caseId}/intake/docs`);
    }, [router, caseId]);

    return (
        <div className="flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-zinc-500">Redirecting to document upload...</p>
        </div>
    );
}
