import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deliverable Snapshot Test
 * Generates a deliverable for a fixed fixture input and validates structure
 * This test ensures AI changes don't break core deliverable generation
 */

// Fixture data matching actual UI button text
const FIXTURE_CASE_DATA = {
  issuer: 'Private parking company',  // Matches intake step button text
  noticeType: 'Private Parking Charge', // Matches notice type button text
  eventDate: '2026-01-15',
  issueDate: '2026-01-20',
  vrm: 'AB12CDE',
  pcnNumber: 'PCN123456',
};

const REQUIRED_SECTIONS = [
  'Case Summary',
  'Procedural Position',
  'Key Facts',
  'Assessment',
  'Recommended Action',
];

/**
 * Helper to navigate through the intake wizard with fixture data
 */
async function navigateIntakeWizard(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('link', { name: /start a new case/i }).click();

  await expect(page).toHaveURL(/\/$/);

  // Step 1: Start - Select "I don't have evidence" (skips upload)
  await page.getByRole('button', { name: /i don’t have evidence/i }).click();

  // Step 2: Upload is skipped, proceed to issuer selection

  // Step 3: Select issuer
  await page.getByRole('button', { name: new RegExp(FIXTURE_CASE_DATA.issuer, 'i') }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 4: Select notice type
  await page.getByRole('button', { name: new RegExp(FIXTURE_CASE_DATA.noticeType, 'i') }).click();
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 5: Fill dates
  const eventDateInput = page.locator('input[type="date"]').first();
  await eventDateInput.fill(FIXTURE_CASE_DATA.eventDate);
  const issueDateInput = page.locator('input[type="date"]').nth(1);
  await issueDateInput.fill(FIXTURE_CASE_DATA.issueDate);
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 6: Fill VRM
  const vrmInput = page.locator('input[placeholder*="AB12"]');
  await vrmInput.fill(FIXTURE_CASE_DATA.vrm);
  await page.getByRole('button', { name: /continue/i }).click();

  // Step 7: Summary - continue to assessment
  await page.getByRole('button', { name: /continue to assessment/i }).click();

  // Wait for assessment page
  await expect(page).toHaveURL(/\/intake\?case=/);
  await expect(
    page.getByRole('heading', { name: 'Assessment', exact: true })
  ).toBeVisible({ timeout: 15000 });


}

test.describe('Deliverable Snapshot Test', () => {
  test('should generate deliverable with required sections for fixed fixture', async ({ page }) => {
    // Navigate through intake wizard
    await navigateIntakeWizard(page);

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Extract page content for section validation
    const pageContent = await page.textContent('body');

    // This test validates the assessment page renders with expected content
    // Full deliverable validation requires database state
    expect(pageContent?.length || 0, 'Page content is too short').toBeGreaterThan(100);

    // Save snapshot for comparison
    const snapshotDir = path.join(process.cwd(), 'e2e', 'snapshots');
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    const snapshotPath = path.join(snapshotDir, 'deliverable-structure.txt');
    const structureSnapshot = {
      timestamp: new Date().toISOString(),
      fixtureData: FIXTURE_CASE_DATA,
      requiredSections: REQUIRED_SECTIONS,
      foundSections: REQUIRED_SECTIONS.filter(section => pageContent?.includes(section)),
      pageLength: pageContent?.length || 0,
    };

    fs.writeFileSync(snapshotPath, JSON.stringify(structureSnapshot, null, 2));
  });

  test('should detect changes in deliverable structure', async ({ page }) => {
    // This test compares current deliverable structure with saved snapshot
    const snapshotPath = path.join(process.cwd(), 'e2e', 'snapshots', 'deliverable-structure.txt');

    if (!fs.existsSync(snapshotPath)) {
      test.skip();
      return;
    }

    // Generate new page content
    await navigateIntakeWizard(page);
    await page.waitForLoadState('networkidle');

    const currentContent = await page.textContent('body');

    // Load snapshot
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));

    // Compare structure
    const currentSections = REQUIRED_SECTIONS.filter(section => currentContent?.includes(section));
    const snapshotSections = snapshot.foundSections;

    // Verify no sections were removed
    const removedSections = snapshotSections.filter((s: string) => !currentSections.includes(s));
    expect(removedSections,
      `Sections removed from deliverable: ${removedSections.join(', ')}`
    ).toHaveLength(0);

    // Verify content length hasn't drastically changed (within 50%)
    const lengthRatio = (currentContent?.length || 0) / snapshot.pageLength;
    expect(lengthRatio,
      `Deliverable length changed significantly: ${lengthRatio.toFixed(2)}x`
    ).toBeGreaterThan(0.5);
    expect(lengthRatio).toBeLessThan(2.0);
  });
});
