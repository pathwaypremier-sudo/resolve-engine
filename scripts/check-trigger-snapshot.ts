
import fs from 'fs';
import path from 'path';
import { runScenarios, type ScenarioResult } from './trigger-harness';

const SNAPSHOT_PATH = path.join(process.cwd(), 'src/lib/assessment/__snapshots__/triggerMatrix.snapshot.json');

function main() {
    console.log('Checking trigger matrix snapshot...');

    if (!fs.existsSync(SNAPSHOT_PATH)) {
        console.error(`Snapshot not found at: ${SNAPSHOT_PATH}`);
        console.error('Run "npm run snapshot:triggers:update" to generate it.');
        process.exit(1);
    }

    const currentResults = runScenarios();
    // Sort for stability
    currentResults.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));

    const snapshotContent = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    const snapshotResults = JSON.parse(snapshotContent) as ScenarioResult[];

    // Compare
    const currentJson = JSON.stringify(currentResults, null, 2);
    const snapshotJson = JSON.stringify(snapshotResults, null, 2);

    if (currentJson === snapshotJson) {
        console.log('PASSED: Trigger logic matches snapshot.');
        process.exit(0);
    } else {
        console.error('FAILED: Trigger snapshot changed.');
        console.error('If this change is intentional, run "npm run snapshot:triggers:update"');

        // Simple diff hint
        if (currentResults.length !== snapshotResults.length) {
            console.error(`Scenario count mismatch: Expected ${snapshotResults.length}, got ${currentResults.length}`);
        } else {
            currentResults.forEach((curr, idx) => {
                const prev = snapshotResults[idx];
                const currIds = curr.activeQuestionIds.join(',');
                const prevIds = prev.activeQuestionIds.join(',');
                if (currIds !== prevIds) {
                    console.error(`Diff in ${curr.scenarioId}:`);
                    console.error(`  Expected: ${prevIds}`);
                    console.error(`  Got:      ${currIds}`);
                }
            });
        }

        process.exit(1);
    }
}

main();
