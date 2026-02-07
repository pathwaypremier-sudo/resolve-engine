/**
 * Production Preflight Check
 * 
 * Validates the environment before starting the application in production.
 * Usage: npx tsx scripts/preflight.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const COLORS = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m",
    bold: "\x1b[1m"
};

function log(color: string, message: string) {
    console.log(`${color}${message}${COLORS.reset}`);
}

async function main() {
    console.log(`${COLORS.bold}🚀 Resolve Engine Production Preflight Check${COLORS.reset}`);
    console.log("-----------------------------------------");

    // 1. Load Environment
    const productionEnvPath = path.resolve(process.cwd(), ".env.production");
    if (fs.existsSync(productionEnvPath)) {
        log(COLORS.green, "✅ Found .env.production");
        dotenv.config({ path: productionEnvPath });
    } else {
        log(COLORS.yellow, "⚠️  No .env.production found (checking process.env)");
    }

    let hasErrors = false;

    // 2. Validate DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        log(COLORS.red, "❌ DATABASE_URL is missing");
        hasErrors = true;
    } else {
        try {
            const url = new URL(dbUrl);
            log(COLORS.green, `✅ DATABASE_URL is set (host: ${url.hostname})`);

            if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
                log(COLORS.yellow, `⚠️  Warning: Unexpected protocol '${url.protocol}' (expected postgresql:)`);
            }
        } catch {
            log(COLORS.red, "❌ DATABASE_URL is invalid URL format");
            hasErrors = true;
        }
    }

    // 3. Validate SESSION_SECRET
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) {
        log(COLORS.red, "❌ SESSION_SECRET is missing");
        hasErrors = true;
    } else if (sessionSecret.length < 32) {
        log(COLORS.red, `❌ SESSION_SECRET is too short (${sessionSecret.length} chars). Must be 32+ chars.`);
        hasErrors = true;
    } else {
        log(COLORS.green, "✅ SESSION_SECRET is valid");
    }

    // 4. Validate Webhook Secret (Conditional)
    const webhookEnabled = process.env.WEBHOOK_ENABLED === "1" || process.env.WEBHOOK_ENABLED === "true";
    if (webhookEnabled) {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            log(COLORS.red, "❌ WEBHOOK_ENABLED is on, but STRIPE_WEBHOOK_SECRET is missing");
            hasErrors = true;
        } else if (!webhookSecret.startsWith("whsec_")) {
            log(COLORS.yellow, "⚠️  STRIPE_WEBHOOK_SECRET should usually start with 'whsec_'");
        } else {
            log(COLORS.green, "✅ STRIPE_WEBHOOK_SECRET is valid");
        }
    } else {
        log(COLORS.green, "ℹ️  Webhooks are disabled (WEBHOOK_ENABLED!=1)");
    }

    // 5. NotebookLM Status
    const notebookLmEnabled = process.env.NEXT_PUBLIC_NOTEBOOKLM_ENABLED === "true";
    log(COLORS.green, `ℹ️  NotebookLM is ${notebookLmEnabled ? "ENABLED" : "DISABLED"}`);

    // 6. Optional: APP_BASE_URL
    const appBaseUrl = process.env.APP_BASE_URL;
    if (appBaseUrl) {
        log(COLORS.green, `✅ APP_BASE_URL is set (${appBaseUrl})`);
    } else {
        log(COLORS.green, "ℹ️  APP_BASE_URL is not set (will auto-detect from request headers)");
    }

    console.log("-----------------------------------------");

    if (hasErrors) {
        log(COLORS.red, "🛑 Preflight check FAILED. Please fix the errors above.");
        process.exit(1);
    } else {
        log(COLORS.green, "✨ System is ready for lift-off!");
        process.exit(0);
    }
}

main().catch((err) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});
