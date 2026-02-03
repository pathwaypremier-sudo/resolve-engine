import Link from "next/link";
import { PublicShell } from "@/components/public/PublicShell";
import { ArrowRight } from "lucide-react";

export default function Page() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-2xl py-12 sm:py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          Resolve Engine
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-600">
          A procedural case management system for contesting parking charges.
          Automated workflows for drafting, evidence gathering, and submission tracking.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/intake"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-600"
          >
            Start a new case
          </Link>
          <Link href="/signin" className="text-sm font-semibold leading-6 text-zinc-900 flex items-center gap-1">
            Sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-16 border-t border-zinc-200 pt-12">
          <ul className="grid gap-8 sm:grid-cols-3 text-sm text-left">
            <li className="space-y-2">
              <strong className="font-semibold text-zinc-900">Create a case</strong>
              <p className="text-zinc-600">
                Enter details from your notice. The system structures your data for legal relevance.
              </p>
            </li>
            <li className="space-y-2">
              <strong className="font-semibold text-zinc-900">Add evidence</strong>
              <p className="text-zinc-600">
                Upload photos and documents. We organize them into a case packet.
              </p>
            </li>
            <li className="space-y-2">
              <strong className="font-semibold text-zinc-900">Produce deliverables</strong>
              <p className="text-zinc-600">
                Generate appeal letters and track deadlines based on your specific case type.
              </p>
            </li>
          </ul>
        </div>
      </div>
    </PublicShell>
  );
}
