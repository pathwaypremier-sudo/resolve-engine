/**
 * Storage Smoke Test
 * 
 * Verifies that the storage persistence layer is working correctly.
 * Writes a file, reads it back, checks content, and cleans up.
 * 
 * Usage: npx tsx scripts/storage-smoke-test.ts
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { getStorageProvider } from "@/lib/storage";

// Load environment for DB access (required by case events)
dotenv.config({ path: ".env.production" });
if (!process.env.DATABASE_URL) {
    // Fallback to local .env if production not found
    dotenv.config();
}

const COLORS = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    reset: "\x1b[0m"
};

function log(color: string, message: string) {
    console.log(`${color}${message}${COLORS.reset}`);
}

async function main() {
    console.log("📦 Storage Persistence Smoke Test");
    console.log("--------------------------------");

    // 1. Initialize Provider
    const provider = getStorageProvider();
    log(COLORS.yellow, "Using provider: LocalStorageProvider");

    // 2. Define Test Artifact
    const testCaseId = "smoke-test-case";
    const testFileId = `smoke-test-${Date.now()}.txt`;
    const testContent = `Persistence verification check: ${new Date().toISOString()}`;
    const testBuffer = Buffer.from(testContent, "utf-8");

    try {
        // 3. Write File
        console.log(`Writing test file: ${testFileId}...`);

        // Ensure testCaseId exists in DB? 
        // LocalStorageProvider writes events. If DB foreign key constraints exist on Case, this might fail.
        // However, appendCaseEvent usually just inserts into Event table which refers to Case?
        // Let's assume for smoke test we might need a case, or maybe not if we can mock or if events are loose.
        // Actually, let's just try running it. If it fails on FK, we know we need a case.
        // But `LocalStorageProvider` just calls `appendCaseEvent`.

        const { uri } = await provider.put(testCaseId, testFileId, testBuffer, {
            mime: "text/plain",
            filename: testFileId
        });
        log(COLORS.green, `✅ Write successful (URI: ${uri})`);

        // 4. Verify File Exists on Disk (White-box check)
        const expectedPath = path.join(process.cwd(), ".re_storage", "case", testCaseId, testFileId);
        if (fs.existsSync(expectedPath)) {
            log(COLORS.green, `✅ File exists on disk: ${expectedPath}`);
        } else {
            throw new Error(`File not found at expected path: ${expectedPath}`);
        }

        // 5. Read File Back
        console.log("Reading file back...");
        const readBuffer = await provider.get(uri);
        const readContent = readBuffer.toString("utf-8");

        // 6. Verify Content
        if (readContent === testContent) {
            log(COLORS.green, "✅ Content verification passed");
        } else {
            throw new Error(`Content mismatch. Expected: "${testContent}", Got: "${readContent}"`);
        }

        // 7. Cleanup
        console.log("Cleaning up...");
        if (fs.existsSync(expectedPath)) {
            fs.unlinkSync(expectedPath);
            try {
                // Try to remove case dir if empty
                const caseDir = path.dirname(expectedPath);
                if (fs.readdirSync(caseDir).length === 0) {
                    fs.rmdirSync(caseDir);
                }
            } catch (e) { /* ignore */ }
            log(COLORS.green, "✅ Cleanup successful");
        }

        console.log("--------------------------------");
        log(COLORS.green, "✨ Storage persistence verified!");
        process.exit(0);

    } catch (err: any) {
        log(COLORS.red, "🛑 Test Failed:");
        console.error(err);

        // Hint for common errors
        if (err.code === "ECONNREFUSED") {
            console.log(COLORS.yellow, "Hint: Is the database running? Storage provider needs DB for audit events.");
        }

        process.exit(1);
    }
}

main();
