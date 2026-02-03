"use client";

import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";

export default function SignUpPage() {
    const router = useRouter();

    function handleSignUp() {
        // Mock auth logic - same as sign in for now
        document.cookie = "re_authed=1; path=/; max-age=86400";
        router.replace("/app");
    }

    return (
        <AuthShell
            title="Create account"
            subtitle="Account access is required before any case work can begin."
            footerLink={{
                text: "Already have an account?",
                label: "Sign in",
                href: "/signin",
            }}
        >
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    handleSignUp();
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
                    <label
                        htmlFor="password"
                        className="block text-sm font-medium leading-6 text-zinc-900"
                    >
                        Password
                    </label>
                    <div className="mt-2">
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            className="block w-full rounded-lg border-0 py-1.5 text-zinc-900 shadow-sm ring-1 ring-inset ring-zinc-300 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-zinc-900 sm:text-sm sm:leading-6"
                        />
                    </div>
                </div>

                <div>
                    <button
                        type="submit"
                        className="flex w-full justify-center rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
                    >
                        Create account
                    </button>
                </div>
            </form>
        </AuthShell>
    );
}
