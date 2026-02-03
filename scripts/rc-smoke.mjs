
import { execSync } from 'child_process';

console.log('🚗 STARTING MOTORING/PARKING V1 RC SMOKE TEST 🚗');
console.log('================================================');

const steps = [
    { name: 'Types (tsc)', command: 'npx tsc --noEmit' },
    { name: 'Copy Compliance', command: 'npm run check:copy' },
    { name: 'Trigger Regressions', command: 'npm run check:triggers' },
    { name: 'Vertical Containment', command: 'npm run check:verticals' }
];

let failed = false;

for (const step of steps) {
    process.stdout.write(`[...] Running ${step.name}... `);
    try {
        execSync(step.command, { stdio: 'pipe' }); // Pipe mainly to suppress verbose output unless error
        console.log('✅ PASS');
    } catch (e) {
        console.log('❌ FAIL');
        console.error(`\nError details for ${step.name}:`);
        console.error(e.stderr?.toString() || e.stdout?.toString() || e.message);
        failed = true;
        // Check triggers mismatch often exits 1, prints to stdout
    }
}

console.log('================================================');
if (failed) {
    console.error('💥 RC AUTOMATED CHECKS: FAILED');
    console.error('Please fix the errors above before certifying Release Candidate.');
    process.exit(1);
} else {
    console.log('🎉 RC AUTOMATED CHECKS: PASS');
    console.log('Ready for Manual Smoke Tests (See docs/RELEASE_CANDIDATE.md)');

    if (process.env.RC_E2E === "1") {
        console.log("[...] Running RC E2E (RC_E2E=1)...");
        const { execSync } = await import("node:child_process");
        execSync("npm run rc-e2e", { stdio: "inherit" });
        console.log("[...] RC E2E... ✅ PASS");
    } else {
        console.log("[...] RC E2E... (skip) RC_E2E not set");
    }

    process.exit(0);
}
