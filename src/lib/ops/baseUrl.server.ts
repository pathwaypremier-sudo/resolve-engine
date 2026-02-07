/**
 * Base URL Helper (Server-Only)
 * 
 * Derives the application base URL for callbacks and links.
 * Priority:
 * 1. APP_BASE_URL environment variable (if set)
 * 2. Request host header (derived from incoming request)
 * 3. Fallback to localhost:3000 (dev only)
 */

import { NextRequest } from "next/server";

/**
 * Get base URL from request headers.
 * Uses X-Forwarded-Proto/Host for proxied requests, falls back to Host header.
 */
function deriveBaseUrlFromRequest(req: NextRequest): string {
    // Check for proxy headers first (common in Docker/nginx/Caddy setups)
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const forwardedHost = req.headers.get("x-forwarded-host");

    if (forwardedHost) {
        const proto = forwardedProto || "http";
        return `${proto}://${forwardedHost}`;
    }

    // Fall back to Host header
    const host = req.headers.get("host");
    if (host) {
        // Determine protocol: assume https in production, http otherwise
        const isSecure = req.headers.get("x-forwarded-proto") === "https"
            || process.env.NODE_ENV === "production";
        const proto = isSecure ? "https" : "http";
        return `${proto}://${host}`;
    }

    // Ultimate fallback (should not happen in normal requests)
    return "http://localhost:3000";
}

/**
 * Get the application base URL.
 * 
 * @param req - Optional NextRequest to derive URL from headers
 * @returns Base URL without trailing slash (e.g., "http://123.45.67.89" or "https://app.example.com")
 * 
 * Usage:
 * - With request: getBaseUrl(req) - best for route handlers
 * - Without request: getBaseUrl() - uses env or localhost fallback
 */
export function getBaseUrl(req?: NextRequest): string {
    // 1. Environment variable takes priority
    const envUrl = process.env.APP_BASE_URL;
    if (envUrl && envUrl.trim() !== "") {
        return envUrl.replace(/\/$/, ""); // Remove trailing slash
    }

    // 2. Derive from request headers if available
    if (req) {
        return deriveBaseUrlFromRequest(req);
    }

    // 3. Fallback for non-request contexts
    if (process.env.NODE_ENV === "production") {
        // In production without env or request, we can't reliably determine URL
        // This should be a configuration warning, but we'll try a safe default
        console.warn("[getBaseUrl] APP_BASE_URL not set in production, using request-derived URL is recommended");
    }

    return "http://localhost:3000";
}
