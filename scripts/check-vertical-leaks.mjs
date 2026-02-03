
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 1. Load Registry to find HIDDEN verticals
const verticalsPath = path.join(ROOT, 'src', 'lib', 'verticals', 'verticals.ts');
const verticalsContent = fs.readFileSync(verticalsPath, 'utf8');

// Regex to find keys with visibility: "HIDDEN"
// Matches: "ID": { ... visibility: "HIDDEN"
// We'll simplisticly look for the ID strings that are declared, verify they are hidden.
// This is a heuristic parser.
const hiddenIds = [];
const lines = verticalsContent.split('\n');
let currentId = null;

for (const line of lines) {
    // Detect ID definition: "FLIGHT_DELAY": {
    const idMatch = line.match(/^\s*"([A-Z_]+)":\s*{/);
    if (idMatch) {
        currentId = idMatch[1];
    }
    // Detect visibility
    if (currentId && line.includes('visibility: "HIDDEN"')) {
        hiddenIds.push(currentId);
        currentId = null; // Reset
    }
    // Reset if block closes (rough check)
    if (line.includes('},')) {
        currentId = null;
    }
}

console.log('HIDDEN Verticals identified:', hiddenIds);

if (hiddenIds.length === 0) {
    console.log('No hidden verticals found. Skipping check.');
    process.exit(0);
}

// 2. Define Allowed Paths (Whitelisting)
const ALLOWED_PATHS = [
    'src/lib/verticals',
    'src/lib/reasoning',
    'scripts',
    'docs',
    '.git',
    'node_modules',
    'dist',
    '.next'
];

function isAllowed(filePath) {
    const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
    return ALLOWED_PATHS.some(prefix => relative.startsWith(prefix));
}

// 3. Scan for leaks
let foundLeaks = false;

function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next' || entry.name === 'dist') continue;
            scan(fullPath);
        } else {
            if (isAllowed(fullPath)) continue;

            // Only check source files
            if (!entry.name.match(/\.(ts|tsx|js|jsx)$/)) continue;

            const content = fs.readFileSync(fullPath, 'utf8');
            for (const id of hiddenIds) {
                // Check if the ID appears as a string literal
                if (content.includes(`"${id}"`) || content.includes(`'${id}'`)) {
                    console.error(`[LEAK] Hidden vertical "${id}" found in: ${path.relative(ROOT, fullPath)}`);
                    foundLeaks = true;
                }
            }
        }
    }
}

// Start scan from src
scan(path.join(ROOT, 'src'));

if (foundLeaks) {
    console.error('FAILURE: Hidden verticals referenced in unauthorized code.');
    process.exit(1);
} else {
    console.log('SUCCESS: No leaks detected.');
    process.exit(0);
}
