import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Deliverable Snapshot Test
 * Generates a deliverable for a fixed fixture input and validates structure
 * This test ensures AI changes don't break core deliverable generation
 */

const FIXTURE_CASE_DATA = {
  issuer: 'Private Parking',
  noticeType: 'Parking Charge',
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

test.describe('Deliverable Snapshot Test', () => {
  test('should generate deliverable with required sections for fixed fixture', async ({ page }) => {
    // Step 1: Navigate to app and create case with fixture data
    await page.goto('/');
    await page.getByRole('link', { name: /start a new case/i }).click();
    
    // Step 2: Fill intake with fixture data
    await expect(page).toHaveURL(/\/intake/);
    
    // Manual entry
    const manualEntryButton = page.getByRole('button', { name: /enter manually/i });
    if (await manualEntryButton.isVisible()) {
      await manualEntryButton.click();
    }
    
    // Select issuer
    await page.getByRole('button', { name: new RegExp(FIXTURE_CASE_DATA.issuer, 'i') }).click();
    
    // Select notice type
    await page.getByRole('button', { name: new RegExp(FIXTURE_CASE_DATA.noticeType, 'i') }).click();
    
    // Fill dates
    await page.getByLabel(/date of event/i).fill(FIXTURE_CASE_DATA.eventDate);
    await page.getByLabel(/date of issue/i).fill(FIXTURE_CASE_DATA.issueDate);
    
    // Fill VRM
    await page.getByLabel(/vehicle registration/i).fill(FIXTURE_CASE_DATA.vrm);
    
    // Continue to review
    await page.getByRole('button', { name: /continue/i }).click();
    
    // Step 3: Continue to assessment
    await page.getByRole('button', { name: /continue to assessment/i }).click();
    
    // Step 4: Navigate to deliver page
    await expect(page).toHaveURL(/\/app/);
    const deliverLink = page.getByRole('link', { name: /deliver/i });
    await expect(deliverLink).toBeVisible();
    await deliverLink.click();
    
    // Step 5: Wait for deliver page to load
    await expect(page).toHaveURL(/\/deliver/);
    await page.waitForLoadState('networkidle');
    
    // Step 6: Extract deliverable content
    const pageContent = await page.textContent('body');
    
    // Step 7: Assert required sections exist
    const missingSections: string[] = [];
    for (const section of REQUIRED_SECTIONS) {
      if (!pageContent?.includes(section)) {
        missingSections.push(section);
      }
    }
    
    // Step 8: Verify all required sections are present
    expect(missingSections, 
      `Missing required sections in deliverable: ${missingSections.join(', ')}`
    ).toHaveLength(0);
    
    // Step 9: Save snapshot for comparison (optional)
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
    
    // Step 10: Verify deliverable has substantial content
    expect(pageContent?.length || 0, 'Deliverable content is too short').toBeGreaterThan(500);
  });
  
  test('should detect changes in deliverable structure', async ({ page }) => {
    // This test compares current deliverable structure with saved snapshot
    const snapshotPath = path.join(process.cwd(), 'e2e', 'snapshots', 'deliverable-structure.txt');
    
    if (!fs.existsSync(snapshotPath)) {
      test.skip();
      return;
    }
    
    // Generate new deliverable
    await page.goto('/');
    await page.getByRole('link', { name: /start a new case/i }).click();
    
    // Fill with same fixture data
    await expect(page).toHaveURL(/\/intake/);
    const manualEntryButton = page.getByRole('button', { name: /enter manually/i });
    if (await manualEntryButton.isVisible()) {
      await manualEntryButton.click();
    }
    
    await page.getByRole('button', { name: new RegExp(FIXTURE_CASE_DATA.issuer, 'i') }).click();
    await page.getByRole('button', { name: new RegExp(FIXTURE_CASE_DATA.noticeType, 'i') }).click();
    await page.getByLabel(/date of event/i).fill(FIXTURE_CASE_DATA.eventDate);
    await page.getByLabel(/date of issue/i).fill(FIXTURE_CASE_DATA.issueDate);
    await page.getByLabel(/vehicle registration/i).fill(FIXTURE_CASE_DATA.vrm);
    await page.getByRole('button', { name: /continue/i }).click();
    await page.getByRole('button', { name: /continue to assessment/i }).click();
    
    const deliverLink = page.getByRole('link', { name: /deliver/i });
    await deliverLink.click();
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
