import { readdirSync, readFileSync, statSync } from 'fs';
import { join, extname } from 'path';

// Governance: Copy Compliance
// Banned phrases that imply advice/outcome promises
const BANNED = [
    'recommend',
    'recommended',
    'should',
    'best practice',
    'tips',
    'increase your chances'
];

const TARGET_DIRS = [
    'src/app',
    'src/components'
];

const EXTENSIONS = ['.tsx', '.ts'];

let hasError = false;

function scanFile(filePath) {
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        const lower = line.toLowerCase();

        // Simple exclusion for comments could be added here if needed,
        // but for now strict mode is better.

        BANNED.forEach(phrase => {
            // Basic check: phrase exists and isn't part of a larger harmless word?
            // Actually "recommend" is part of "recommendation", which is also likely advisory.
            // So comprehensive match is fine.

            if (lower.includes(phrase)) {
                console.error(`[COPY_VIOLATION] Found "${phrase}" in ${filePath}:${index + 1}`);
                console.error(`   > ${line.trim()}`);
                hasError = true;
            }
        });
    });
}

function walk(dir) {
    const files = readdirSync(dir);
    for (const file of files) {
        const path = join(dir, file);
        const stat = statSync(path);
        if (stat.isDirectory()) {
            walk(path);
        } else if (EXTENSIONS.includes(extname(path))) {
            scanFile(path);
        }
    }
}

console.log('Starting Copy Compliance Check...');
console.log(`Banned phrases: ${BANNED.join(', ')}`);

TARGET_DIRS.forEach(dir => {
    try {
        walk(dir);
    } catch (e) {
        if (e.code === 'ENOENT') {
            console.warn(`Skipping missing directory: ${dir}`);
        } else {
            throw e;
        }
    }
});

if (hasError) {
    console.error('\nFAILED: Compliance violations found. Remove advisory language.');
    process.exit(1);
} else {
    console.log('\nPASSED: No copy violations found.');
    process.exit(0);
}
