
import fs from 'fs';
import path from 'path';
import { runScenarios } from './trigger-harness';

const SNAPSHOT_PATH = path.join(process.cwd(), 'src/lib/assessment/__snapshots__/triggerMatrix.snapshot.json');

function main() {
    console.log('Generating trigger matrix snapshot...');
    const results = runScenarios();

    // Sort scenarios by ID for stability
    results.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));

    const content = JSON.stringify(results, null, 2);
    fs.writeFileSync(SNAPSHOT_PATH, content, 'utf8');

    console.log(`Snapshot written to: ${SNAPSHOT_PATH}`);
}

main();
