import { PublicShell } from "@/components/public/PublicShell";

export default function LegalPage() {
    return (
        <PublicShell>
            <div className="mx-auto max-w-2xl py-12">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                    Legal
                </h1>
                <div className="mt-6 space-y-6 text-base leading-7 text-zinc-700">
                    <p>
                        This application is a case management tool ("Resolve Engine"). It does not constitute legal advice.
                        Users are responsible for the accuracy of information submitted to issuers or courts.
                    </p>
                    <p>
                        <strong>Data Storage:</strong> Cases created in this build are stored locally on your device via LocalStorage.
                        Clearing your browser cache will remove your case data.
                    </p>
                    <p>
                        <strong>Service Tiers:</strong> "Appeal Builder", "Managed", and "Premium" are service definitions for
                        demonstration within this engine.
                    </p>
                </div>
            </div>
        </PublicShell>
    );
}
