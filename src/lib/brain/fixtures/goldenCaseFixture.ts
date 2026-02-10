/**
 * Golden Case Fixture V1 Helper
 *
 * Provides a sanitised "golden path" test case for NotebookLM integration.
 * No OCR or parsing logic here — just file presence checks and content loading
 * for text files.
 * 
 * INTENDED FOR TESTS ONLY.
 */

import fs from "fs";
import path from "path";

export type GoldenCaseFixtureV1 = {
    notice_present: boolean;
    photos_present: boolean;
    id_present: boolean;
    circumstances_text: string;
};

const FIXTURE_DIR = path.resolve(process.cwd(), "fixtures/golden-case-fixture-v1");

/**
 * Loads the V1 golden case fixture from disk.
 * Returns presence flags for images and content for text files.
 */
export function loadGoldenCaseFixtureV1(): GoldenCaseFixtureV1 {
    if (!fs.existsSync(FIXTURE_DIR)) {
        throw new Error(`Fixture directory not found: ${FIXTURE_DIR}`);
    }

    const files = fs.readdirSync(FIXTURE_DIR);

    // Check for specific files (simplistic presence check)
    const notice_present = files.some(f => f.includes("pcn-notice"));
    const photos_present = files.some(f => f.includes("contravention-photo"));
    const id_present = files.some(f => f.includes("driving-licence"));

    // Read circumstances
    let circumstances_text = "";
    const circPath = path.join(FIXTURE_DIR, "circumstances.txt");
    if (fs.existsSync(circPath)) {
        circumstances_text = fs.readFileSync(circPath, "utf-8").replace(/^\uFEFF/, "").trim();
    }

    return {
        notice_present,
        photos_present,
        id_present,
        circumstances_text,
    };
}
