/**
 * Server-Only Session Module
 * Implements signed HttpOnly session cookies for production security.
 * 
 * Token format (v1): base64url(payload) + "." + base64url(hmac)
 * Payload: { v: 1, actorId: string, iat: number }
 */

import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session";
const TOKEN_VERSION = 1;
const MAX_AGE_SECONDS = 31536000; // 1 year

/**
 * Base64url encode (URL-safe, no padding).
 */
function base64urlEncode(data: string | Buffer): string {
    const buf = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    return buf.toString("base64url");
}

/**
 * Base64url decode.
 */
function base64urlDecode(str: string): Buffer {
    return Buffer.from(str, "base64url");
}

/**
 * Get SESSION_SECRET from environment.
 * @throws in production if not set.
 */
function getSessionSecret(): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret && process.env.NODE_ENV === "production") {
        throw new Error("SESSION_SECRET is required in production");
    }
    // Dev fallback (not secure, but allows local testing)
    return secret || "dev-session-secret-not-secure";
}

/**
 * Generate a new actor ID with prefix.
 */
export function generateActorId(): string {
    return `actor_${randomUUID()}`;
}

/**
 * Session payload structure.
 */
type SessionPayload = {
    v: number;
    actorId: string;
    iat: number;
};

/**
 * Create a signed session token.
 */
export function createSessionToken(actorId: string): string {
    const secret = getSessionSecret();

    const payload: SessionPayload = {
        v: TOKEN_VERSION,
        actorId,
        iat: Math.floor(Date.now() / 1000)
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = base64urlEncode(payloadJson);

    const hmac = createHmac("sha256", secret)
        .update(payloadJson)
        .digest();
    const hmacB64 = base64urlEncode(hmac);

    return `${payloadB64}.${hmacB64}`;
}

/**
 * Verify a session token.
 * @returns { ok: true, actorId } if valid, { ok: false } if invalid.
 */
export function verifySessionToken(token: string): { ok: true; actorId: string } | { ok: false } {
    const secret = getSessionSecret();

    const parts = token.split(".");
    if (parts.length !== 2) {
        return { ok: false };
    }

    const [payloadB64, hmacB64] = parts;

    let payloadJson: string;
    let expectedHmac: Buffer;
    try {
        payloadJson = base64urlDecode(payloadB64).toString("utf-8");
        expectedHmac = base64urlDecode(hmacB64);
    } catch {
        return { ok: false };
    }

    // Compute expected HMAC
    const computedHmac = createHmac("sha256", secret)
        .update(payloadJson)
        .digest();

    // Timing-safe comparison
    if (expectedHmac.length !== computedHmac.length) {
        return { ok: false };
    }
    try {
        if (!timingSafeEqual(computedHmac, expectedHmac)) {
            return { ok: false };
        }
    } catch {
        return { ok: false };
    }

    // Parse and validate payload
    let payload: SessionPayload;
    try {
        payload = JSON.parse(payloadJson);
    } catch {
        return { ok: false };
    }

    if (payload.v !== TOKEN_VERSION || typeof payload.actorId !== "string") {
        return { ok: false };
    }

    return { ok: true, actorId: payload.actorId };
}

/**
 * Get actorId from request session cookie.
 * @returns actorId if valid cookie present, null otherwise.
 */
export function getActorIdFromRequest(req: NextRequest): string | null {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME);
    if (!cookie?.value) {
        return null;
    }

    const result = verifySessionToken(cookie.value);
    if (!result.ok) {
        return null;
    }

    return result.actorId;
}

/**
 * Require actorId from request.
 * In production: MUST come from valid session cookie.
 * In dev: falls back to x-actor-id header, then generates ephemeral.
 * 
 * @returns { actorId, source } or null if production and no valid cookie.
 */
export function getActorIdWithFallback(req: NextRequest): {
    actorId: string;
    source: "cookie" | "header" | "ephemeral";
} | null {
    // Try cookie first (always preferred)
    const cookieActorId = getActorIdFromRequest(req);
    if (cookieActorId) {
        return { actorId: cookieActorId, source: "cookie" };
    }

    // In production, cookie is required
    if (process.env.NODE_ENV === "production") {
        return null;
    }

    // Dev fallbacks
    const headerActorId = req.headers.get("x-actor-id");
    if (headerActorId && headerActorId.length > 0) {
        return { actorId: headerActorId, source: "header" };
    }

    // Generate ephemeral
    return { actorId: `actor_ephemeral_${randomUUID()}`, source: "ephemeral" };
}

/**
 * Create a Set-Cookie header value for the session.
 */
export function createSessionCookieHeader(token: string): string {
    const isProduction = process.env.NODE_ENV === "production";
    const secure = isProduction ? "; Secure" : "";

    return [
        `${SESSION_COOKIE_NAME}=${token}`,
        "HttpOnly",
        "SameSite=Lax",
        "Path=/",
        `Max-Age=${MAX_AGE_SECONDS}`,
        secure
    ].filter(Boolean).join("; ");
}

/**
 * Helper to return 401 unauthorized response.
 */
export function unauthorizedResponse(): NextResponse {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
}
