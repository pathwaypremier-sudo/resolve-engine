import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Only protect /app routes
    if (!pathname.startsWith("/app")) {
        return NextResponse.next();
    }

    // Mock auth cookie (temporary until real auth)
    const authed = req.cookies.get("re_authed")?.value === "1";

    if (!authed) {
        if (process.env.NODE_ENV === "production") {
            const url = req.nextUrl.clone();
            url.pathname = "/signin";
            url.searchParams.set("next", pathname);
            return NextResponse.redirect(url);
        }
        return NextResponse.next();
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/app/:path*"],
};
