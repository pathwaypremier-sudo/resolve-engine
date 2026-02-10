"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";


function SignInContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const next = searchParams.get("next") || "/app";
    const reason = searchParams.get("reason");

    const getSubtitle = () => {
        if (reason === "save") {
            return "Create an account to save and submit your case. You can review everything first.";
        }
        return "Sign in is required to create and manage cases on this device.";
    };

    function handleSignIn() {
        // Mock auth logic - preserve existing behavior
        document.cookie = "re_authed=1; path=/; max-age=86400";
        router.replace(next);
    }

    return (
        <AuthShell
            title="Sign in"
            subtitle={getSubtitle()}
            footerLink={{
                text: "No account?",
                label: "Create an account",
                href: `/signup?next=${encodeURIComponent(next)}`,
            }}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSignIn();
                }}
                className="space-y-4"
            >
                <div>
                    <label
                        htmlFor="email"
                        className="block text-sm font-medium leading-6 text-zinc-900"
                    >
                        Email address
                    </label>
                    <div className="mt-2">
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="user@example.com"
                            className="block w-full rounded-lg border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                        />
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        className="flex w-full justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                        Continue
                    </button>
                </div>
            </form>
        </AuthShell>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-zinc-500">Loading auth...</div>}>
            <SignInContent />
        </Suspense>
    );
}


// Removing previous export default at the bottom if any

