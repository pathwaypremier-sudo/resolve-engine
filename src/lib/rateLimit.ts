/**
 * Rate Limiting Utilities
 * 
 * Provides rate limiting for API endpoints using persistence-backed counters.
 * No external dependencies.
 */

import { NextRequest, NextResponse } from "next/server";
import { persistence } from "@/lib/persistence/PersistenceAdapter";

type RateLimitResult =
    | { ok: true; ip: string; bucket: string; count: number }
    | { ok: false; ip: string; bucket: string; count: number };

type RateLimitRecord = {
    count: number;
    ip: string;
    bucket: string;
    updatedAtIso: string;
};

/**
 * Extract client IP from request headers.
 * Priority: x-forwarded-for (first IP) > x-real-ip > "unknown"
 */
function extractClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
        const first = forwarded.split(",")[0]?.trim();
        if (first) return first;
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
    return "unknown";
}

/**
 * Generic rate limit check.
 * @param req - NextRequest object
 * @param namespace - Key prefix for the rate limit bucket
 * @param limitPerMinute - Max requests per minute per IP
 */
function enforceRateLimit(
    req: NextRequest,
    namespace: string,
    limitPerMinute: number
): RateLimitResult {
    const ip = extractClientIp(req);
    const epochMinute = Math.floor(Date.now() / 60000);
    const bucket = `${epochMinute}`;
    const key = `re_rl_${namespace}_${ip}_${epochMinute}`;

    // Read existing count
    const existing = persistence.getJSON<RateLimitRecord>(key);
    const currentCount = existing?.count ?? 0;
    const nextCount = currentCount + 1;

    // Update count
    persistence.setJSON<RateLimitRecord>(key, {
        count: nextCount,
        ip,
        bucket,
        updatedAtIso: new Date().toISOString()
    });

    if (nextCount > limitPerMinute) {
        return { ok: false, ip, bucket, count: nextCount };
    }
    return { ok: true, ip, bucket, count: nextCount };
}

/**
 * Enforce rate limit for webhook requests.
 * Key: re_rl_webhook_${ip}_${epochMinute}
 * Limit: WEBHOOK_RL_PER_MINUTE env var or 60
 */
export function enforceWebhookRateLimit(req: NextRequest): RateLimitResult {
    const limit = parseInt(process.env.WEBHOOK_RL_PER_MINUTE || "60", 10);
    return enforceRateLimit(req, "webhook", limit);
}

/**
 * Enforce rate limit for pack download requests.
 * Limit: 10 per minute per IP (generous for legitimate use)
 */
export function enforcePackDownloadRateLimit(req: NextRequest): RateLimitResult {
    return enforceRateLimit(req, "pack", 10);
}

/**
 * Enforce rate limit for validate requests.
 * Limit: 20 per minute per IP (validation is lighter than pack generation)
 */
export function enforceValidateRateLimit(req: NextRequest): RateLimitResult {
    return enforceRateLimit(req, "validate", 20);
}

/**
 * Helper to return 429 rate limit response.
 */
export function rateLimitResponse(): NextResponse {
    return NextResponse.json(
        { ok: false, error: "too_many_requests" },
        { status: 429 }
    );
}
